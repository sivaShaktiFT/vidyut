# Vidyut for TypeScript

`@siva-sh/vidyut` packages Vidyut's browser-safe Sanskrit tools as WebAssembly. It is intended for web applications that need fast, local transliteration, metre classification, sandhi analysis, or Pāṇinian word generation without a server round trip.

The generated package is ESM and works with modern browser bundlers such as Vite, Next.js, and Webpack. It does not depend on Node.js at runtime.

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
npm run build
```

This produces `bindings-ts/pkg/`, an npm-ready `@siva-sh/vidyut` package. Run `npm run pack` to
create a publishable tarball or `npm run publish:npm` to publish it publicly to npm. Use
`npm run build:bundler` for React and other bundlers; its generated module is initialized by the
bundler. The default `web` build instead requires an explicit asynchronous initializer.

## Use in a web application

```ts
import init, {
  Chandas,
  Sandhi,
  Scheme,
  Vyakarana,
  detect,
  transliterate,
} from "@siva-sh/vidyut";

await init();

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

The generated package is published as `@siva-sh/vidyut`. The build script sets this name after
wasm-pack creates the package, so the Rust crate can retain its workspace-local `bindings-ts`
name.

All grammatical text passed to `Sandhi`, `Chandas`, and `Vyakarana` is SLP1. Convert user-facing
text with `transliterate` at the application boundary. SLP1 uses one ASCII byte per sound, which
also makes `Sandhi.splitAt` indexes unambiguous.

For a production React + TypeScript setup, including a server-side `vidyut-kosha` dictionary
bridge and a typed client contract, see [REACT.md](REACT.md).

## API notes

`Chandas` accepts a UTF-8 TSV with three columns: metre name, type, and a pattern made of `G`,
`L`, `/`, and `|`. `classify` returns the best result and `classifyAll` returns every match.

`Sandhi.splitAt(input, index)` returns possible analyses at an SLP1 byte/character index.
`splitAll` considers boundaries only in the first contiguous SLP1 chunk, so it never produces a
split across whitespace or punctuation. Prefer the `isValid` flag to remove phonetically
implausible analyses. `rules()` exposes the exact generated table for UI inspection or custom
ranking.

`Vyakarana` receives plain objects matching Vidyut's existing web API. Its result is an array of
`Prakriya` objects, each with final `text` and a detailed `history`. The package’s public typed
facade binds each method to its input and result interfaces. Grammar enum values are strings using
the Rust/Python enum names (for example `"Bhvadi"`, `"Lat"`, `"Kartari"`, `"Prathama"`,
`"Eka"`); do not pass the numeric enums from Vidyut’s legacy WASM implementation. A
`KrdantaArgs.upapada`, when supplied, must include all of `stem`, `linga`, `vibhakti`, and
`vacana`; a `PratipadikaArgs` object must specify exactly one variant. Malformed grammar input
throws a descriptive JavaScript `Error`; an empty array is reserved for a successful derivation
with no forms. Consult
`vidyut-prakriya/src/args.rs` for the complete set.

The npm package is MIT-licensed and ships `LICENSE-MIT` with the same terms named in its package
metadata. Release packaging enforces a 1.2 MB raw / 450 KB gzip WebAssembly budget.

## Development and tests

```sh
cargo test -p bindings-ts
wasm-pack test --node
npm run build
npm run test:types
npm run pack
```

The Rust tests validate native integration. The WASM command executes exports in Node, and the
last command checks the generated declaration file. See [LEARNINGS.md](LEARNINGS.md) for binding
design decisions and limitations.
