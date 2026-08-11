import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = fileURLToPath(new URL(".", import.meta.url));

// wasm-pack owns this generated output directory. Starting clean keeps rebuilds deterministic and
// prevents wasm-pack from trying to interpret metadata modified for npm publication.
await rm(resolve(scriptDirectory, "../pkg"), { recursive: true, force: true });
