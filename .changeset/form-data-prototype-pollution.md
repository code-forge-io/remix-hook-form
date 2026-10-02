---
"remix-hook-form": patch
---

Security fix for prototype pollution in form data parsing ([GHSA-4f47-p9hg-cxv7](https://github.com/code-forge-io/remix-hook-form/security/advisories/GHSA-4f47-p9hg-cxv7)). `generateFormData` (used by `parseFormData`, `getValidatedFormData`, `getFormDataFromSearchParams` and the middleware) now throws `Unsafe form data key` when a key has a `__proto__`, `constructor` or `prototype` part. It also reuses only own properties, so keys like `toString.call` no longer change built-in objects. If a form field is named `constructor` or `prototype`, rename it.
