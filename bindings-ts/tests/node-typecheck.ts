import { Chandas, Sandhi, Scheme, Vyakarana, detect, transliterate } from "../pkg/node/vidyut.mjs";

void detect("rAma");
void transliterate("rAma", Scheme.Slp1, Scheme.Devanagari);
new Chandas().classify("mAtaH samastajagatAM maDukEwaBAreH");
new Sandhi().splitAll("ceti");
new Vyakarana().deriveTinantas({
  dhatu: { aupadeshika: "BU", gana: "Bhvadi", prefixes: [], sanadi: [] },
  lakara: "Lat", prayoga: "Kartari", purusha: "Prathama", vacana: "Eka", skip_at_agama: false,
});

// @ts-expect-error Node's synchronous wasm-pack loader has no browser initializer.
void import("../pkg/node/vidyut.mjs").then(({ default: init }) => init());
