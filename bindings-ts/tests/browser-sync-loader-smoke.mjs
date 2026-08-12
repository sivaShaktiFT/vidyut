import { readFile } from "node:fs/promises";
import { initSync, Scheme, transliterate } from "../pkg/browser/vidyut.js";

initSync({ module: await readFile(new URL("../pkg/browser/vidyut_bg.wasm", import.meta.url)) });

if (transliterate("rAma", Scheme.Slp1, Scheme.Devanagari) !== "राम") {
  throw new Error("The synchronous browser loader returned an unexpected result");
}

console.log("Vidyut synchronous browser loader smoke test passed");
