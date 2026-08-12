# Vidyut for JavaScript and TypeScript

`@siva-sh/vidyut` is a browser-first WebAssembly interface to Vidyut's Sanskrit tools. It provides typed transliteration, metre classification, sandhi analysis, and word generation for browser bundlers, React, Next.js, Workers, and Node.js ESM.

## Install

```sh
npm install @siva-sh/vidyut
```

## Choose your runtime

| Runtime | Import | Initialization |
| --- | --- | --- |
| Browser, Vite, webpack, Rollup | `@siva-sh/vidyut` | `await init()` |
| React | `@siva-sh/vidyut` from an effect or event handler | Cache one `loadVidyut()` promise |
| Next.js Client Component | `@siva-sh/vidyut` | Cache one `loadVidyut()` promise |
| Web Worker | `@siva-sh/vidyut` | `await init()` or `initSync` with preloaded bytes |
| Node.js ESM | `@siva-sh/vidyut` | Pass bytes from `readFile(wasmUrl)` |

The package is ESM-only and has no CommonJS `require()` entry point. Browser code must await initialization before constructing or calling Vidyut APIs.

## Browser applications

Vite, webpack, Rollup, and comparable bundlers select the browser build automatically. The default initializer loads the packaged WASM asset, shares concurrent calls, and allows a retry after a failed fetch or compile.

```ts
import init, { Scheme, transliterate } from "@siva-sh/vidyut";

await init();
const input = "rAma";
const output = transliterate(input, Scheme.Slp1, Scheme.Devanagari);
console.log({ input, output }); // { input: "rAma", output: "राम" }
```

## Find metres with the built-in catalogue

The traditional *vṛtta* catalogue is embedded in the WASM binary, so there is no runtime data fetch or catalogue configuration. Vidyut also recognizes its built-in *jāti* metres (such as `AryA`). `findMeters` returns every non-empty match and its strength: `"full"`, `"pada"`, or `"prefix"`.

```ts
import init, { Chandas } from "@siva-sh/vidyut";

await init();
const metres = new Chandas();
try {
  const input = "mAtaH samastajagatAM maDukEwaBAreH";
  console.log(metres.findMeters(input));
  // [{ name: "vasantatilakA", matchType: "pada" }, ...]
} finally {
  metres.free();
}
```

## Web Workers

Initialize asynchronously in a normal Worker. This leaves initialization and Sanskrit processing off the UI thread.

```ts
// vidyut.worker.ts
import init, { Scheme, transliterate } from "@siva-sh/vidyut";

await init();
self.onmessage = ({ data }: MessageEvent<string>) => {
  self.postMessage(transliterate(data, Scheme.Slp1, Scheme.Devanagari));
};

// postMessage("rAma") produces "राम"
```

If the worker already owns downloaded bytes or a compiled `WebAssembly.Module`, it may initialize synchronously. Do not use this option on the UI thread.

```ts
import { initSync, Scheme, transliterate } from "@siva-sh/vidyut";

self.onmessage = ({ data }: MessageEvent<ArrayBuffer>) => {
  initSync({ module: data });
  self.postMessage(transliterate("rAma", Scheme.Slp1, Scheme.Devanagari));
};
```

## Node.js ESM

Node.js can run the browser module when it receives the packaged WASM bytes explicitly. This is useful for ESM build scripts, static-site generation, and tests. It is asynchronous and does not support CommonJS.

```ts
// script.mts
import { readFile } from "node:fs/promises";
import init, { Scheme, transliterate } from "@siva-sh/vidyut";
import wasmUrl from "@siva-sh/vidyut/wasm-url";

await init({ module_or_path: await readFile(wasmUrl) });
console.log(transliterate("rAma", Scheme.Slp1, Scheme.Devanagari)); // राम
```

## React

Load the package once at module scope. Create WASM-backed objects in an effect or event handler, never during render, and call `.free()` when each object is no longer needed.

```ts
// src/lib/vidyut.ts
type VidyutModule = typeof import("@siva-sh/vidyut");
let modulePromise: Promise<VidyutModule> | undefined;

export function loadVidyut(): Promise<VidyutModule> {
  modulePromise ??= import("@siva-sh/vidyut")
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

This complete component joins the input `ca + iti` and renders `ceti`.

```tsx
import { useEffect, useState } from "react";
import { loadVidyut } from "./lib/vidyut";

export function SandhiJoiner() {
  const [output, setOutput] = useState("Loading…");

  useEffect(() => {
    let cancelled = false;
    void loadVidyut()
      .then(({ Sandhi }) => {
        const sandhi = new Sandhi();
        try {
          const result = sandhi.join("ca", "iti");
          if (!cancelled) setOutput(result);
        } finally {
          sandhi.free();
        }
      })
      .catch((error) => {
        if (!cancelled) setOutput(`Error: ${error.message}`);
      });
    return () => { cancelled = true; };
  }, []);

  return <output>ca + iti → {output}</output>;
}
// Renders: ca + iti → ceti
```

For a long-lived grammar, metre, or sandhi instance, keep one object in a React ref and call `.free()` in effect cleanup. Pass grammar, metre, and sandhi text in SLP1, then transliterate at the display boundary.

## Next.js App Router

Vidyut must be loaded from a Client Component because it fetches and instantiates WebAssembly. Do not import the loader from a Server Component, route handler, or server action. The root import and `@siva-sh/vidyut/browser` alias have the same runtime API and TypeScript types.

Create a shared client loader:

```ts
// app/lib/vidyut-client.ts
"use client";

type VidyutModule = typeof import("@siva-sh/vidyut");
let modulePromise: Promise<VidyutModule> | undefined;

export function loadVidyut(): Promise<VidyutModule> {
  modulePromise ??= import("@siva-sh/vidyut")
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

Use it from a Client Component. Given the SLP1 input `rAma`, this renders the Devanagari output `राम` after initialization.

```tsx
// app/components/transliterate-example.tsx
"use client";

import { useEffect, useState } from "react";
import { loadVidyut } from "../lib/vidyut-client";

export function TransliterateExample() {
  const [output, setOutput] = useState("Loading…");

  useEffect(() => {
    let cancelled = false;
    void loadVidyut()
      .then(({ Scheme, transliterate }) => {
        const result = transliterate("rAma", Scheme.Slp1, Scheme.Devanagari);
        if (!cancelled) setOutput(result);
      })
      .catch((error) => {
        if (!cancelled) setOutput(`Error: ${error.message}`);
      });
    return () => { cancelled = true; };
  }, []);

  return <p>rAma → {output}</p>;
}
// Renders: rAma → राम
```

A server page can render the Client Component normally; the `"use client"` boundary is the component file.

```tsx
// app/page.tsx
import { TransliterateExample } from "./components/transliterate-example";

export default function Page() {
  return <main><TransliterateExample /></main>;
}
```

For the Pages Router, use the same loader from a component effect. If a component should never be server-rendered, load it using `next/dynamic` with `{ ssr: false }`; initialization remains inside the component effect.

## API

```ts
import init, { Chandas, Sandhi, Vyakarana } from "@siva-sh/vidyut";

await init();

const sandhi = new Sandhi();
try {
  console.log(sandhi.join("ca", "iti")); // ceti
  console.log(sandhi.splitAll("ceti").filter((split) => split.isValid));
  // Includes { first: "ca", second: "iti", isValid: true, ... }
} finally {
  sandhi.free();
}

const metres = new Chandas();
try {
  console.log(metres.classify("mAtaH samastajagatAM maDukEwaBAreH"));
  // { name: "vasantatilakA", matchType: "pada", aksharas: [...] }
} finally {
  metres.free();
}

const grammar = new Vyakarana();
try {
  const forms = grammar.deriveTinantas({
    dhatu: { aupadeshika: "BU", gana: "Bhvadi", prefixes: [], sanadi: [] },
    lakara: "Lat", prayoga: "Kartari", purusha: "Prathama", vacana: "Eka",
    skip_at_agama: false,
  });
  console.log(forms[0]?.text); // Bavati
} finally {
  grammar.free();
}
```

`Chandas` and `Sandhi` accept SLP1 text and reject invalid characters. Whitespace, apostrophes, `|`, and `~` are supported alongside the SLP1 alphabet. `splitAt(input, offset)` uses DOM-style boundary offsets: `0` is before the first character and `input.length` is after the last.

Grammar enum values are Rust names as strings, such as `"Bhvadi"`, `"Lat"`, and `"Kartari"`. `KrdantaArgs` requires exactly one of `krt` or `unadi`.

### Supported transliteration schemes

Pass one of these `Scheme` enum members to `transliterate(input, from, to)`.

```ts
// Scripts
Scheme.Assamese; Scheme.Balinese; Scheme.Bengali; Scheme.Bhaiksuki; Scheme.Brahmi;
Scheme.Burmese; Scheme.Cham; Scheme.Devanagari; Scheme.Dogra; Scheme.Grantha;
Scheme.Gujarati; Scheme.GunjalaGondi; Scheme.Gurmukhi; Scheme.Javanese; Scheme.Kaithi;
Scheme.Kannada; Scheme.Kharoshthi; Scheme.Khmer; Scheme.Khudawadi; Scheme.Limbu;
Scheme.Malayalam; Scheme.MeeteiMayek; Scheme.MasaramGondi; Scheme.Modi; Scheme.Mon;
Scheme.Nandinagari; Scheme.Newa; Scheme.Odia; Scheme.OlChiki; Scheme.Saurashtra;
Scheme.Sharada; Scheme.Siddham; Scheme.Sinhala; Scheme.Soyombo; Scheme.TaiTham;
Scheme.Takri; Scheme.Tamil; Scheme.Telugu; Scheme.Thai; Scheme.Tibetan; Scheme.Tirhuta;
Scheme.ZanabazarSquare;

// Romanization and input encodings
Scheme.BarahaSouth; Scheme.HarvardKyoto; Scheme.Iast; Scheme.Iso15919; Scheme.Itrans;
Scheme.Slp1; Scheme.Velthuis; Scheme.Wx;
```

`vidyut-kosha` and its on-disk dictionary data are not part of this browser package; keep them on a trusted server behind a small typed API.
