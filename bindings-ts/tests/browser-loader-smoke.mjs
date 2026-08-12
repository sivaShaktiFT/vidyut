import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import init, { Chandas, Sandhi, Scheme, Vyakarana, transliterate } from "../pkg/browser/vidyut.js";

assert.throws(() => transliterate("rAma", Scheme.Slp1, Scheme.Devanagari));
await assert.rejects(init({ module_or_path: new Uint8Array([0]) }));

const wasm = await readFile(new URL("../pkg/browser/vidyut_bg.wasm", import.meta.url));
const first = init({ module_or_path: wasm });
assert.equal(first, init({ module_or_path: wasm }), "concurrent callers must share initialization");
const output = await first;
assert.ok(output?.memory instanceof WebAssembly.Memory, "init must return the generated initialization output");
assert.equal(await init(), output, "repeat initialization must return the cached initialization output");

if (transliterate("rAma", Scheme.Slp1, Scheme.Devanagari) !== "राम") {
  throw new Error("The browser loader returned an unexpected result");
}

const sandhi = new Sandhi();
try {
  assert.deepEqual(sandhi.splitAt("ceti", 0), []);
  assert.ok(sandhi.splitAt("ceti", 2).some((split) => split.first === "ca" && split.second === "iti"));
  assert.throws(() => sandhi.splitAll("राम"), /SLP1/);
} finally {
  sandhi.free();
}

const chandas = new Chandas();
try {
  assert.ok(chandas.classifyAll("mAtaH samastajagatAM maDukEwaBAreH").names.includes("vasantatilakA"));
} finally {
  chandas.free();
}

const grammar = new Vyakarana();
try {
  assert.throws(() => grammar.deriveTinantas({
    dhatu: { aupadeshika: "BU", gana: "not-a-gana", prefixes: [], sanadi: [] },
    lakara: "Lat", prayoga: "Kartari", purusha: "Prathama", vacana: "Eka", skip_at_agama: false,
  }), /unknown variant|Could not parse/);
} finally {
  grammar.free();
}

console.log("Vidyut browser loader smoke test passed");
