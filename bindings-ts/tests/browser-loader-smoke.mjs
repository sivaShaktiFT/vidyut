import { readFile } from "node:fs/promises";
import init, { Scheme, transliterate } from "../pkg/browser/vidyut.js";

await init({ module_or_path: await readFile(new URL("../pkg/browser/vidyut_bg.wasm", import.meta.url)) });

if (transliterate("rAma", Scheme.Slp1, Scheme.Devanagari) !== "राम") {
  throw new Error("The browser loader returned an unexpected result");
}

console.log("Vidyut browser loader smoke test passed");
