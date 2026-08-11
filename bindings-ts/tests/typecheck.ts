import {
    Chandas,
    Sandhi,
    Scheme,
    Vyakarana,
    type Classification,
    type SandhiSplit,
    type TinantaArgs,
    transliterate,
    type Prakriya,
} from "../pkg/index.js";

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
const typedDerivations: Prakriya[] = derivations;

new Vyakarana().deriveKrdantas({
    dhatu: args.dhatu,
    krt: "kta",
    upapada: { stem: "rAma", linga: "Pum", vibhakti: "Prathama", vacana: "Eka" },
});

// @ts-expect-error upapada must be complete so it can never trigger a WASM panic.
new Vyakarana().deriveKrdantas({ dhatu: args.dhatu, krt: "kta", upapada: { stem: "rAma" } });
new Vyakarana().deriveSubantas({
    // @ts-expect-error a pratipadika has exactly one variant.
    pratipadika: { basic: "rAma", nyap: "nadI" },
    linga: "Pum",
    vibhakti: "Prathama",
    vacana: "Eka",
});

void metre;
void splits;
void derivations;
void typedDerivations;
