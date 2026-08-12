# `bindings-ts` architecture and release readiness

`bindings-ts` publishes `@siva-sh/vidyut`: a browser-first, ESM-only WebAssembly package for the
web-capable parts of Vidyut. This document is the package's single source of operational context
and release-readiness criteria.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/lib.rs` | Rust integration layer, input validation, result serialization, and public WASM exports. |
| `data/meters.json` | Checked-in vṛtta catalogue embedded in the WASM binary at build time. |
| `api.d.ts` | Hand-authored public TypeScript API; the build adds grammar enum unions derived from wasm-bindgen output. |
| `build.mjs` | Reproducible package assembly: builds WASM, enforces size budgets, creates the facade and declarations, and atomically promotes `pkg/`. |
| `tests/` | Type, loader, browser, package-consumer, Next.js production, and WASM regression tests. |
| `README.md` | Consumer-facing installation, runtime, framework, and API guidance. |
| `pkg/` | Generated publishable artifact; never edit it directly. |

The package combines these Vidyut crates:

| Rust crate | TypeScript surface | Browser data |
| --- | --- | --- |
| `vidyut-lipi` | `Scheme`, `detect`, `transliterate` | None |
| `vidyut-chandas` | `Chandas` | Embedded metre catalogue |
| `vidyut-sandhi` | `Sandhi` | Generated built-in rules |
| `vidyut-prakriya` | `Vyakarana` | None |

Results cross the WASM boundary as plain JavaScript objects. The generated wasm-bindgen module is
kept private behind a small facade; `api.d.ts` defines the supported contract rather than exposing
the generated internals.

## Public contract and design constraints

- The root and `@siva-sh/vidyut/browser` exports are the same browser loader. There is no CommonJS
  entry point or duplicate Node-specific WASM binary.
- Call `await init()` before using the API. Concurrent asynchronous calls share one promise and a
  failed initialization can be retried. `initSync({ module })` is only for already-loaded bytes or
  a compiled `WebAssembly.Module`, usually in a Worker.
- Node.js ESM callers can pass bytes from the `wasm-url` export to `init`; browser bundlers load the
  packaged asset by default.
- `Chandas`, `Sandhi`, and `Vyakarana` are WASM objects. Construct them after initialization and
  release them with `.free()` in `finally` blocks or framework cleanup.
- Sandhi, metre, and grammar inputs use SLP1. Validation reports the actual unsupported Unicode
  character. SLP1’s ASCII representation makes `splitAt` offsets safe DOM-style boundaries:
  `0` cannot produce a non-empty first segment, while `input.length` includes word-final analyses
  such as visarga reconstructions.
- `Chandas.classify` preserves the native catalogue’s first-match priority, including tied metre
  patterns. `classifyAll` and `findMeters` expose all matches.
- Grammar values are source-of-truth Rust enum names represented as TypeScript string unions.
  `PratipadikaArgs` is exactly one variant and `KrdantaArgs` requires exactly one of `krt` or
  `unadi`; untyped JavaScript is revalidated in Rust and failures are recoverable errors.
- `vidyut-cheda` and `vidyut-kosha` are intentionally excluded because their model and dictionary
  data require an explicit asynchronous, versioned data-source design.

## Build and publication

Run `npm run build` from this directory. It requires exactly `wasm-pack 0.15.0`, invokes
`wasm-pack build --target web --release`, limits the artifact to 1.2 MB raw and 450 KB gzip, and
only replaces `pkg/` after every generated file succeeds. The package includes the browser assets,
README, and MIT license; generated bindgen files remain package-private implementation details.

Use `npm run pack` to inspect an npm tarball locally. `npm run publish:npm` runs the full test suite
before publishing with public npm access.

## Release-readiness checklist

`npm test` is the release gate. It covers:

- building the production artifact and its size budget;
- strict TypeScript checks with browser and Node-oriented library settings;
- async and sync loader behavior, retry behavior, and initialization caching;
- real-browser smoke coverage with Playwright;
- packed-package runtime and declaration resolution;
- a packed Next.js production build and Chromium deployment smoke test;
- native and Node WASM tests, including grammar error recovery;
- regressions for tied metre priority, final-boundary sandhi analysis, invalid Unicode diagnostics,
  and chunk-limited reverse sandhi.

`wasm-pack test --headless --chrome` is an additional browser-target check when chromedriver is
available. Before publication, confirm `npm test` succeeds on the release commit and inspect
`npm pack --dry-run` if package contents or build tooling changed.
