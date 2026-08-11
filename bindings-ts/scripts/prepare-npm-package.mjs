import { copyFile, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const scriptDirectory = fileURLToPath(new URL(".", import.meta.url));
const packagePath = resolve(scriptDirectory, "../pkg/package.json");
const declarationPath = resolve(scriptDirectory, "../pkg/vidyut.d.ts");
const publicDeclarationPath = resolve(scriptDirectory, "../pkg/index.d.ts");
const publicModulePath = resolve(scriptDirectory, "../pkg/index.js");
const mitLicensePath = resolve(scriptDirectory, "../LICENSE-MIT");
const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
const generatedDeclarations = await readFile(declarationPath, "utf8");
const generatedModule = await readFile(resolve(scriptDirectory, "../pkg/vidyut.js"), "utf8");
const wasm = await readFile(resolve(scriptDirectory, "../pkg/vidyut_bg.wasm"));
const scheme = generatedDeclarations.match(/export enum Scheme \{[\s\S]*?^\}/m)?.[0];

if (!scheme) {
  throw new Error("wasm-pack output did not include the Scheme enum");
}

const MAX_WASM_BYTES = 1_200_000;
const MAX_GZIP_BYTES = 450_000;
const gzipBytes = gzipSync(wasm, { level: 9 }).byteLength;
if (wasm.byteLength > MAX_WASM_BYTES || gzipBytes > MAX_GZIP_BYTES) {
  throw new Error(
    `WASM size budget exceeded: ${wasm.byteLength} bytes raw (max ${MAX_WASM_BYTES}), ${gzipBytes} bytes gzip (max ${MAX_GZIP_BYTES})`,
  );
}

const hasDefaultInitializer = /export default/.test(generatedModule);
const defaultInitializer = hasDefaultInitializer
  ? "export { default } from \"./vidyut.js\";\n"
  : "";

await writeFile(
  publicModulePath,
  `${defaultInitializer}export { Chandas, Sandhi, Scheme, Vyakarana, detect, initialize, transliterate } from "./vidyut.js";\n`,
);

await writeFile(
  publicDeclarationPath,
  `/* Public, typed API for @siva-sh/vidyut. Generated from bindings-ts/scripts/prepare-npm-package.mjs. */
${hasDefaultInitializer ? "export default function init(module_or_path?: RequestInfo | URL | Response | BufferSource | WebAssembly.Module): Promise<void>;\n" : ""}
export function initialize(): void;
export function transliterate(input: string, from: Scheme, to: Scheme): string;
export function detect(input: string): Scheme;
${scheme}

export interface Akshara { text: string; weight: "G" | "L"; }
export interface Classification { name: string | null; matchType: "none" | "prefix" | "pada" | "full"; aksharas: Akshara[][]; }
export interface Classifications { names: string[]; matchTypes: Classification["matchType"][]; aksharas: Akshara[][]; }
export interface SandhiRule { first: string; second: string; result: string; }
export interface SandhiSplit { first: string; second: string; isValid: boolean; isEndOfChunk: boolean; kind: "prefix" | "standard"; }
export interface PrakriyaRule { source: string; code: string; }
export interface PrakriyaStepTerm { text: string; wasChanged: boolean; }
export interface PrakriyaStep { rule: PrakriyaRule; result: PrakriyaStepTerm[]; }
export interface Prakriya { text: string; history: PrakriyaStep[]; }

/** Grammar enums are Rust enum names, represented as strings (for example, "Bhvadi"). */
export interface DhatuArgs { aupadeshika: string; gana: string; antargana?: string; sanadi: string[]; prefixes: string[]; }
export interface UpapadaArgs { stem: string; linga: string; vibhakti: string; vacana: string; }
export type KrdantaArgs = { dhatu: DhatuArgs; lakara?: string; prayoga?: string; upapada?: UpapadaArgs; } & ({ krt: string; unadi?: never } | { unadi: string; krt?: never });
export type PratipadikaArgs =
  | { basic: string; nyap?: never; krdanta?: never; taddhitanta?: never }
  | { nyap: string; basic?: never; krdanta?: never; taddhitanta?: never }
  | { krdanta: KrdantaArgs; basic?: never; nyap?: never; taddhitanta?: never }
  | { taddhitanta: { stem: string; taddhita: string }; basic?: never; nyap?: never; krdanta?: never };
export interface SubantaArgs { pratipadika: PratipadikaArgs; linga: string; vibhakti: string; vacana: string; }
export interface TinantaArgs { dhatu: DhatuArgs; lakara: string; prayoga: string; purusha: string; vacana: string; skip_at_agama: boolean; pada?: string; }
export interface TaddhitantaArgs { pratipadika: PratipadikaArgs; taddhita: string; }

export class Chandas { constructor(metersTsv: string); free(): void; classify(text: string): Classification; classifyAll(text: string): Classifications; }
export class Sandhi { constructor(); free(): void; join(first: string, second: string): string; rules(): SandhiRule[]; splitAt(input: string, index: number): SandhiSplit[]; splitAll(input: string): SandhiSplit[]; }
export class Vyakarana { constructor(); free(): void; deriveDhatus(args: DhatuArgs): Prakriya[]; deriveSubantas(args: SubantaArgs): Prakriya[]; deriveTinantas(args: TinantaArgs): Prakriya[]; deriveKrdantas(args: KrdantaArgs): Prakriya[]; deriveTaddhitantas(args: TaddhitantaArgs): Prakriya[]; deriveStryantas(args: PratipadikaArgs): Prakriya[]; }
`,
);

await copyFile(mitLicensePath, resolve(scriptDirectory, "../pkg/LICENSE-MIT"));

packageJson.name = "@siva-sh/vidyut";
packageJson.publishConfig = {
  ...packageJson.publishConfig,
  access: "public",
};
packageJson.main = "index.js";
packageJson.types = "index.d.ts";
packageJson.exports = {
  ".": {
    types: "./index.d.ts",
    import: "./index.js",
    default: "./index.js",
  },
};
packageJson.files = [
  "vidyut_bg.wasm",
  "vidyut.js",
  "vidyut_bg.js",
  "index.js",
  "index.d.ts",
  "LICENSE-MIT",
];

await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
