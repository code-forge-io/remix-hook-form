import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  waitFor,
} from "@testing-library/react";
import React from "react";
import type { Control, UseFormReturn } from "react-hook-form";
import { type Navigation, useFetcher } from "react-router";
import { RemixFormProvider, useRemixForm, useRemixFormContext } from "./index";

const submitMock = vi.fn();
const fetcherSubmitMock = vi.fn();

const useActionDataMock = vi.hoisted(() => vi.fn());

const useNavigationMock = vi.hoisted(() =>
  vi.fn<() => Pick<Navigation, "state" | "formData" | "json">>(() => ({
    state: "idle",
    formData: undefined,
    json: undefined,
  })),
);

const useHrefMock = vi.hoisted(() =>
  vi.fn<(to: string) => string | undefined>(() => "/"),
);

vi.mock("react-router", () => ({
  useSubmit: () => submitMock,
  useActionData: useActionDataMock,
  useFetcher: () => ({ submit: fetcherSubmitMock, data: {} }),
  useNavigation: useNavigationMock,
  useHref: useHrefMock,
}));

describe("useRemixForm", () => {
  it("should return all the same output that react-hook-form returns", () => {
    const { result } = renderHook(() => useRemixForm({}));
    expect(result.current.register).toBeInstanceOf(Function);
    expect(result.current.unregister).toBeInstanceOf(Function);
    expect(result.current.setValue).toBeInstanceOf(Function);
    expect(result.current.getValues).toBeInstanceOf(Function);
    expect(result.current.trigger).toBeInstanceOf(Function);
    expect(result.current.reset).toBeInstanceOf(Function);
    expect(result.current.clearErrors).toBeInstanceOf(Function);
    expect(result.current.setError).toBeInstanceOf(Function);
    expect(result.current.formState).toEqual({
      disabled: false,
      dirtyFields: {},
      isDirty: false,
      isSubmitSuccessful: false,
      isSubmitted: false,
      isSubmitting: false,
      isValid: false,
      isValidating: false,
      validatingFields: {},
      touchedFields: {},
      submitCount: 0,
      isLoading: false,
      errors: {},
      isReady: true,
    });
    expect(result.current.handleSubmit).toBeInstanceOf(Function);
  });

  it("should call onSubmit function when the form is valid", async () => {
    const onValid = vi.fn();
    const onInvalid = vi.fn();

    const { result } = renderHook(() =>
      useRemixForm({
        resolver: () => ({ values: {}, errors: {} }),
        submitHandlers: {
          onValid,
          onInvalid,
        },
      }),
    );

    act(() => {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      result.current.handleSubmit({} as any);
    });
    await waitFor(() => {
      expect(onValid).toHaveBeenCalled();
    });
  });

  it("should reset isSubmitSuccessful after submission if reset is called", async () => {
    const { result } = renderHook(() =>
      useRemixForm({
        resolver: () => ({ values: {}, errors: {} }),
      }),
    );

    act(() => {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      result.current.handleSubmit({} as any);
    });
    await waitFor(() => {
      expect(result.current.formState.isSubmitSuccessful).toBe(true);
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.formState.isSubmitSuccessful).toBe(false);
  });

  it("should submit the form data to the server when the form is valid", async () => {
    const { result } = renderHook(() =>
      useRemixForm({
        resolver: () => ({ values: {}, errors: {} }),
        submitConfig: {
          action: "/submit",
        },
      }),
    );

    act(() => {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      result.current.handleSubmit({} as any);
    });
    await waitFor(() => {
      expect(submitMock).toHaveBeenCalledWith(expect.any(FormData), {
        method: "post",
        action: "/submit",
      });
    });
  });

  it("should submit the form data to the server using a fetcher when the form is valid", async () => {
    const {
      result: { current: fetcher },
    } = renderHook(() => useFetcher());
    const { result } = renderHook(() =>
      useRemixForm({
        fetcher,
        resolver: () => ({ values: {}, errors: {} }),
        submitConfig: {
          action: "/submit",
        },
      }),
    );

    act(() => {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      result.current.handleSubmit({} as any);
    });
    await waitFor(() => {
      expect(fetcherSubmitMock).toHaveBeenCalledWith(expect.any(FormData), {
        method: "post",
        action: "/submit",
      });
    });
  });

  it("should remove origin and basename from the action", async () => {
    submitMock.mockReset();
    useHrefMock.mockImplementation((to) => {
      if (to === "/") {
        return "/my-basename";
      }
    });
    vi.spyOn(window, "location", "get").mockReturnValueOnce({
      origin: "http://example.com",
    } as any);

    const { result } = renderHook(() =>
      useRemixForm({
        resolver: () => ({ values: {}, errors: {} }),
      }),
    );

    act(() => {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      result.current.handleSubmit({
        currentTarget: {
          action: "http://example.com/my-basename/basename-test-submit",
        },
      } as any);
    });
    await waitFor(() => {
      expect(submitMock).toHaveBeenCalledWith(expect.any(FormData), {
        method: "post",
        action: "/basename-test-submit",
      });
    });
  });

  it("should not re-render on validation if isValidating is not being accessed", async () => {
    const renderHookWithCount = () => {
      let count = 0;
      const renderCount = () => count;
      const result = renderHook(() => {
        count++;
        return useRemixForm({
          mode: "onChange",
          resolver: () => ({
            values: {
              name: "",
            },
            errors: {},
          }),
        });
      });
      return { renderCount, ...result };
    };

    const { result, renderCount } = renderHookWithCount();

    await act(async () => {
      result.current.setValue("name", "John", { shouldValidate: true });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      result.current.setValue("name", "Bob", { shouldValidate: true });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // react-hook-form >= 7.75 emits an extra formState notification per
    // validation cycle (two cycles here), so the baseline render count is 3.
    // The optimization still holds: this stays below the subscribed case below.
    expect(renderCount()).toBe(3);
  });

  it("should re-render on validation if isValidating is being accessed", async () => {
    const renderHookWithCount = () => {
      let count = 0;
      const renderCount = () => count;
      const result = renderHook(() => {
        count++;
        return useRemixForm({
          mode: "onChange",
          resolver: () => ({
            values: {
              name: "",
            },
            errors: {},
          }),
        });
      });
      return { renderCount, ...result };
    };

    const { result, renderCount } = renderHookWithCount();

    // Accessing isValidating
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const isValidating = result.current.formState.isValidating;

    await act(async () => {
      result.current.setValue("name", "John", { shouldValidate: true });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      result.current.setValue("name", "Bob", { shouldValidate: true });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Accessing isValidating subscribes to it, so each validation cycle
    // re-renders — 2 more than the unsubscribed case above (3 -> 5 on
    // react-hook-form >= 7.75, which raised the baseline by 2).
    expect(renderCount()).toBe(5);
  });

  it("should not flash incorrect isSubmitting status", async () => {
    submitMock.mockReset();
    useNavigationMock.mockClear();

    const { result, rerender } = renderHook(() =>
      useRemixForm({
        resolver: () => ({ values: {}, errors: {} }),
        submitConfig: {
          action: "/submit",
        },
      }),
    );

    expect(result.current.formState.isSubmitting).toBe(false);

    act(() => {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      result.current.handleSubmit({} as any);
    });
    expect(result.current.formState.isSubmitting).toBe(true);

    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));

    expect(result.current.formState.isSubmitting).toBe(true);

    expect(submitMock).toHaveBeenCalledWith(expect.any(FormData), {
      method: "post",
      action: "/submit",
    });

    useNavigationMock.mockReturnValue({
      state: "submitting",
      formData: new FormData(),
      json: undefined,
    });
    rerender();

    expect(result.current.formState.isSubmitting).toBe(true);

    useNavigationMock.mockReturnValue({
      state: "idle",
      formData: undefined,
      json: undefined,
    });
    rerender();

    expect(result.current.formState.isSubmitting).toBe(false);
  });

  it("should reset isSubmitting when the form is submitted using encType: application/json", async () => {
    submitMock.mockReset();
    useNavigationMock.mockClear();

    const { result, rerender } = renderHook(() =>
      useRemixForm({
        resolver: () => ({ values: {}, errors: {} }),
        submitConfig: {
          action: "/submit",
          encType: "application/json",
        },
      }),
    );

    expect(result.current.formState.isSubmitting).toBe(false);

    act(() => {
      result.current.handleSubmit({} as any);
    });
    expect(result.current.formState.isSubmitting).toBe(true);

    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));

    expect(result.current.formState.isSubmitting).toBe(true);

    expect(submitMock).toHaveBeenCalledWith(
      {},
      {
        method: "post",
        action: "/submit",
        encType: "application/json",
      },
    );

    useNavigationMock.mockReturnValue({
      state: "submitting",
      formData: undefined,
      json: {},
    });
    rerender();

    expect(result.current.formState.isSubmitting).toBe(true);

    useNavigationMock.mockReturnValue({
      state: "idle",
      formData: undefined,
      json: undefined,
    });
    rerender();

    expect(result.current.formState.isSubmitting).toBe(false);
  });

  it("should return defaultValue from the register function", async () => {
    const { result, rerender } = renderHook(() =>
      useRemixForm({
        resolver: () => ({
          values: { name: "", address: { street: "" } },
          errors: {},
        }),
        defaultValues: {
          name: "Default name",
          address: {
            street: "Default street",
          },
        },
      }),
    );

    let nameFieldProps = result.current.register("name");
    let streetFieldProps = result.current.register("address.street");

    expect(nameFieldProps.defaultValue).toBe("Default name");
    expect(nameFieldProps.defaultChecked).toBe(undefined);
    expect(streetFieldProps.defaultValue).toBe("Default street");
    expect(streetFieldProps.defaultChecked).toBe(undefined);

    useActionDataMock.mockReturnValue({
      defaultValues: {
        name: "Updated name",
        address: {
          street: "Updated street",
        },
      },
      errors: { name: "Enter another name" },
    });

    rerender();

    nameFieldProps = result.current.register("name");
    streetFieldProps = result.current.register("address.street");

    expect(nameFieldProps.defaultValue).toBe("Updated name");
    expect(nameFieldProps.defaultChecked).toBe(undefined);
    expect(streetFieldProps.defaultValue).toBe("Updated street");
    expect(streetFieldProps.defaultChecked).toBe(undefined);
  });

  it("should return defaultChecked from the register function when a boolean", async () => {
    const { result, rerender } = renderHook(() =>
      useRemixForm({
        resolver: () => ({
          values: { name: "", address: { street: "" }, boolean: true },
          errors: {},
        }),
        defaultValues: {
          name: "Default name",
          boolean: true,
          address: {
            street: "Default street",
          },
        },
      }),
    );

    let booleanFieldProps = result.current.register("boolean");

    expect(booleanFieldProps.defaultChecked).toBe(true);
    expect(booleanFieldProps.defaultValue).toBe(undefined);

    useActionDataMock.mockReturnValue({
      defaultValues: {
        name: "Updated name",
        address: {
          street: "Updated street",
        },
        boolean: false,
      },
      errors: { name: "Enter another name" },
    });

    rerender();

    booleanFieldProps = result.current.register("boolean");
    expect(booleanFieldProps.defaultChecked).toBe(false);
    expect(booleanFieldProps.defaultValue).toBe(undefined);
  });

  it("types the return value with every react-hook-form member (#185, #116)", () => {
    type Values = { name: string };
    const { result } = renderHook(() => useRemixForm<Values>({}));
    // Fails to compile when the return type misses a member of UseFormReturn
    const members: Omit<
      UseFormReturn<Values>,
      "handleSubmit" | "reset" | "register"
    > = result.current;
    const control: Control<Values> = result.current.control;
    expect(members.getValues).toBeInstanceOf(Function);
    expect(control).toBe(result.current.control);
  });

  it("keeps the leading slash of the action when the basename ends with a slash (#175)", async () => {
    submitMock.mockReset();
    useActionDataMock.mockReturnValue(undefined);
    useHrefMock.mockImplementation(() => "/my-basename/");
    vi.spyOn(window, "location", "get").mockReturnValueOnce({
      origin: "http://example.com",
      // biome-ignore lint/suspicious/noExplicitAny: partial location mock
    } as any);

    const { result } = renderHook(() =>
      useRemixForm({
        resolver: () => ({ values: {}, errors: {} }),
      }),
    );

    act(() => {
      result.current.handleSubmit({
        currentTarget: {
          action: "http://example.com/my-basename/basename-test-submit",
        },
        // biome-ignore lint/suspicious/noExplicitAny: partial event mock
      } as any);
    });
    await waitFor(() => {
      expect(submitMock).toHaveBeenCalledWith(expect.any(FormData), {
        method: "post",
        action: "/basename-test-submit",
      });
    });
    useHrefMock.mockImplementation(() => "/");
  });

  it("submits when the form has inputs named action, method or enctype (#139)", async () => {
    submitMock.mockReset();
    useActionDataMock.mockReturnValue(undefined);
    const form = document.createElement("form");
    // In a browser, an input replaces the form property with the same name
    for (const name of ["action", "method", "enctype"]) {
      const input = document.createElement("input");
      input.name = name;
      form.appendChild(input);
      Object.defineProperty(form, name, { value: input });
    }
    // The HTMLFormElement getters still return the real values
    const getters = [
      vi
        .spyOn(HTMLFormElement.prototype, "action", "get")
        .mockReturnValue(`${window.location.origin}/submit`),
      vi
        .spyOn(HTMLFormElement.prototype, "method", "get")
        .mockReturnValue("post"),
      vi
        .spyOn(HTMLFormElement.prototype, "enctype", "get")
        .mockReturnValue("multipart/form-data"),
    ];

    const { result } = renderHook(() =>
      useRemixForm({
        resolver: () => ({ values: {}, errors: {} }),
      }),
    );

    act(() => {
      // biome-ignore lint/suspicious/noExplicitAny: partial event mock
      result.current.handleSubmit({ currentTarget: form } as any);
    });
    await waitFor(() => {
      expect(submitMock).toHaveBeenCalledWith(expect.any(FormData), {
        method: "post",
        action: "/submit",
        encType: "multipart/form-data",
      });
    });
    for (const getter of getters) getter.mockRestore();
  });

  it("lets clearErrors remove errors returned by the server (#12)", async () => {
    const serverData = {
      errors: {
        root: { message: "Server error" },
        name: { message: "Name is taken" },
      },
    };
    useActionDataMock.mockReturnValue(serverData);

    const { result, rerender } = renderHook(() =>
      useRemixForm<{ name: string }>({ defaultValues: { name: "" } }),
    );
    await waitFor(() => {
      expect(result.current.formState.errors.root?.message).toBe(
        "Server error",
      );
    });

    act(() => {
      result.current.clearErrors("root");
      result.current.clearErrors("name");
    });
    rerender();

    expect(result.current.formState.errors.root).toBeUndefined();
    expect(result.current.formState.errors.name).toBeUndefined();
    useActionDataMock.mockReturnValue(undefined);
  });

  it("exposes the default submit handler so onValid can wrap it (#148)", async () => {
    submitMock.mockReset();
    useActionDataMock.mockReturnValue(undefined);

    const { result } = renderHook(() => {
      const form = useRemixForm<{ name: string; extra?: string }>({
        resolver: () => ({ values: { name: "John" }, errors: {} }),
        submitHandlers: {
          onValid: (data) => {
            form.defaultSubmitHandler({ ...data, extra: "from onValid" });
          },
        },
      });
      return form;
    });

    act(() => {
      result.current.handleSubmit({
        currentTarget: {
          action: `${window.location.origin}/wrapped`,
          method: "post",
        },
        // biome-ignore lint/suspicious/noExplicitAny: partial event mock
      } as any);
    });
    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));

    const [formData, options] = submitMock.mock.calls[0];
    expect(formData.get("name")).toBe(JSON.stringify("John"));
    expect(formData.get("extra")).toBe(JSON.stringify("from onValid"));
    // The form action and method still apply without passing them through
    expect(options).toEqual({ method: "post", action: "/wrapped" });
  });

  it("submits the raw field values when submitRawValues is true (#172)", async () => {
    submitMock.mockReset();
    useActionDataMock.mockReturnValue(undefined);

    const { result } = renderHook(() =>
      // biome-ignore lint/suspicious/noExplicitAny: default context type
      useRemixForm<{ date: string }, any, { date: Date }>({
        defaultValues: { date: "2025-01-01" },
        resolver: (values) => ({
          values: { date: new Date(values.date) },
          errors: {},
        }),
        submitRawValues: true,
      }),
    );

    act(() => {
      // biome-ignore lint/suspicious/noExplicitAny: partial event mock
      result.current.handleSubmit({} as any);
    });
    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));

    expect(submitMock.mock.calls[0][0].get("date")).toBe(
      JSON.stringify("2025-01-01"),
    );
  });

  describe("resetOnSuccess (#157)", () => {
    const submitAndFinish = async (actionData: unknown) => {
      submitMock.mockReset();
      useActionDataMock.mockReturnValue(undefined);
      useNavigationMock.mockReturnValue({
        state: "idle",
        formData: undefined,
        json: undefined,
      });

      const hook = renderHook(() =>
        useRemixForm<{ name: string }>({
          defaultValues: { name: "default" },
          resolver: (values) => ({ values, errors: {} }),
          resetOnSuccess: true,
        }),
      );
      act(() => hook.result.current.setValue("name", "changed"));
      act(() => {
        // biome-ignore lint/suspicious/noExplicitAny: partial event mock
        hook.result.current.handleSubmit({} as any);
      });
      await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));

      useNavigationMock.mockReturnValue({
        state: "submitting",
        formData: new FormData(),
        json: undefined,
      });
      hook.rerender();
      expect(hook.result.current.getValues("name")).toBe("changed");

      useActionDataMock.mockReturnValue(actionData);
      useNavigationMock.mockReturnValue({
        state: "idle",
        formData: undefined,
        json: undefined,
      });
      hook.rerender();
      await act(async () => {});
      return hook;
    };

    it("resets the form when the action returns no errors", async () => {
      const { result } = await submitAndFinish({ ok: true });
      expect(result.current.getValues("name")).toBe("default");
      useActionDataMock.mockReturnValue(undefined);
    });

    it("keeps the values when the action returns errors", async () => {
      const { result } = await submitAndFinish({
        errors: { name: { message: "Name is taken" } },
      });
      expect(result.current.getValues("name")).toBe("changed");
      useActionDataMock.mockReturnValue(undefined);
    });
  });
});

afterEach(cleanup);

describe("RemixFormProvider", () => {
  it("should allow the user to submit via the useRemixForm handleSubmit using the context", () => {
    const { result } = renderHook(() =>
      useRemixForm({
        resolver: () => ({ values: {}, errors: {} }),
        submitConfig: {
          action: "/submit",
        },
      }),
    );
    const spy = vi.spyOn(result.current, "handleSubmit");

    const TestComponent = () => {
      const { handleSubmit } = useRemixFormContext();
      return <form onSubmit={handleSubmit} data-testid="test" />;
    };

    const { getByTestId } = render(
      <RemixFormProvider {...result.current}>
        <TestComponent />
      </RemixFormProvider>,
    );

    const form = getByTestId("test") as HTMLFormElement;
    fireEvent.submit(form);

    expect(spy).toHaveBeenCalled();
  });
});
