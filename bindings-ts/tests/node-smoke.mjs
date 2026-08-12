import * as vidyut from "../pkg/node/vidyut.mjs";
import assert from "node:assert/strict";
import { Chandas, Sandhi, Scheme, Vyakarana, detect, transliterate } from "../pkg/node/vidyut.mjs";

const devanagari = transliterate("rAma", Scheme.Slp1, Scheme.Devanagari);
const sandhi = new Sandhi().join("ca", "iti");
const chandas = new Chandas();
const metre = chandas.classify("mAtaH samastajagatAM maDukEwaBAreH");
const meterMatches = chandas.findMeters("mAtaH samastajagatAM maDukEwaBAreH");
const sandhiEngine = new Sandhi();
const rules = sandhiEngine.rules();
const splits = sandhiEngine.splitAt("ceti", 2);
assert.deepEqual(sandhiEngine.splitAt("ceti", 0), []);
assert.deepEqual(sandhiEngine.splitAt("ceti", 4), []);
assert.throws(() => sandhiEngine.splitAt("ceti", 5), /offset/);
const vyakarana = new Vyakarana();
const dhatu = { aupadeshika: "BU", gana: "Bhvadi", prefixes: [], sanadi: [] };
const forms = vyakarana.deriveTinantas({
  dhatu,
  lakara: "Lat",
  prayoga: "Kartari",
  purusha: "Prathama",
  vacana: "Eka",
  skip_at_agama: false,
});
const derived = [
  vyakarana.deriveDhatus(dhatu),
  vyakarana.deriveSubantas({ pratipadika: { basic: "rAma" }, linga: "Pum", vibhakti: "Prathama", vacana: "Eka" }),
  vyakarana.deriveKrdantas({ dhatu, krt: "kta" }),
  vyakarana.deriveTaddhitantas({ pratipadika: { basic: "rAma" }, taddhita: "matup" }),
  vyakarana.deriveStryantas({ basic: "nara" }),
];
assert.throws(() => sandhiEngine.join("राम", "iti"), /SLP1/);
assert.throws(() => sandhiEngine.join("@", "iti"), /SLP1/);
assert.throws(() => chandas.classify("राम"), /SLP1/);
assert.throws(() => chandas.classify("@"), /SLP1/);

if (
  devanagari !== "राम" || sandhi !== "ceti" || detect("राम") !== Scheme.Devanagari ||
  metre.name !== "vasantatilakA" || !rules.length || !splits.length || sandhiEngine.join("rAman", "loke") !== "rAma~l loke" || !Array.isArray(forms) ||
  forms.length === 0 || derived.some((result) => !Array.isArray(result)) || !meterMatches.some((match) => match.name === "vasantatilakA" && match.matchType === "pada") || "Vidyut" in vidyut || "BaseKrt" in vidyut
) {
  throw new Error("The Node.js API returned an unexpected result");
}

for (const value of [chandas, sandhiEngine, vyakarana]) value.free();

console.log("Vidyut Node.js package smoke test passed");
