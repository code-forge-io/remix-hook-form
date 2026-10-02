# remix-hook-form

## 7.2.1

### Patch Changes

- 984a482: Security fix for prototype pollution in form data parsing ([GHSA-4f47-p9hg-cxv7](https://github.com/code-forge-io/remix-hook-form/security/advisories/GHSA-4f47-p9hg-cxv7)). `generateFormData` (used by `parseFormData`, `getValidatedFormData`, `getFormDataFromSearchParams` and the middleware) now throws `Unsafe form data key` when a key has a `__proto__`, `constructor` or `prototype` part. It also reuses only own properties, so keys like `toString.call` no longer change built-in objects. If a form field is named `constructor` or `prototype`, rename it.

## 7.2.0

### Minor Changes

- 056c49a: Fix type errors with react-hook-form 7.75.0. `FormState` gained an `isReady` field and `UseFormReturn` gained `setValues` in 7.75; the wrapped `formState` now exposes `isReady` (preserving the lazy getter behavior) and `setValues` flows through the hook's return type. Resolves the "Property 'setValues'/'isReady' is missing" errors (#180).
