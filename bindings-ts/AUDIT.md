# Universal package audit

Audit date: 2026-08-12

## Result

`@siva-sh/vidyut` now publishes a single, root-only API with conditional exports:

| Environment | Selected loader | Initialization |
| --- | --- | --- |
| Node.js | `node/vidyut.js` (`wasm-pack --target nodejs`) | synchronous, automatic |
| Browsers and bundlers | `browser/vidyut.js` (`wasm-pack --target web`) | `await init()` once |
| Workers | browser loader | `await init()`, optionally with `{ module_or_path }` |

The Node loader owns its WASM file and uses Node's native loader. The browser loader remains an
ES module with an asynchronous initializer. Both expose the same generated WASM API and the same
root TypeScript declaration file.

## Findings and resolutions

| Finding | Status / recommended remediation |
| --- | --- |
| The package was built only with `--target web`, making Node/server execution impossible. | The build now emits separate `web` and `nodejs` targets and selects them through `exports`. |
| `wasm-pack`'s generated `.gitignore` excluded both target folders despite the npm `files` list. | Packaging removes those generated ignore files before packing; the tarball now includes both loaders and WASM binaries. |
| The public initializer declaration used wasm-bindgen's deprecated positional input. | The declaration and README use the current `{ module_or_path }` options object. |
| The former README required a React client boundary. | It now documents Node, browser/bundler/worker, React SSR boundaries, and the common API. |
| Node API declarations are now conditional. | **Resolved.** Node and browser targets publish their own wasm-bindgen declarations, so Node does not claim browser-only initialization exports. |
| The browser initializer is package-owned. | **Resolved.** A wrapper shares in-flight initialization, permits retry after rejection, and ignores repeat initialization after success. |
| The declared API was hand-maintained. | **Resolved.** Declarations now originate in wasm-bindgen output; build-time refinement is limited to the custom JSON types emitted by `src/lib.rs`. |
| Browser runtime coverage was manual. | **Resolved.** `npm run test:browser` serves the smoke page in headless Chromium and fails on page or console errors. |
| Rust WASM tests were orphaned. | **Resolved.** `npm run test:wasm` runs the wasm-bindgen suite in Node, and CI additionally runs it in headless Chrome. |
| Published-package verification was manual. | **Resolved.** `npm run test:package` packs, installs into a temporary consumer, and exercises root, browser, and `wasm-url` exports. |
| Important public methods lacked smoke coverage. | **Resolved.** The Node smoke test covers detection, metre classification, sandhi rules and splitting, every `Vyakarana` derivation method, and representative result shapes. |
| Browser retry behavior was undocumented. | **Resolved.** The README defines retry semantics and the browser-loader smoke test verifies a failed attempt followed by a successful retry. |
| Package documentation omitted React lifecycle guidance. | **Resolved.** The npm README now contains the combined browser, React, and Next.js guidance; no separate framework guide is published. |

## Verification performed

- `npm run build` — builds both release WASM targets.
- Node smoke test — transliteration, sandhi, and word generation pass with the Node loader.
- Browser-loader smoke test — the browser ES-module loader initializes from explicit WASM bytes
  and transliterates successfully.
- Playwright browser smoke test — Firefox loaded `tests/web-smoke.html` over HTTP; its status
  reported success, `vidyut_bg.wasm` returned HTTP 200, and the console had no errors or warnings.
- `npm run test:types` — strict NodeNext TypeScript API check passes.
- `cargo fmt --check` and `cargo test -p bindings-ts` — pass (4 unit tests).
- `npm pack --dry-run --json` — verifies the publishable tarball contains both loaders and both
  WASM artefacts; a clean temporary install imported the package root successfully in Node.
- `git diff --check` — passes.

The workspace emits pre-existing warnings from `vidyut-lipi` and `vidyut-prakriya`; none originate
in `bindings-ts`.
