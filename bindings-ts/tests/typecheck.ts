import {
    Chandas,
    Sandhi,
    Scheme,
    Vyakarana,
    type Classification,
    type SandhiSplit,
    type TinantaArgs,
    transliterate,
} from "../pkg/vidyut.js";

const args: TinantaArgs = {
    dhatu: {
        aupadeshika: "BU",
        gana: "Bhvadi",
        prefixes: [],
        sanadi: [],
    },
    lakara: "Lat",
    prayoga: "Kartari",
    purusha: "Prathama",
    vacana: "Eka",
    skip_at_agama: false,
};

void args;
void transliterate("rAma", Scheme.Slp1, Scheme.Devanagari);

const metre: Classification = new Chandas("vasantatilakA\tvrtta\tGGLGLLLGLLGLGG").classify(
    "mAtaH samastajagatAM maDukEwaBAreH",
);
const splits: SandhiSplit[] = new Sandhi().splitAll("ceti");
const derivations = new Vyakarana().deriveTinantas(args);

void metre;
void splits;
void derivations;
