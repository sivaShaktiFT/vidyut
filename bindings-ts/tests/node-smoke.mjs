import { Chandas, Sandhi, Scheme, Vyakarana, detect, transliterate } from "../pkg/node/vidyut.js";

const devanagari = transliterate("rAma", Scheme.Slp1, Scheme.Devanagari);
const sandhi = new Sandhi().join("ca", "iti");
const chandas = new Chandas("vasantatilakA\tvrtta\tGGLGLLLGLLGLGG");
const metre = chandas.classify("mAtaH samastajagatAM maDukEwaBAreH");
const sandhiEngine = new Sandhi();
const rules = sandhiEngine.rules();
const splits = sandhiEngine.splitAt("ceti", 1);
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

if (
  devanagari !== "राम" || sandhi !== "ceti" || detect("राम") !== Scheme.Devanagari ||
  metre.name !== "vasantatilakA" || !rules.length || !splits.length || !Array.isArray(forms) ||
  forms.length === 0 || derived.some((result) => !Array.isArray(result))
) {
  throw new Error("The Node.js API returned an unexpected result");
}

for (const value of [chandas, sandhiEngine, vyakarana]) value.free();

console.log("Vidyut Node.js package smoke test passed");
