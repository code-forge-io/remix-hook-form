import { array, boolean, coerce, date, number, object, string } from "zod";
import {
  createFormData,
  generateFormData,
  getFormDataFromSearchParams,
  getValidatedFormData,
  isGet,
  parseFormData,
  validateFormData,
} from "./index";

import { zodResolver } from "@hookform/resolvers/zod";

describe("createFormData", () => {
  it("should create a FormData object with the provided data", () => {
    const data = {
      name: "John Doe",
      age: 30,
      bool: true,
      object: {
        test: "1",
        number: 2,
      },
      array: [1, 2, 3],
    };
    const formData = createFormData(data);

    expect(formData.get("name")).toEqual(JSON.stringify(data.name));
    expect(formData.get("age")).toEqual(data.age.toString());
    expect(formData.get("object")).toEqual(JSON.stringify(data.object));
    expect(formData.get("array")).toEqual(JSON.stringify(data.array));
    expect(formData.get("bool")).toEqual(data.bool.toString());
  });

  it("should create a FormData object with the provided data and remove undefined values", () => {
    const data = {
      name: "John Doe",
      age: 30,
      bool: true,
      b: undefined,
      a: null,
      object: {
        test: "1",
        number: 2,
      },
      array: [1, 2, 3],
    };
    const formData = createFormData(data);

    expect(formData.get("name")).toEqual(JSON.stringify(data.name));
    expect(formData.get("age")).toEqual(data.age.toString());
    expect(formData.get("object")).toEqual(JSON.stringify(data.object));
    expect(formData.get("array")).toEqual(JSON.stringify(data.array));
    expect(formData.get("bool")).toEqual(data.bool.toString());
    expect(formData.get("b")).toEqual(null);
    expect(formData.get("a")).toEqual("null");
  });

  it("should handle null data", () => {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    const formData = createFormData(null as any);
    expect(formData).toBeTruthy();
  });

  it("should handle undefined data", () => {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    const formData = createFormData(undefined as any);
    expect(formData).toBeTruthy();
  });

  it("should handle Date data", () => {
    const date = "2024-01-01T00:00:00.000Z";
    const formData = createFormData({ date: new Date(date) }, false);
    expect(formData.get("date")).toEqual(date);
  });
});

describe("parseFormData", () => {
  // Mock the Request and formData methods
  beforeAll(() => {
    global.Request = vi.fn();
    global.Request.prototype.formData = vi.fn();
  });

  // Reset the mocks after each test
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should parse the data from the request object", async () => {
    const data = {
      name: "John Doe",
      age: "30",
    };
    const request = new Request("http://localhost:3000");
    const requestFormDataSpy = vi.spyOn(request, "formData");
    requestFormDataSpy.mockResolvedValueOnce(createFormData(data));
    const parsedData = await parseFormData<typeof data>(request);
    expect(parsedData).toEqual(data);
  });

  it("should return an empty object if no formData exists", async () => {
    const request = new Request("http://localhost:3000");
    const requestFormDataSpy = vi.spyOn(request, "formData");
    requestFormDataSpy.mockResolvedValueOnce(createFormData({}));
    const parsedData = await parseFormData(request);
    expect(parsedData).toEqual({});
  });

  it("should return formData if NO js was used and formData was passed as is", async () => {
    const formData = new FormData();
    formData.append("name", "John Doe");
    formData.append("age", "30");
    formData.append("hobbies.0", "Reading");
    formData.append("hobbies.1", "Writing");
    formData.append("hobbies.2", "Coding");
    formData.append("other.skills.0", "testing");
    formData.append("other.skills.1", "testing");
    formData.append("other.something", "else");
    const request = new Request("http://localhost:3000");
    const requestFormDataSpy = vi.spyOn(request, "formData");
    requestFormDataSpy.mockResolvedValueOnce(formData);
    const parsedData = await parseFormData(request);
    expect(parsedData).toEqual({
      name: "John Doe",
      age: 30,
      hobbies: ["Reading", "Writing", "Coding"],
      other: {
        skills: ["testing", "testing"],
        something: "else",
      },
    });
  });

  it("should handle multiple file input", async () => {
    const request = new Request("http://localhost:3000");
    const requestFormDataSpy = vi.spyOn(request, "formData");
    const blob = new Blob(["Hello, world!"], { type: "text/plain" });
    const mockFormData = new FormData();
    mockFormData.append("files", blob);
    mockFormData.append("files", blob);
    requestFormDataSpy.mockResolvedValueOnce(mockFormData);
    const data = await parseFormData<{ files: Blob[] }>(request);
    expect(data.files).toBeTypeOf("object");
    expect(Array.isArray(data.files)).toBe(true);
    expect(data.files).toHaveLength(2);
    expect(data.files[0]).toBeInstanceOf(File);
    expect(data.files[1]).toBeInstanceOf(File);
  });

  it("should not throw an error when a file is passed in", async () => {
    const request = new Request("http://localhost:3000");
    const requestFormDataSpy = vi.spyOn(request, "formData");
    const blob = new Blob(["Hello, world!"], { type: "text/plain" });
    const mockFormData = new FormData();
    mockFormData.append("file", blob);
    requestFormDataSpy.mockResolvedValueOnce(mockFormData);
    const data = await parseFormData<{ file: Blob }>(request);
    expect(data.file).toBeTypeOf("object");
  });
});

describe("generateFormData", () => {
  it("should generate an output object for flat form data", () => {
    const formData = new FormData();
    formData.append("name", "John Doe");
    formData.append("email", "johndoe@example.com");

    const expectedOutput = {
      name: "John Doe",
      email: "johndoe@example.com",
    };

    expect(generateFormData(formData)).toEqual(expectedOutput);
  });

  it("should generate an output object for nested form data", () => {
    const formData = new FormData();
    formData.append("user.name.first", "John");
    formData.append("user.name.last", "Doe");
    formData.append("user.email", "johndoe@example.com");

    const expectedOutput = {
      user: {
        name: {
          first: "John",
          last: "Doe",
        },
        email: "johndoe@example.com",
      },
    };

    expect(generateFormData(formData)).toEqual(expectedOutput);
  });

  it("should generate an output object with arrays for integer indexes", () => {
    const formData = new FormData();
    formData.append("user.roles.0", "admin");
    formData.append("user.roles.1", "editor");
    formData.append("user.roles.2", "contributor");

    const expectedOutput = {
      user: {
        roles: ["admin", "editor", "contributor"],
      },
    };

    expect(generateFormData(formData)).toEqual(expectedOutput);
  });

  describe("prototype pollution", () => {
    afterEach(() => {
      // biome-ignore lint/suspicious/noExplicitAny: cleanup if a test pollutes
      delete (Object.prototype as any).polluted;
      // biome-ignore lint/suspicious/noExplicitAny: cleanup if a test pollutes
      delete (Object.prototype.toString as any).call;
    });

    it.each([
      "__proto__.polluted",
      "constructor.prototype.polluted",
      "a.__proto__.polluted",
      "__proto__",
      "__proto__[]",
      "a.constructor",
      "prototype[0]",
    ])("throws on unsafe key %s", (key) => {
      const params = new URLSearchParams([[key, '{"polluted":"yes"}']]);
      expect(() => generateFormData(params)).toThrow(/Unsafe form data key/);
      // biome-ignore lint/suspicious/noExplicitAny: checking the global prototype
      expect(({} as any).polluted).toBeUndefined();
    });

    it("rejects unsafe keys in a GET query string", async () => {
      // global.Request is mocked by the parseFormData tests above
      const request = {
        url: "http://localhost/?constructor.prototype.polluted=yes",
        method: "GET",
      } as Request;
      await expect(
        getValidatedFormData(request, async (values) => ({
          values,
          errors: {},
        })),
      ).rejects.toThrow(/Unsafe form data key/);
      // biome-ignore lint/suspicious/noExplicitAny: checking the global prototype
      expect(({} as any).polluted).toBeUndefined();
    });

    it("does not walk into inherited properties", () => {
      const params = new URLSearchParams(
        "toString.call=1&valueOf[]=2&hasOwnProperty=a&hasOwnProperty=b",
      );
      expect(generateFormData(params)).toEqual({
        toString: { call: 1 },
        valueOf: [2],
        hasOwnProperty: ["a", "b"],
      });
      expect(typeof Object.prototype.toString.call).toBe("function");
    });
  });
});

describe("isGet", () => {
  it("returns true if the request method is GET", () => {
    const request = { method: "GET" };
    expect(isGet(request)).toBe(true);
  });

  it("returns true if the request method is get", () => {
    const request = { method: "get" };
    expect(isGet(request)).toBe(true);
  });

  it("returns false if the request method is POST", () => {
    const request = { method: "POST" };
    expect(isGet(request)).toBe(false);
  });
});

describe("getFormDataFromSearchParams", () => {
  it("should return an empty FormData object when there are no search params", () => {
    const request = {
      url: "http://localhost:3000/",
    };

    const formData = getFormDataFromSearchParams(request);
    expect(formData).toStrictEqual({});
  });

  it("should return a FormData object with search params", () => {
    const request = {
      url: "http://localhost:3000/?name=John+Doe&email=johndoe@example.com",
    };

    const formData = getFormDataFromSearchParams(request);
    expect(formData).toStrictEqual({
      name: "John Doe",
      email: "johndoe@example.com",
    });
  });

  it("should return a FormData object with nested search params", () => {
    const request = {
      url: "http://localhost:3000/?user.name.first=John&user.name.last=Doe&user.email=johndoe@example.com",
    };

    const formData = getFormDataFromSearchParams(request);

    expect(formData).toStrictEqual({
      user: {
        name: {
          first: "John",
          last: "Doe",
        },
        email: "johndoe@example.com",
      },
    });
  });

  it("should convert array search params to FormData object with arrays", () => {
    const request = {
      url: "http://localhost:3000/?colors[]=red&colors[]=green&colors[]=blue&numbers[0]=1&numbers[1]=2&numbers[2]=3",
    };
    const formData = getFormDataFromSearchParams(request);

    expect(formData).toStrictEqual({
      colors: ["red", "green", "blue"],
      numbers: [1, 2, 3],
    });
  });
});

describe("validateFormData", () => {
  it("should return an error when parsing date object without coerce", async () => {
    const formData = createFormData({
      date: new Date(2024, 1, 1),
    });
    const returnData = await validateFormData(
      formData,
      zodResolver(object({ date: date() })),
    );
    expect(returnData.errors).toStrictEqual({
      date: {
        message: "Expected date, received string",
        type: "invalid_type",
        ref: undefined,
      },
    });
    expect(returnData.data).toStrictEqual(undefined);
  });

  it("should return an error when parsing date object with coerce", async () => {
    const formData = createFormData({
      date: new Date(2024, 1, 1),
    });
    const returnData = await validateFormData(
      formData,
      zodResolver(object({ date: coerce.date() })),
    );
    expect(returnData.errors).toStrictEqual({
      date: {
        message: "Invalid date",
        type: "invalid_date",
        ref: undefined,
      },
    });
    expect(returnData.data).toStrictEqual(undefined);
  });

  it("should return a correct value when formatting as object", async () => {
    const formData = createFormData(
      {
        date: new Date(2024, 1, 1),
      },
      false,
    );
    const returnData = await validateFormData(
      formData,
      zodResolver(object({ date: coerce.date() })),
    );
    expect(returnData.errors).toStrictEqual(undefined);
    expect(returnData.data).toStrictEqual({
      date: new Date(2024, 1, 1),
    });
  });

  it("should return an empty error object and valid data if there are no errors", async () => {
    const formData = {
      name: "John Doe",
      email: "email@email.com",
    };

    const returnData = await validateFormData(
      formData,
      zodResolver(object({ name: string(), email: string().email() })),
    );
    expect(returnData.errors).toStrictEqual(undefined);
    expect(returnData.data).toStrictEqual(formData);
  });

  it("should return an error object and no data if there are errors", async () => {
    const formData = {
      email: "email",
      name: "John Doe",
    };
    const returnData = await validateFormData(
      formData,
      zodResolver(object({ name: string(), email: string().email() })),
    );
    expect(returnData.errors).toStrictEqual({
      email: {
        message: "Invalid email",
        type: "invalid_string",
        ref: undefined,
      },
    });
    expect(returnData.data).toStrictEqual(undefined);
  });
});

describe("createFormData", () => {
  it("accepts a file array and maps it properly", async () => {
    const formData = createFormData({
      files: [new File(["test"], "test.txt"), new File(["test2"], "test2.txt")],
    });
    const files = formData.getAll("files");
    expect(files).toHaveLength(2);
    expect(files[0]).toBeInstanceOf(File);
    expect(files[1]).toBeInstanceOf(File);
  });

  it("accepts a blob array and maps it properly", async () => {
    const formData = createFormData({
      files: [
        new Blob(["test"], { type: "text/plain" }),
        new Blob(["test2"], { type: "text/plain" }),
      ],
    });
    const files = formData.getAll("files");
    expect(files).toHaveLength(2);
    expect(files[0]).toBeInstanceOf(Blob);
    expect(files[1]).toBeInstanceOf(Blob);
  });

  it("accepts a file and adds it properly to formData", async () => {
    const formData = createFormData({
      file: new File(["test"], "test.txt"),
    });
    const file = formData.get("file");
    expect(file).toBeInstanceOf(File);
  });

  it("accepts a blob and adds it properly to formData", async () => {
    const formData = createFormData({
      file: new Blob(["test"], { type: "text/plain" }),
    });
    const file = formData.get("file");
    expect(file).toBeInstanceOf(Blob);
  });

  it("doesn't mess up types when passed from frontend to backend", async () => {
    const formData = createFormData({
      name: "123",
      age: 30,
      hobbies: ["Reading", "Writing", "Coding"],
      boolean: true,
      numbers: [1, 2, 3],
      other: {
        skills: ["testing", "testing"],
        something: "else",
      },
    });
    const request = new Request("http://localhost:3000", { method: "POST" });
    const requestFormDataSpy = vi.spyOn(request, "formData");

    requestFormDataSpy.mockResolvedValueOnce(formData);
    const parsed = await parseFormData<typeof formData>(request);

    expect(parsed).toStrictEqual({
      name: "123",
      age: 30,
      hobbies: ["Reading", "Writing", "Coding"],
      boolean: true,
      numbers: [1, 2, 3],
      other: {
        skills: ["testing", "testing"],
        something: "else",
      },
    });
  });

  it("doesn't send undefined values to the backend but sends null values", async () => {
    const formData = createFormData({
      name: "123",
      age: 30,
      hobbies: ["Reading", "Writing", "Coding"],
      boolean: true,
      a: null,
      b: undefined,
      numbers: [1, 2, 3],
      other: {
        skills: ["testing", "testing"],
        something: "else",
      },
    });
    const request = new Request("http://localhost:3000", { method: "POST" });
    const requestFormDataSpy = vi.spyOn(request, "formData");

    requestFormDataSpy.mockResolvedValueOnce(formData);
    const parsed = await parseFormData<typeof formData>(request);

    expect(parsed).toStrictEqual({
      name: "123",
      age: 30,
      hobbies: ["Reading", "Writing", "Coding"],
      boolean: true,
      a: null,
      numbers: [1, 2, 3],
      other: {
        skills: ["testing", "testing"],
        something: "else",
      },
    });
  });
});

describe("getValidatedFormData", () => {
  it("gets valid form data from formData", async () => {
    const formData = {
      name: "John Doe",
      age: 30,
      hobbies: ["Reading", "Writing", "Coding"],
      boolean: true,
      numbers: [1, 2, 3],
      other: {
        skills: ["testing", "testing"],
        something: "else",
      },
    };
    const data = createFormData(formData);
    const schema = object({
      name: string(),
      age: number(),
      boolean: boolean(),
      numbers: array(number()),
      hobbies: array(string()),
      other: object({
        skills: array(string()),
        something: string(),
      }),
    });
    const validatedFormData = await getValidatedFormData(
      data,
      zodResolver(schema),
    );
    expect(validatedFormData).toStrictEqual({
      data: formData,
      receivedValues: formData,
      errors: undefined,
    });
  });

  it("gets valid form data from a GET request", async () => {
    const request = {
      method: "GET",
      url: "http://localhost:3000/?user.name=john&colors[]=red&colors[]=green&colors[]=blue&numbers[0]=1&numbers[1]=2&numbers[2]=3",
    };

    const schema = object({
      user: object({
        name: string(),
      }),
      colors: array(string()),
      numbers: array(number()),
    });
    const formData = await getValidatedFormData(
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      request as any,
      zodResolver(schema),
    );
    expect(formData).toStrictEqual({
      data: {
        user: {
          name: "john",
        },
        colors: ["red", "green", "blue"],
        numbers: [1, 2, 3],
      },
      receivedValues: {
        user: {
          name: "john",
        },
        colors: ["red", "green", "blue"],
        numbers: [1, 2, 3],
      },
      errors: undefined,
    });
  });

  it("gets valid form data from a POST request when it is js", async () => {
    const formData = {
      name: "John Doe",
      age: 30,
      hobbies: ["Reading", "Writing", "Coding"],
      boolean: true,
      numbers: [1, 2, 3],
      other: {
        skills: ["testing", "testing"],
        something: "else",
      },
    };
    const request = new Request("http://localhost:3000", { method: "POST" });
    const requestFormDataSpy = vi.spyOn(request, "formData");
    const data = createFormData(formData);
    requestFormDataSpy.mockResolvedValueOnce(data);

    const schema = object({
      name: string(),
      age: number(),
      boolean: boolean(),
      numbers: array(number()),
      hobbies: array(string()),
      other: object({
        skills: array(string()),
        something: string(),
      }),
    });
    const validatedFormData = await getValidatedFormData(
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      request as any,
      zodResolver(schema),
    );
    expect(validatedFormData).toStrictEqual({
      data: formData,
      receivedValues: formData,
      errors: undefined,
    });
  });

  it("gets valid form data from a POST request when it is no js", async () => {
    const formData = new FormData();
    formData.append("name", "John Doe");
    formData.append("age", "30");
    formData.append("hobbies.0", "Reading");
    formData.append("hobbies.1", "Writing");
    formData.append("hobbies.2", "Coding");
    formData.append("other.skills.0", "testing");
    formData.append("other.skills.1", "testing");
    formData.append("other.something", "else");
    const request = new Request("http://localhost:3000", { method: "POST" });
    const requestFormDataSpy = vi.spyOn(request, "formData");
    requestFormDataSpy.mockResolvedValueOnce(formData);

    const schema = object({
      name: string(),
      age: number(),
      hobbies: array(string()),
      other: object({
        skills: array(string()),
        something: string(),
      }),
    });
    const returnData = await getValidatedFormData(
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      request as any,
      zodResolver(schema),
    );
    expect(returnData).toStrictEqual({
      data: {
        name: "John Doe",
        age: 30,
        hobbies: ["Reading", "Writing", "Coding"],
        other: {
          skills: ["testing", "testing"],
          something: "else",
        },
      },
      receivedValues: {
        name: "John Doe",
        age: 30,
        hobbies: ["Reading", "Writing", "Coding"],
        other: {
          skills: ["testing", "testing"],
          something: "else",
        },
      },
      errors: undefined,
    });
  });
});
