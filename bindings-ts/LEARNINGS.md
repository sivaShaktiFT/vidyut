# TypeScript binding notes

## What was built

The previous directory was the unmodified `wasm-pack` template. It is now an integration crate
that exports a single WebAssembly API over Vidyut's standalone web-capable crates:

| Rust crate | TypeScript surface | Data needed in browser |
| --- | --- | --- |
| `vidyut-lipi` | `Scheme`, `detect`, `transliterate` | none |
| `vidyut-chandas` | `Chandas` | bundled vṛtta catalogue |
| `vidyut-sandhi` | `Sandhi` | built-in generated rules |
| `vidyut-prakriya` | `Vyakarana` | none |

The wrapper returns plain JavaScript objects for results rather than exposing Rust-owned objects.
That keeps the API easy to serialize, render, cache, and use in React state. The published package
exposes a curated JavaScript facade and a hand-authored declaration file.
This keeps legacy wasm-bindgen internals out of the public contract and makes method parameters
and return values type-check as the named interfaces.

## Important design choices

- Browser input for grammar, metre, and sandhi is SLP1. It is Vidyut's native format and every
  sound is one ASCII byte, so sandhi boundaries can safely use string indexes. User interfaces can
  transliterate at input and output boundaries.
- `Chandas` embeds Vidyut's vṛtta catalogue for immediate metre lookup. The checked-in JSON is a
  build-time input only: applications cannot supply, fetch, or configure another catalogue.
- `Sandhi` now exposes reverse analysis as well as joining. `splitAll` follows the native splitter:
  it stops at the first non-SLP1 character, so no candidate crosses whitespace or punctuation.
  Callers should use `isValid` and lexical context to rank candidates.
- `Vyakarana` retains Vidyut's mature object contract rather than duplicating its very large enum
  vocabulary in JavaScript. Grammar enum values are the source-of-truth Rust names as strings;
  numeric legacy WASM enums are deliberately not public API.
- Grammar input is validated at both boundaries. TypeScript models `upapada` as all-or-nothing and
  `PratipadikaArgs` as exactly one variant; Rust revalidates untyped JavaScript input. Conversion
  failures throw recoverable `Error`s, never panic, log-only, return a placeholder form, or reuse
  `[]` (which means a valid derivation produced no forms).
- The release profile is set at the workspace root, where Cargo actually applies it. Browser
  package builds optimize for size without release debug information or incremental artifacts.
- npm metadata and the packaged `LICENSE-MIT` now use the same MIT license.

## Scope boundary

`vidyut-cheda` and `vidyut-kosha` are data-backed. Their models and databases are too large and
deployment-specific to silently embed in a general web package. A future browser binding should
first define an explicit async data source (for example, URL/`ArrayBuffer` loading plus versioned
cache keys) before exposing either API. This avoids an API that appears usable but fails at runtime
without opaque local files.

## Verification status

The package is compiled as both `wasm-pack --target web` and `wasm-pack --target nodejs`.
Native tests cover transliteration, metre identification, and forward/reverse sandhi. WASM tests
cover the browser exports. The TypeScript contract includes positive inference checks and negative
`@ts-expect-error` cases for partial `upapada` and multi-variant `PratipadikaArgs`. Runtime
validation must additionally verify malformed grammar objects reject while a following valid call
still succeeds, and that `splitAll("ca iti")` never returns a cross-chunk split. The default web
artifact must be initialized with `await init()`. The README uses the explicit
`@siva-sh/vidyut/browser` entry for Next.js Client Components so a framework server build cannot
accidentally select the Node loader.

`tests/typecheck.ts` type-checks the generated declaration file with TypeScript. The release suite
also packs the package into a temporary Next.js application, production-builds it, and exercises it
in Chromium. `wasm-pack test --headless --chrome` remains available as an additional check on
targets that provide chromedriver, but is not required for publication.

## Next.js and WASM loading

- The package root has conditional exports for Node and browsers. Next.js builds both server and
  client graphs, so client-only documentation uses the explicit `@siva-sh/vidyut/browser` export.
  It keeps loader selection deterministic without asking consumers to import generated files.
- The browser loader's default `init()` is the performance default. It resolves the packaged WASM
  URL, uses `instantiateStreaming` when possible, and keeps the binary out of the JavaScript
  bundle. A shared promise prevents duplicate fetches and must reset after rejection so a temporary
  network failure remains retryable.
- wasm-bindgen generates `initSync`, but it can only instantiate bytes or an existing
  `WebAssembly.Module`; browsers cannot synchronously fetch a `.wasm` asset. The curated TypeScript
  declaration now exposes that API as `initSync({ module })` and the package exports `wasm-url` to
  obtain the bundler-managed asset URL.
- Synchronous compilation blocks the invoking thread. The binding is about 1 MB raw, so the sync
  API is an opt-in Worker tool for callers that have already loaded bytes, not a main-thread React
  startup shortcut. Do not base64-inline the binary merely to avoid `await`: it increases JS parse
  and decode work and loses streaming compilation.
- `Sandhi`, `Chandas`, and `Vyakarana` allocate WASM-side resources. Create them after initialization
  and free them in `finally` blocks or effect cleanup; never allocate them during a React render.

## Package build layout

`bindings-ts/build.mjs` is the package-level build entrypoint. It removes stale generated output,
builds the web and Node.js targets sequentially, enforces the WASM size budget, and prepares the
published metadata, declarations, and assets. Keeping this lifecycle in one file avoids a separate
`scripts/` directory while preserving deterministic builds and `npm run build` as the single public
command. It requires `wasm-pack 0.15.0` so generated glue remains compatible with the curated
facade and declarations.
