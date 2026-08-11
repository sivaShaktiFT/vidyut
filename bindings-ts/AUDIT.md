# Universal package audit

Audit date: 2026-08-11

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

| Finding | Resolution |
| --- | --- |
| The package was built only with `--target web`, making Node/server execution impossible. | The build now emits separate `web` and `nodejs` targets and selects them through `exports`. |
| `wasm-pack`'s generated `.gitignore` excluded both target folders despite the npm `files` list. | Packaging removes those generated ignore files before packing; the tarball now includes both loaders and WASM binaries. |
| The public initializer declaration used wasm-bindgen's deprecated positional input. | The declaration and README use the current `{ module_or_path }` options object. |
| The former README required a React client boundary. | It now documents Node, browser/bundler/worker, React SSR boundaries, and the common API. |

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
