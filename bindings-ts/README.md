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

## Browsers, React, Next.js, bundlers, and workers

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

`init()` is safe to call concurrently: all callers share one initialization request and receive the
same `InitOutput`. If loading or compilation fails, a later call retries it. Do not invoke browser APIs while rendering on the
server; Node.js can instead use the synchronous API above. `initSync` is also available for a
browser Worker that already has the compiled module or bytes; it cannot synchronously fetch a
`.wasm` file and should not block the UI thread.

### React and Next.js

For React and Next.js, load the browser entry point in a Client Component. Cache the import and
initializer at module scope, which avoids initialization during server rendering and lets every
component use the same ready API.

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
values are strings such as `"Bhvadi"`, `"Lat"`, and `"Kartari"`; the package deliberately does
not export numeric grammar enum objects. A `KrdantaArgs` value requires
exactly one of `krt` or `unadi`.

`Chandas` and `Sandhi` accept SLP1/ASCII text and throw for non-ASCII input. When several sandhi
rules have the same specificity, `Sandhi.join` uses the first rule in Vidyut's generated precedence
order; use `rules()` when an application needs to inspect that table.

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
should explicitly import `@siva-sh/vidyut/browser`.
