# Vidyut for JavaScript and TypeScript

`@siva-sh/vidyut` brings Vidyut's Sanskrit tools to JavaScript everywhere WebAssembly runs:
Node.js, browsers, browser bundlers, workers, and server-side applications. It exposes one
typed root API for transliteration, metre classification, sandhi analysis, and word generation.

## Install

```sh
npm install @siva-sh/vidyut
```

## Node.js

Node.js loads its WebAssembly implementation synchronously, so no setup is required.

```ts
import { Sandhi, Scheme, transliterate } from "@siva-sh/vidyut";

console.log(transliterate("rAma", Scheme.Slp1, Scheme.Devanagari)); // राम
console.log(new Sandhi().join("ca", "iti")); // ceti
```

## Browsers, bundlers, and workers

Call the default initializer once before using the API. With Vite, webpack, Rollup, and comparable
tools, the package selects its browser build automatically. In Next.js Client Components, prefer
the explicit `@siva-sh/vidyut/browser` entry point.

```ts
import init, { Scheme, transliterate } from "@siva-sh/vidyut";

await init();
console.log(transliterate("rAma", Scheme.Slp1, Scheme.Devanagari)); // राम
```

The default `init()` loads the packaged `.wasm` file. In workers or deployments that provide the
compiled module or bytes themselves, pass it as an option:

```ts
await init({ module_or_path: wasmModuleOrBytes });
```

In React, call `init()` from an effect or other client-only startup path. Do not invoke browser
APIs while rendering on the server; Node.js can instead use the synchronous API above. `initSync`
is also available for a browser Worker that already has the compiled module or bytes; it cannot
synchronously fetch a `.wasm` file and should not block the UI thread.

## API

```ts
import { Chandas, Sandhi, Vyakarana } from "@siva-sh/vidyut";

const metres = new Chandas("vasantatilakA\tvrtta\tGGLGLLLGLLGLGG");
const match = metres.classify("mAtaH samastajagatAM maDukEwaBAreH");

const splits = new Sandhi().splitAll("rAmogacCati").filter((split) => split.isValid);

const forms = new Vyakarana().deriveTinantas({
  dhatu: { aupadeshika: "BU", gana: "Bhvadi", prefixes: [], sanadi: [] },
  lakara: "Lat",
  prayoga: "Kartari",
  purusha: "Prathama",
  vacana: "Eka",
  skip_at_agama: false,
});
```

Pass grammar text to Vidyut in SLP1; transliterate at the application boundary. Grammar enum
values are strings such as `"Bhvadi"`, `"Lat"`, and `"Kartari"`. A `KrdantaArgs` value requires
exactly one of `krt` or `unadi`.

### Supported transliteration schemes

Pass one of these `Scheme` enum members to `transliterate(input, from, to)`. The first group
contains Unicode scripts; the second contains romanization and input encodings.

```ts
// Scripts
Scheme.Assamese
Scheme.Balinese
Scheme.Bengali
Scheme.Bhaiksuki
Scheme.Brahmi
Scheme.Burmese
Scheme.Cham
Scheme.Devanagari
Scheme.Dogra
Scheme.Grantha
Scheme.Gujarati
Scheme.GunjalaGondi
Scheme.Gurmukhi
Scheme.Javanese
Scheme.Kaithi
Scheme.Kannada
Scheme.Kharoshthi
Scheme.Khmer
Scheme.Khudawadi
Scheme.Limbu
Scheme.Malayalam
Scheme.MeeteiMayek
Scheme.MasaramGondi
Scheme.Modi
Scheme.Mon
Scheme.Nandinagari
Scheme.Newa
Scheme.Odia
Scheme.OlChiki
Scheme.Saurashtra
Scheme.Sharada
Scheme.Siddham
Scheme.Sinhala
Scheme.Soyombo
Scheme.TaiTham
Scheme.Takri
Scheme.Tamil
Scheme.Telugu
Scheme.Thai
Scheme.Tibetan
Scheme.Tirhuta
Scheme.ZanabazarSquare

// Romanization and input encodings
Scheme.BarahaSouth
Scheme.HarvardKyoto
Scheme.Iast
Scheme.Iso15919
Scheme.Itrans
Scheme.Slp1
Scheme.Velthuis
Scheme.Wx
```

## Runtime support

The package uses conditional exports: Node.js receives a native Node WASM loader; browsers and
bundlers receive an asynchronous ES-module loader. Use the package root rather than importing its
generated files directly so your runtime receives the correct implementation. Next.js client code
can explicitly import `@siva-sh/vidyut/browser`.

For complete Next.js patterns, including transliteration, sandhi, grammar, metre, and search
examples, see [the Next.js guide](./NEXTJS_GUIDE.md).
