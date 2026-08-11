# TypeScript binding notes

## What was built

The previous directory was the unmodified `wasm-pack` template. It is now an integration crate
that exports a single WebAssembly API over Vidyut's standalone web-capable crates:

| Rust crate | TypeScript surface | Data needed in browser |
| --- | --- | --- |
| `vidyut-lipi` | `Scheme`, `detect`, `transliterate` | none |
| `vidyut-chandas` | `Chandas` | caller-provided metre TSV |
| `vidyut-sandhi` | `Sandhi` | built-in generated rules |
| `vidyut-prakriya` | `Vyakarana` | none |

The wrapper returns plain JavaScript objects for results rather than exposing Rust-owned objects.
That keeps the API easy to serialize, render, cache, and use in React state. A
The published package exposes a curated JavaScript facade and a hand-authored declaration file.
This keeps legacy wasm-bindgen internals out of the public contract and makes method parameters
and return values type-check as the named interfaces.

## Important design choices

- Browser input for grammar, metre, and sandhi is SLP1. It is Vidyut's native format and every
  sound is one ASCII byte, so sandhi boundaries can safely use string indexes. User interfaces can
  transliterate at input and output boundaries.
- A `Chandas` instance takes TSV instead of implicitly fetching `meters.tsv`. WASM cannot make
  assumptions about hosting or caching; applications can bundle, fetch, or subset data themselves.
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

The package is compiled as both `wasm-pack --target web` and `wasm-pack --target bundler`.
Native tests cover transliteration, metre identification, and forward/reverse sandhi. WASM tests
cover the browser exports. The TypeScript contract includes positive inference checks and negative
`@ts-expect-error` cases for partial `upapada` and multi-variant `PratipadikaArgs`. Runtime
validation must additionally verify malformed grammar objects reject while a following valid call
still succeeds, and that `splitAll("ca iti")` never returns a cross-chunk split. The default web
artifact must be initialized with `await init()`; the React guide uses the bundler artifact.

`tests/typecheck.ts` type-checks the generated declaration file with TypeScript. A full real-browser
run remains useful before a release: `wasm-pack test --headless --chrome`.
