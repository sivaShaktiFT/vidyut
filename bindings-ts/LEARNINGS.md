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
`typescript_custom_section` adds result and input interfaces to wasm-bindgen's generated `.d.ts`
file, which documents the JSON-like values passed across the boundary.

## Important design choices

- Browser input for grammar, metre, and sandhi is SLP1. It is Vidyut's native format and every
  sound is one ASCII byte, so sandhi boundaries can safely use string indexes. User interfaces can
  transliterate at input and output boundaries.
- A `Chandas` instance takes TSV instead of implicitly fetching `meters.tsv`. WASM cannot make
  assumptions about hosting or caching; applications can bundle, fetch, or subset data themselves.
- `Sandhi` now exposes reverse analysis as well as joining. `splitAll` intentionally returns all
  candidates; callers should use `isValid` and lexical context to rank them.
- `Vyakarana` retains Vidyut's mature object contract rather than duplicating its very large enum
  vocabulary in JavaScript. The typed declarations describe object shape; enum spellings remain
  the source-of-truth Rust names in `vidyut-prakriya/src/args.rs`.

## Scope boundary

`vidyut-cheda` and `vidyut-kosha` are data-backed. Their models and databases are too large and
deployment-specific to silently embed in a general web package. A future browser binding should
first define an explicit async data source (for example, URL/`ArrayBuffer` loading plus versioned
cache keys) before exposing either API. This avoids an API that appears usable but fails at runtime
without opaque local files.

## Verification status

The package has been compiled as both `wasm-pack --target web` and `wasm-pack --target bundler`.
Native tests cover transliteration, metre identification, and forward/reverse sandhi. A Node/WASM
smoke test exercises the generated module end to end: transliteration, scheme detection, metre
classification, sandhi joins/splits, a `Bhvadi` present-tense derivation, and invalid derivation
arguments. The latter now returns `[]` instead of panicking.

`tests/typecheck.ts` type-checks the generated declaration file with TypeScript. A full real-browser
run remains useful before a release: `wasm-pack test --headless --chrome`.
