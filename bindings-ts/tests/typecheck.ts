import {
    Chandas,
    Sandhi,
    Scheme,
    Vyakarana,
    initSync,
    type Classification,
    type MeterMatch,
    type SandhiSplit,
    type TinantaArgs,
    transliterate,
    type Prakriya,
} from "../pkg/browser/vidyut.js";

const wasmBytes = new Uint8Array();
const syncOutput = initSync({ module: wasmBytes });
// @ts-expect-error synchronous initialization needs bytes or a compiled module.
initSync({ module: new URL("vidyut_bg.wasm", import.meta.url) });

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

const metre: Classification = new Chandas().classify(
    "mAtaH samastajagatAM maDukEwaBAreH",
);
const splits: SandhiSplit[] = new Sandhi().splitAll("ceti");
const bundledMeterMatches: MeterMatch[] = new Chandas().findMeters("mAtaH samastajagatAM maDukEwaBAreH");
const derivations = new Vyakarana().deriveTinantas(args);
const typedDerivations: Prakriya[] = derivations;

new Vyakarana().deriveKrdantas({
    dhatu: args.dhatu,
    krt: "kta",
    upapada: { stem: "rAma", linga: "Pum", vibhakti: "Prathama", vacana: "Eka" },
});

// @ts-expect-error a krdanta must select exactly one suffix family.
new Vyakarana().deriveKrdantas({ dhatu: args.dhatu });
// @ts-expect-error krt and unadi cannot be selected together.
new Vyakarana().deriveKrdantas({ dhatu: args.dhatu, krt: "kta", unadi: "YuR" });
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
void bundledMeterMatches;
void derivations;
void typedDerivations;
void syncOutput.memory;
