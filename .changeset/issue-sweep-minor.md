---
"remix-hook-form": minor
---

New options and fixes for `useRemixForm`:

- New `defaultSubmitHandler` on the hook return. It is the handler that `useRemixForm` uses when `submitHandlers.onValid` is not set. Call it in a custom `onValid` to submit to the action in the default way. The form action, method and encType still apply (#148).
- New `submitRawValues` option. When it is `true`, the default submit handler sends `getValues()` and not the resolver output, so transforms (for example a zod `.transform()`) do not run on the client and again on the server (#172).
- New `resetOnSuccess` option. When it is `true`, the form is reset after a submission if the action returns no `errors` (#157).
- The return types of `useRemixForm` and `useRemixFormContext` now come from `UseFormReturn`. Members that new react-hook-form versions add (for example `getErrors` and `resetDefaultValues`) are typed, and `<RemixFormProvider {...form}>` compiles again with react-hook-form 7.82 and later (#185). `UseRemixFormReturn["handleSubmit"]` now has only the event signature that the hook uses.
- A form with an input named `action`, `method` or `enctype` now submits correctly (#139).
- A router `basename` with a trailing slash (`/app/`) no longer makes the form action a relative path (#175).
- An array or `FileList` with one file now parses back as an array on the server (#178).
