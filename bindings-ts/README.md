# Vidyut for JavaScript and TypeScript

`@siva-sh/vidyut` is a production-ready WebAssembly interface to Vidyut's Sanskrit tools. It runs
in Node.js (ESM and CommonJS), browsers, browser bundlers, workers, and Next.js Client Components, with a
typed API for transliteration, metre classification, sandhi analysis, and word generation.

## Find metres with the built-in catalogue

Use the bundled catalogue when you want to identify metres without maintaining metre data in your
application. `findMeters` returns every non-empty match and its strength: `"full"` for a complete
match, `"pada"` at a metrical foot boundary, and `"prefix"` for an incomplete expression.

```ts
import { Chandas } from "@siva-sh/vidyut";

const metres = new Chandas();
try {
  const matches = metres.findMeters("mAtaH samastajagatAM maDukEwaBAreH");
  console.log(matches); // [{ name: "vasantatilakA", matchType: "pada" }, ...]
} finally {
  metres.free();
}
```

The complete traditional *vṛtta* catalogue is checked in as JSON and embedded in the WebAssembly
binary at build time. There is no runtime data fetch, data-file import, or catalogue configuration.

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

CommonJS is also supported:

```js
const { Sandhi, Scheme, transliterate } = require("@siva-sh/vidyut");
```

## Browser applications

Call the default initializer once before using the API. Vite, webpack, Rollup, and comparable
tools select the browser build from the package root automatically. The initializer loads the
packaged WASM asset, shares concurrent calls, and allows a retry after a failed fetch or compile.
Calling an API before initialization throws; await the initializer before constructing or using
Vidyut objects.

```ts
import init, { Scheme, transliterate } from "@siva-sh/vidyut";

await init();
console.log(transliterate("rAma", Scheme.Slp1, Scheme.Devanagari)); // राम
```

In a worker or a runtime that provides a compiled module or bytes directly, pass it as an option:

```ts
await init({ module_or_path: wasmModuleOrBytes });
```

Do not invoke browser APIs while rendering on the server; Node.js can instead use the synchronous
API above. `initSync` is available for a browser Worker that already has compiled bytes or a
module. It cannot synchronously fetch a `.wasm` file and should not block the UI thread.

### React and Next.js

For React and Next.js, load the explicit browser entry point from a Client Component. This avoids
Next.js selecting the Node loader while compiling its server graph. Cache the import and initializer
at module scope so every component shares one ready API.

```ts
// lib/vidyut-client.ts
"use client";

type VidyutModule = typeof import("@siva-sh/vidyut/browser");
let modulePromise: Promise<VidyutModule> | undefined;

export function loadVidyut(): Promise<VidyutModule> {
  if (typeof window === "undefined") {
    throw new Error("Vidyut is available only in client-side code.");
  }
  modulePromise ??= import("@siva-sh/vidyut/browser")
    .then(async (vidyut) => {
      await vidyut.default();
      return vidyut;
    })
    .catch((error) => {
      modulePromise = undefined;
      throw error;
    });
  return modulePromise;
}
```

Create and release WASM-backed objects in an effect or an event handler, never in render:

```tsx
"use client";

import { useEffect, useState } from "react";
import { loadVidyut } from "@/lib/vidyut-client";

export function SandhiResult({ input }: { input: string }) {
  const [result, setResult] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void loadVidyut()
      .then(({ Sandhi }) => {
        const sandhi = new Sandhi();
        try {
          const splits = sandhi.splitAll(input).filter((split) => split.isValid);
          if (!cancelled) setResult(splits.map((split) => `${split.first} ${split.second}`));
        } finally {
          sandhi.free();
        }
      })
      .catch((error) => {
        if (!cancelled) console.error("Unable to initialize Vidyut", error);
      });
    return () => { cancelled = true; };
  }, [input]);

  return <output>{result.join(", ")}</output>;
}
```

For a long-lived grammar, metre, or sandhi tool, keep one instance in a React ref and call
`.free()` from the effect cleanup. Pass grammar, metre, and sandhi text in SLP1, then
transliterate at the display boundary. Keep `vidyut-kosha` and its on-disk dictionary data on a
trusted server behind a small typed API; it is not part of this browser package.

In a Worker, where bytes are already available, synchronous initialization is appropriate:

```ts
import { initSync, Scheme, transliterate } from "@siva-sh/vidyut/browser";

self.onmessage = ({ data }: MessageEvent<ArrayBuffer>) => {
  initSync({ module: data });
  self.postMessage(transliterate("rAma", Scheme.Slp1, Scheme.Devanagari));
};
```

## API

```ts
import { Chandas, Sandhi, Vyakarana } from "@siva-sh/vidyut";

const metres = new Chandas();
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
values are strings such as `"Bhvadi"`, `"Lat"`, and `"Kartari"`; the package deliberately does
not export numeric grammar enum objects. A `KrdantaArgs` value requires
exactly one of `krt` or `unadi`.

`Chandas` and `Sandhi` accept SLP1 text and reject invalid characters. Whitespace, apostrophes,
`|`, and `~` are supported alongside the SLP1 alphabet. When several sandhi rules have the same
specificity, `Sandhi.join` uses the first rule in Vidyut's generated precedence order; use `rules()`
when an application needs to inspect that table. `splitAt(input, offset)` uses the same boundary
offsets as DOM selections: `0` is before the first character and `input.length` is after the last.
Use `splitAll` when the boundary is not already known.

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

The package uses conditional exports: ESM Node.js receives a native Node WASM loader; browsers and
bundlers receive an asynchronous ES-module loader. Use the package root rather than generated files
directly. In Next.js Client Components, explicitly import `@siva-sh/vidyut/browser`.
