import { readFile } from "node:fs/promises";
import { initSync, Scheme, transliterate } from "../pkg/browser/vidyut.js";

const output = initSync({ module: await readFile(new URL("../pkg/browser/vidyut_bg.wasm", import.meta.url)) });
if (!(output?.memory instanceof WebAssembly.Memory) || initSync({ module: new Uint8Array() }) !== output) {
  throw new Error("The synchronous loader did not return its cached initialization output");
}

if (transliterate("rAma", Scheme.Slp1, Scheme.Devanagari) !== "राम") {
  throw new Error("The synchronous browser loader returned an unexpected result");
}

console.log("Vidyut synchronous browser loader smoke test passed");
