export { Scheme } from "./vidyut-bindgen.js";

export interface Akshara { text: string; weight: "G" | "L"; }
export interface Classification { name: string | null; matchType: "none" | "prefix" | "pada" | "full"; aksharas: Akshara[][]; }
export interface Classifications { names: string[]; matchTypes: Classification["matchType"][]; aksharas: Akshara[][]; }
export interface MeterMatch { name: string; matchType: Classification["matchType"]; }
export interface SandhiRule { first: string; second: string; result: string; }
export interface SandhiSplit { first: string; second: string; isValid: boolean; isEndOfChunk: boolean; kind: "prefix" | "standard"; }
export interface PrakriyaRule { source: string; code: string; }
export interface PrakriyaStepTerm { text: string; wasChanged: boolean; }
export interface PrakriyaStep { rule: PrakriyaRule; result: PrakriyaStepTerm[]; }
export interface Prakriya { text: string; history: PrakriyaStep[]; }
export interface DhatuArgs { aupadeshika: string; gana: string; antargana?: string; sanadi: string[]; prefixes: string[]; }
export type KrdantaArgs = { dhatu: DhatuArgs; lakara?: string; prayoga?: string; upapada?: { stem: string; linga: string; vibhakti: string; vacana: string }; } & ({ krt: string; unadi?: never } | { unadi: string; krt?: never });
export type PratipadikaArgs = { basic: string; nyap?: never; krdanta?: never; taddhitanta?: never } | { nyap: string; basic?: never; krdanta?: never; taddhitanta?: never } | { krdanta: KrdantaArgs; basic?: never; nyap?: never; taddhitanta?: never } | { taddhitanta: { stem: string; taddhita: string }; basic?: never; nyap?: never; krdanta?: never };
export interface SubantaArgs { pratipadika: PratipadikaArgs; linga: string; vibhakti: string; vacana: string; }
export interface TinantaArgs { dhatu: DhatuArgs; lakara: string; prayoga: string; purusha: string; vacana: string; skip_at_agama: boolean; pada?: string; }
export interface TaddhitantaArgs { pratipadika: PratipadikaArgs; taddhita: string; }

export declare function transliterate(input: string, from: import("./vidyut-bindgen.js").Scheme, to: import("./vidyut-bindgen.js").Scheme): string;
export declare function detect(input: string): import("./vidyut-bindgen.js").Scheme;
export declare class Chandas { constructor(); free(): void; classify(text: string): Classification; classifyAll(text: string): Classifications; findMeters(text: string): MeterMatch[]; }
export declare class Sandhi { constructor(); free(): void; join(first: string, second: string): string; rules(): SandhiRule[]; splitAt(input: string, index: number): SandhiSplit[]; splitAll(input: string): SandhiSplit[]; }
export declare class Vyakarana { constructor(); free(): void; deriveDhatus(args: DhatuArgs): Prakriya[]; deriveSubantas(args: SubantaArgs): Prakriya[]; deriveTinantas(args: TinantaArgs): Prakriya[]; deriveKrdantas(args: KrdantaArgs): Prakriya[]; deriveTaddhitantas(args: TaddhitantaArgs): Prakriya[]; deriveStryantas(args: PratipadikaArgs): Prakriya[]; }
