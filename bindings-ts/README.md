# Vidyut for TypeScript

`bindings-ts` packages Vidyut's browser-safe Sanskrit tools as WebAssembly. It is intended for
web applications that need fast, local transliteration, metre classification, sandhi analysis, or
Pāṇinian word generation without a server round trip.

The generated package is ESM and works with modern browser bundlers such as Vite, Next.js, and
Webpack. It does not depend on Node.js at runtime.

## Capabilities

- `transliterate` and `detect`: convert between all scripts supported by `vidyut-lipi`, including
  Devanagari, IAST, SLP1, Harvard-Kyoto, and Indic scripts.
- `Chandas`: scan SLP1 verse and identify the best, or all, matching metres from your TSV
  catalogue.
- `Sandhi`: join words, inspect the complete generated rule table, and reverse sandhi at one or
  every SLP1 boundary.
- `Vyakarana`: generate dhātus, subantas, tiṅantas, kṛdantas, taddhitantas, and stryantas, with
  full derivation histories.

The native `cheda` and `kosha` crates require large external model/database files. They are not
included in this browser package because an application-specific data-loading and caching policy
is required; use the Rust or Python bindings for those data-backed capabilities.

## Build

Install Rust with the `wasm32-unknown-unknown` target and [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/):

```sh
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
cd bindings-ts
wasm-pack build --target web --out-name vidyut
```

This produces `bindings-ts/pkg/`, an npm-ready package. Run `npm pack` from that directory to
create a publishable tarball, or install it directly from a monorepo. `wasm-pack build --target
bundler --out-name vidyut` is the recommended build for React and other bundlers.

## Use in a web application

```ts
import {
  Chandas,
  Sandhi,
  Scheme,
  Vyakarana,
  detect,
  transliterate,
} from "bindings-ts";

const devanagari = transliterate("rAmaH gacCati", Scheme.Slp1, Scheme.Devanagari);
const scheme = detect("रामः गच्छति");

const chandas = new Chandas("vasantatilakA\tvrtta\tGGLGLLLGLLGLGG");
const metre = chandas.classify("mAtaH samastajagatAM maDukEwaBAreH");

const sandhi = new Sandhi();
const joined = sandhi.join("rAmaH", "gacCati");
const analyses = sandhi.splitAll("rAmogacCati").filter((split) => split.isValid);

const vyakarana = new Vyakarana();
const forms = vyakarana.deriveTinantas({
  dhatu: { aupadeshika: "BU", gana: "Bhvadi", prefixes: [], sanadi: [] },
  lakara: "Lat",
  prayoga: "Kartari",
  purusha: "Prathama",
  vacana: "Eka",
  skip_at_agama: false,
});
```

`bindings-ts` is the generated package name from this crate. Rename it in `pkg/package.json` (for
example to `@ambuda/vidyut`) before publishing if your namespace uses a different name.

All grammatical text passed to `Sandhi`, `Chandas`, and `Vyakarana` is SLP1. Convert user-facing
text with `transliterate` at the application boundary. SLP1 uses one ASCII byte per sound, which
also makes `Sandhi.splitAt` indexes unambiguous.

For a production React + TypeScript setup, including a server-side `vidyut-kosha` dictionary
bridge and a typed client contract, see [REACT.md](REACT.md).

## API notes

`Chandas` accepts a UTF-8 TSV with three columns: metre name, type, and a pattern made of `G`,
`L`, `/`, and `|`. `classify` returns the best result and `classifyAll` returns every match.

`Sandhi.splitAt(input, index)` returns possible analyses at an SLP1 byte/character index;
`splitAll` considers every boundary. Prefer the `isValid` flag to remove phonetically implausible
analyses. `rules()` exposes the exact generated table for UI inspection or custom ranking.

`Vyakarana` receives plain objects matching Vidyut's existing web API. Its result is an array of
`Prakriya` objects, each with final `text` and a detailed `history`. The generated declaration
file includes structural interfaces for inputs and results. Enum values are the Rust/Python enum
names (for example `Bhvadi`, `Lat`, `Kartari`, `Prathama`, `Eka`); consult
`vidyut-prakriya/src/args.rs` for the complete set.

## Development and tests

```sh
cargo test -p bindings-ts
wasm-pack test --node
npm exec --yes --package=typescript -- tsc --noEmit --strict \
  --target ES2022 --module NodeNext --moduleResolution NodeNext tests/typecheck.ts
```

The Rust tests validate native integration. The WASM command executes exports in Node, and the
last command checks the generated declaration file. See [LEARNINGS.md](LEARNINGS.md) for binding
design decisions and limitations.
