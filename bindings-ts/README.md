# Vidyut for React

`@siva-sh/vidyut` brings Vidyut's Sanskrit tools to a React client application through
WebAssembly. It runs in the browser, so transliteration, metre classification, sandhi analysis,
and word generation do not require a request to your server.

## Install

```sh
npm install @siva-sh/vidyut
```

## Use from a client component

Initialize the WebAssembly module in an effect, after the component has mounted. This keeps it out
of server rendering and works with React frameworks such as Vite and Next.js. In Next.js, the
`"use client"` directive is required.

```tsx
"use client";

import { useEffect, useState } from "react";
import init, { Scheme, transliterate } from "@siva-sh/vidyut";

let vidyutReady: Promise<void> | undefined;

function loadVidyut() {
  return (vidyutReady ??= init());
}

export function SanskritGreeting() {
  const [text, setText] = useState("Loading…");

  useEffect(() => {
    let cancelled = false;

    void loadVidyut().then(() => {
      if (!cancelled) {
        setText(transliterate("rAmaH gacCati", Scheme.Slp1, Scheme.Devanagari));
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return <p lang="sa">{text}</p>;
}
```

The module is initialized once, even when React Strict Mode re-runs effects during development.
After `loadVidyut()` resolves, use `Chandas`, `Sandhi`, `Vyakarana`, `detect`, and
`transliterate` normally from client-side event handlers or effects.

```tsx
import { Sandhi, Vyakarana } from "@siva-sh/vidyut";

const sandhi = new Sandhi();
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

Pass grammatical text to Vidyut in SLP1; transliterate text at the UI boundary. Grammar enum
values are strings such as `"Bhvadi"`, `"Lat"`, and `"Kartari"`. A `KrdantaArgs` value requires
exactly one of `krt` or `unadi`.

The package is browser-only. Keep imports behind a client-component boundary and do not call
`init()` during server rendering.
