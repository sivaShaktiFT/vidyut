import { Sandhi, Scheme, Vyakarana, transliterate } from "../pkg/node/vidyut.js";

const devanagari = transliterate("rAma", Scheme.Slp1, Scheme.Devanagari);
const sandhi = new Sandhi().join("ca", "iti");
const forms = new Vyakarana().deriveTinantas({
  dhatu: { aupadeshika: "BU", gana: "Bhvadi", prefixes: [], sanadi: [] },
  lakara: "Lat",
  prayoga: "Kartari",
  purusha: "Prathama",
  vacana: "Eka",
  skip_at_agama: false,
});

if (devanagari !== "राम" || sandhi !== "ceti" || !Array.isArray(forms) || forms.length === 0) {
  throw new Error("The Node.js API returned an unexpected result");
}

console.log("Vidyut Node.js package smoke test passed");
