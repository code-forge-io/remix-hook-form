# remix-hook-form

## 7.3.0

### Minor Changes

- a79961e: New options and fixes for `useRemixForm`:

  - New `defaultSubmitHandler` on the hook return. It is the handler that `useRemixForm` uses when `submitHandlers.onValid` is not set. Call it in a custom `onValid` to submit to the action in the default way. The form action, method and encType still apply (#148).
  - New `submitRawValues` option. When it is `true`, the default submit handler sends `getValues()` and not the resolver output, so transforms (for example a zod `.transform()`) do not run on the client and again on the server (#172).
  - New `resetOnSuccess` option. When it is `true`, the form is reset after a submission if the action returns no `errors` (#157).
  - The return types of `useRemixForm` and `useRemixFormContext` now come from `UseFormReturn`. Members that new react-hook-form versions add (for example `getErrors` and `resetDefaultValues`) are typed, and `<RemixFormProvider {...form}>` compiles again with react-hook-form 7.82 and later (#185). `UseRemixFormReturn["handleSubmit"]` now has only the event signature that the hook uses.
  - A form with an input named `action`, `method` or `enctype` now submits correctly (#139).
  - A router `basename` with a trailing slash (`/app/`) no longer makes the form action a relative path (#175).
  - An array or `FileList` with one file now parses back as an array on the server (#178).

## 7.2.1

### Patch Changes

- 984a482: Security fix for prototype pollution in form data parsing ([GHSA-4f47-p9hg-cxv7](https://github.com/code-forge-io/remix-hook-form/security/advisories/GHSA-4f47-p9hg-cxv7)). `generateFormData` (used by `parseFormData`, `getValidatedFormData`, `getFormDataFromSearchParams` and the middleware) now throws `Unsafe form data key` when a key has a `__proto__`, `constructor` or `prototype` part. It also reuses only own properties, so keys like `toString.call` no longer change built-in objects. If a form field is named `constructor` or `prototype`, rename it.

## 7.2.0

### Minor Changes

- 056c49a: Fix type errors with react-hook-form 7.75.0. `FormState` gained an `isReady` field and `UseFormReturn` gained `setValues` in 7.75; the wrapped `formState` now exposes `isReady` (preserving the lazy getter behavior) and `setValues` flows through the hook's return type. Resolves the "Property 'setValues'/'isReady' is missing" errors (#180).
