# Using Vidyut in Next.js

`@siva-sh/vidyut` runs its browser API through WebAssembly. Keep it in Client Components and
initialize it once before calling any API. The App Router patterns below also work with the Pages
Router.

Use the package's explicit browser entry point in Next.js. It prevents a server build from ever
resolving the Node.js loader. The normal initializer fetches and compiles the `.wasm` file with
streaming compilation, which is the smallest and fastest general-purpose browser path.

## One shared loader

Create a client-only loader. It caches both the module import and WASM initialization, so every
component uses the same ready module.

```ts
// lib/vidyut-client.ts
"use client";

type VidyutModule = typeof import("@siva-sh/vidyut");

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
    // A transient network failure must not poison every later attempt.
    .catch((error) => {
      modulePromise = undefined;
      throw error;
    });

  return modulePromise;
}

/** Begin downloading early, for example on an input's `onFocus`. */
export function preloadVidyut(): void {
  void loadVidyut();
}
```

Do not call a Vidyut API during server rendering. Store selected schemes as names such as
`"Slp1"` and `"Devanagari"`, rather than their numeric enum values.

## Synchronous initialization (advanced)

The browser cannot synchronously download a WASM file. `initSync` is therefore only useful when
the bytes or a compiled `WebAssembly.Module` are already in memory. It blocks the calling thread
while it compiles and instantiates, so do this in a Worker for Vidyut's approximately 1 MB module,
not during React rendering or an input event.

```ts
// app/vidyut.worker.ts
import { initSync, Scheme, transliterate } from "@siva-sh/vidyut/browser";

self.onmessage = ({ data }: MessageEvent<ArrayBuffer>) => {
  initSync({ module: data });
  self.postMessage(transliterate("rAma", Scheme.Slp1, Scheme.Devanagari));
};
```

Fetch the bytes asynchronously in the main thread (or cache them with a Service Worker), then
transfer them to the worker. A transferred `ArrayBuffer` no longer belongs to the sender:

```ts
import wasmUrl from "@siva-sh/vidyut/wasm-url";

const response = await fetch(wasmUrl);
if (!response.ok) throw new Error(`Could not load Vidyut WASM: ${response.status}`);
const bytes = await response.arrayBuffer();
worker.postMessage(bytes, [bytes]);
```

Do not inline the WASM binary as base64 just to make initialization synchronous: it makes every
JavaScript bundle larger and slower to parse, while losing streaming compilation. For ordinary
Next.js UI, `loadVidyut()` plus `preloadVidyut()` is the recommended solution.

## 1. Script converter

```tsx
"use client";

import { useState } from "react";
import { loadVidyut } from "@/lib/vidyut-client";

export function ScriptConverter() {
  const [input, setInput] = useState("rAma");
  const [output, setOutput] = useState("");

  async function convert() {
    const { Scheme, transliterate } = await loadVidyut();
    setOutput(transliterate(input, Scheme.Slp1, Scheme.Devanagari));
  }

  return <button onClick={convert}>{output || "Convert"}</button>;
}
```

## 2. Normalize Sanskrit input for grammar APIs

Use SLP1 as the canonical form passed to grammar APIs. Convert user-entered IAST, ITRANS, or
another supported scheme at the application boundary.

```ts
import { loadVidyut } from "@/lib/vidyut-client";

export async function normalizeToSlp1(input: string, from: "Iast" | "Itrans" | "HarvardKyoto") {
  const { Scheme, transliterate } = await loadVidyut();
  return transliterate(input, Scheme[from], Scheme.Slp1);
}
```

## 3. Sandhi splitter

```ts
import { loadVidyut } from "@/lib/vidyut-client";

export async function splitSandhi(input: string) {
  const { Sandhi } = await loadVidyut();
  const sandhi = new Sandhi();
  try {
    return sandhi.splitAll(input).filter((split) => split.isValid);
  } finally {
    sandhi.free();
  }
}

// await splitSandhi("rAmogacCati")
```

## 4. Sandhi joiner

```ts
import { loadVidyut } from "@/lib/vidyut-client";

export async function joinSandhi(first: string, second: string) {
  const { Sandhi } = await loadVidyut();
  const sandhi = new Sandhi();
  try {
    return sandhi.join(first, second);
  } finally {
    sandhi.free();
  }
}

// await joinSandhi("ca", "iti") // "ceti"
```

## 5. Word-form generator

`Vyakarana` exposes noun, verb, primary-derivative, secondary-derivative, and feminine-form
generation. This example creates a present-tense verb form.

```ts
import { loadVidyut } from "@/lib/vidyut-client";

export async function generateVerb() {
  const { Vyakarana } = await loadVidyut();
  const vyakarana = new Vyakarana();
  try {
    return vyakarana.deriveTinantas({
      dhatu: { aupadeshika: "BU", gana: "Bhvadi", prefixes: [], sanadi: [] },
      lakara: "Lat",
      prayoga: "Kartari",
      purusha: "Prathama",
      vacana: "Eka",
      skip_at_agama: false,
    });
  } finally {
    vyakarana.free();
  }
}
```

## 6. Verb explorer

Bind selector values directly to the `deriveTinantas` arguments. The result includes both the
final text and the derivation history.

```ts
const forms = await generateVerb();
const finalForms = forms.map((prakriya) => prakriya.text);
const firstHistory = forms[0]?.history;
```

Render `prakriya.history` as a rule-by-rule derivation: each step has `rule.source`,
`rule.code`, and the resulting `terms` in `step.result`.

## 7. Noun declension tool

```ts
import { loadVidyut } from "@/lib/vidyut-client";

export async function declineRama() {
  const { Vyakarana } = await loadVidyut();
  const vyakarana = new Vyakarana();
  try {
    return vyakarana.deriveSubantas({
      pratipadika: { basic: "rAma" },
      linga: "Pum",
      vibhakti: "Prathama",
      vacana: "Eka",
    });
  } finally {
    vyakarana.free();
  }
}
```

For a full declension table, call this with each vibhakti and vacana pair. Keep stem and grammar
arguments in SLP1, then transliterate each returned `prakriya.text` for display.

## 8. Metre scanner

Supply your own metre catalogue as tab-separated `name`, `kind`, and `pattern` rows.

```ts
import { loadVidyut } from "@/lib/vidyut-client";

const metersTsv = "vasantatilakA\\tvrtta\\tGGLGLLLGLLGLGG";

export async function scanMetre(text: string) {
  const { Chandas } = await loadVidyut();
  const chandas = new Chandas(metersTsv);
  try {
    return chandas.classify(text);
  } finally {
    chandas.free();
  }
}
```

The result includes a match name, match type, and laghu/guru `aksharas` grouped by pada.

## 9. Script detector and automatic conversion

```ts
import { loadVidyut } from "@/lib/vidyut-client";

export async function convertDetectedInput(input: string) {
  const { Scheme, detect, transliterate } = await loadVidyut();
  const detected = detect(input);
  return {
    detectedName: Scheme[detected],
    devanagari: transliterate(input, detected, Scheme.Devanagari),
  };
}
```

Show `detectedName` to the user and offer a scheme picker as an override: automatic detection is
a convenience, not a substitute for an explicit choice.

## 10. Reading assistant

Combine normalization, splitting, and transliteration to display a passage in a learner's
preferred script.

```ts
import { loadVidyut } from "@/lib/vidyut-client";

export async function readingAid(slp1Text: string) {
  const { Sandhi, Scheme, transliterate } = await loadVidyut();
  const sandhi = new Sandhi();
  try {
    return {
      display: transliterate(slp1Text, Scheme.Slp1, Scheme.Devanagari),
      splits: sandhi.splitAll(slp1Text).filter((split) => split.isValid),
    };
  } finally {
    sandhi.free();
  }
}
```

## 11. Search and dictionary normalization

Normalize both indexed headwords and user queries to SLP1. This lets a user search the same
dictionary with IAST, Devanagari, or another supported input scheme.

```ts
import { loadVidyut } from "@/lib/vidyut-client";

export async function normalizeSearchQuery(input: string, inputSchemeName: string) {
  const { Scheme, transliterate } = await loadVidyut();
  const inputScheme = Scheme[inputSchemeName as keyof typeof Scheme];

  if (typeof inputScheme !== "number") {
    throw new Error(`Unsupported scheme: ${inputSchemeName}`);
  }

  return transliterate(input, inputScheme, Scheme.Slp1);
}
```

Store a dictionary record's canonical SLP1 headword separately from its display form. For
example, index `"rAma"`, display `"राम"`, and transliterate to the user's selected scheme at
render time.

## Resource lifecycle

`Sandhi`, `Chandas`, and `Vyakarana` own WASM-side resources. Call `.free()` once you have
copied the returned data, as each example does with `try`/`finally`. For a long-lived interactive
tool, keep one instance in a React ref and free it in an effect cleanup function.
