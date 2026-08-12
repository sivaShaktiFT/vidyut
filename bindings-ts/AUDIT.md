# `bindings-ts` audit

Audit date: 2026-08-12

## Production readiness

The published package is covered by a production Next.js deployment test: it is packed, installed
into a temporary Next.js application, built, served, and exercised in Chromium. The supported
browser path uses `@siva-sh/vidyut/browser` from a Client Component; Node.js support is ESM-only.
The findings below are follow-up hardening work, not blockers for these documented runtime paths.

## Scope and method

Reviewed the Rust/WASM boundary, generated-package assembly, conditional exports, declarations,
documentation, and release tests. I rebuilt the package and exercised the Node and browser loaders,
including a packed-package production deployment in Next.js. This is a current-state audit:
findings that were fixed before this review are not repeated.

## Findings

| # | Severity | Finding | Evidence and impact | Recommended remediation |
| --- | --- | --- | --- | --- |
| 1 | Medium | `splitAt` exposes a nonstandard, off-by-one boundary convention. | The public API now documents that the argument is the index of the last character in the first segment, because it passes the value to `Splitter::split_at`, which constructs the first part with `input[..i + 1]`. This remains easy to misuse with DOM cursor offsets, where the natural boundary after the first character is `1` rather than `0`. | In the next breaking release, accept conventional boundary offsets in `0..=input.length`, translate internally as needed, and test the beginning/end boundaries. |
| 2 | Medium | Node support is ESM-only. | The generated manifest has `"type": "module"` and exports only `node/vidyut.mjs` for Node (`build.mjs:115-120`); there is no `require` condition or CommonJS wrapper. `require("@siva-sh/vidyut")` consequently fails with `ERR_REQUIRE_ESM`. The README now makes this requirement explicit. | Add and test a CommonJS `require` branch only if CommonJS users are in scope. |
| 3 | Medium | Published-package TypeScript resolution is not tested. | `test:types` typechecks relative `pkg/browser/vidyut.js` and `pkg/node/vidyut.mjs`, not an installed tarball (`package.json:7`; `tests/typecheck.ts`; `tests/node-typecheck.ts`). The packed runtime test contains no `tsc` invocation. This misses errors in `exports.types`, nested type conditions, package scope, and declaration-file inclusion. | In the packed temporary consumer, compile `.mts` (root Node) and browser TypeScript fixtures with NodeNext/Bundler resolution. Include positive imports and expected-error checks for the two entry points. |
| 4 | Low | The release browser binary includes a development-oriented panic hook by default. | `Cargo.toml:14-15` enables `console_error_panic_hook` in the default feature set, and the production build uses defaults. The crate's own comment says it is not good for deployed code size (`Cargo.toml:26-29`). The size budget permits the hook rather than proving the smallest production artifact. | Disable the hook for release/published builds, or make it an explicit development feature. Record a before/after size budget and preserve browser error reporting through normal JS error handling. |
| 5 | Low | Documentation and API tests do not enforce the documented initialization and input contracts together. | Browser calls before initialization fail deep inside generated glue, while the README only says callers must initialize first. Existing loader tests cover success/retry but not an actionable pre-init error. Invalid SLP1 ASCII input is now rejected and covered in the Node smoke test. | Consider facade-level ready-state errors (or document the raw wasm-bindgen error explicitly), and add browser + Node tests that cover pre-init calls and recovery after a failed initialization. |

## Verification performed

- Rebuilt the web and Node WASM packages and inspected the packed manifest, public loaders, and declarations.
- Ran the configured release test command. Browser coverage uses Playwright because this host has
  no chromedriver binary for `wasm-pack test --headless --chrome`. The build emitted pre-existing
  warnings in `vidyut-lipi` and `vidyut-prakriya`.
- Packed the package, installed it into a temporary Next.js 16.3 application, built and served that
  application in production mode, then verified its Client Component loaded the packed WASM exactly
  once while concurrent initialization, transliteration, and sandhi calls completed without errors.
- Confirmed from the generated Node package that invalid ASCII input such as `@` now rejects.
- Confirmed the ESM-only Node export shape from the generated `package.json`/`exports` configuration.
- Enforced the tested `wasm-pack 0.15.0` version before every package build.

## Priority order

Fix 1 first to make the text API's index contract reliable. Items 2–3 are package
integration hardening; items 4–5 improve payload size and developer experience.
