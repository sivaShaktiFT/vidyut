# Using Vidyut in a React + TypeScript workspace

This guide separates the two kinds of Vidyut functionality:

1. The browser-safe WASM package (`@siva-sh/vidyut`): transliteration, metre, sandhi, and grammar.
2. The data-backed `vidyut-kosha` dictionary: run this on a trusted server and expose a small,
   typed HTTP API to React.

That separation is important. `vidyut-kosha` opens a compact on-disk database and can be many
megabytes. It is not currently part of the browser WASM bundle, and it should not be fetched into
every client by default.

## 1. Build and install the WASM package

From this repository:

```sh
cd bindings-ts
npm run build
```

In a React workspace, install the local package (or publish it first):

```sh
npm install ../path/to/vidyut/bindings-ts/pkg
```

Vite and other ESM bundlers can use the package root. In Next.js, import the explicit
`@siva-sh/vidyut/browser` entry only from a Client Component or a client-only dynamic import.
WebAssembly initialization is a browser concern.

## 2. Initialize once with a React provider

Create `src/vidyut/VidyutProvider.tsx`. The package’s public API exports `Scheme` and the
`Prakriya`, `Classification`, `SandhiRule`, and `SandhiSplit` interfaces.

```tsx
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type {
  Chandas,
  Sandhi,
  Scheme,
  Vyakarana,
  transliterate,
  type Classification,
  type SandhiSplit,
} from "@siva-sh/vidyut/browser";

type VidyutApi = {
  Scheme: typeof Scheme;
  chandas: Chandas;
  sandhi: Sandhi;
  vyakarana: Vyakarana;
  transliterate(input: string, from: Scheme, to: Scheme): string;
  classify(input: string): Classification;
  split(input: string): SandhiSplit[];
};

const VidyutContext = createContext<VidyutApi | null>(null);

const meters = "vasantatilakA\tvrtta\tGGLGLLLGLLGLGG";

export function VidyutProvider({ children }: { children: ReactNode }) {
  const [api, setApi] = useState<VidyutApi | null>(null);

  useEffect(() => {
    let disposed = false;
    let instances: { chandas: Chandas; sandhi: Sandhi; vyakarana: Vyakarana } | undefined;

    void import("@siva-sh/vidyut/browser").then(async (vidyut) => {
      await vidyut.default();
      if (disposed) return;

      const chandas = new vidyut.Chandas(meters);
      const sandhi = new vidyut.Sandhi();
      const vyakarana = new vidyut.Vyakarana();
      instances = { chandas, sandhi, vyakarana };
      setApi({
        Scheme: vidyut.Scheme,
        chandas,
        sandhi,
        vyakarana,
        transliterate: vidyut.transliterate,
        classify: (input) => chandas.classify(input),
        split: (input) => sandhi.splitAll(input),
      });
    });
    return () => {
      disposed = true;
      instances?.chandas.free();
      instances?.sandhi.free();
      instances?.vyakarana.free();
    };
  }, []);

  return <VidyutContext.Provider value={api}>{children}</VidyutContext.Provider>;
}

export function useVidyut(): VidyutApi {
  const api = useContext(VidyutContext);
  if (!api) throw new Error("Vidyut is still initializing or the provider is missing");
  return api;
}
```

Wrap the application once:

```tsx
root.render(<VidyutProvider><App /></VidyutProvider>);
```

All grammar, metre, and sandhi calls expect SLP1. Keep display text in the user’s chosen script
and transliterate only at the UI boundary:

```tsx
const { Scheme, transliterate, classify } = useVidyut();
const slp1 = transliterate("रामः गच्छति", Scheme.Devanagari, Scheme.Slp1);
const result = classify(slp1);
const display = transliterate(slp1, Scheme.Slp1, Scheme.Devanagari);
```

The provider initializes the browser loader once and owns the long-lived WASM objects. It releases
them when it unmounts. In production, add error state and retry handling around the dynamic import.

## 3. Serve `vidyut-kosha` behind a typed API

Keep the dictionary file and Rust crate on the server. The React application should receive small,
serializable lookup results rather than database handles or raw database files.

Define a shared TypeScript contract in `packages/contracts/src/kosha.ts`:

```ts
export type KoshaEntry = {
  lemma: string;
  lemmaSlp1: string;
  kind: "dhatu" | "pratipadika" | "pada";
  glosses: string[];
};

export type KoshaLookupResponse = {
  query: string;
  entries: KoshaEntry[];
};
```

The Rust service opens `vidyut_kosha::Kosha` at startup, not on every request. Its route should
accept an SLP1 query and map only the public fields required by the contract above. Exact lookup
methods and entry variants are documented in `vidyut-kosha`'s Rust API and Python binding; do not
expose a database path to the browser.

For example, a React Query hook can safely consume that endpoint:

```ts
import { useQuery } from "@tanstack/react-query";
import type { KoshaLookupResponse } from "@workspace/contracts/kosha";

export function useKoshaLookup(querySlp1: string) {
  return useQuery({
    queryKey: ["kosha", querySlp1],
    enabled: querySlp1.length > 1,
    queryFn: async (): Promise<KoshaLookupResponse> => {
      const response = await fetch(`/api/kosha?q=${encodeURIComponent(querySlp1)}`);
      if (!response.ok) throw new Error("Dictionary lookup failed");
      return response.json() as Promise<KoshaLookupResponse>;
    },
    staleTime: 5 * 60_000,
  });
}
```

Combine the two layers in a search component: transliterate the user input to SLP1 with the local
WASM binding, then send that normalized SLP1 query to `/api/kosha`. This yields responsive input
normalization and keeps dictionary data server-side.

## Deployment checklist

- Ship the `.wasm` file emitted in `pkg/` with the JavaScript module; do not exclude it from the
  bundler’s static assets.
- Initialize Vidyut once, never in a render function or per keystroke.
- Use `Web Worker`s for batches of expensive grammar derivations so React rendering remains
  responsive.
- Validate and rate-limit dictionary requests on the server, and cache common SLP1 lookups.
- Version the `KoshaEntry` contract independently from the database format so database upgrades
  remain invisible to the React client.
