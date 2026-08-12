import { spawn } from "node:child_process";
import { copyFile, readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const packageDirectory = fileURLToPath(new URL(".", import.meta.url));
const path = (...segments) => resolve(packageDirectory, ...segments);
const WASM_PACK_VERSION = "0.15.0";

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: packageDirectory, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => code === 0
      ? resolvePromise()
      : reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`)));
  });
}

async function commandOutput(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: packageDirectory, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    let error = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { error += chunk; });
    child.on("error", reject);
    child.on("exit", (code) => code === 0
      ? resolvePromise(output.trim())
      : reject(new Error(`${command} ${args.join(" ")} exited with code ${code}: ${error.trim()}`)));
  });
}

const wasmPackVersion = await commandOutput("wasm-pack", ["--version"]);
if (wasmPackVersion !== `wasm-pack ${WASM_PACK_VERSION}`) {
  throw new Error(`wasm-pack ${WASM_PACK_VERSION} is required; found ${wasmPackVersion || "no version"}`);
}

await rm(path("pkg"), { recursive: true, force: true });
for (const target of ["web", "nodejs"]) {
  await run("wasm-pack", [
    "build", "--target", target, "--release",
    "--out-dir", `pkg/${target === "web" ? "browser" : "node"}`,
    "--out-name", "vidyut", "--scope", "siva-sh",
  ]);
}

const packagePath = path("pkg/package.json");
const packageJson = JSON.parse(await readFile(path("pkg/browser/package.json"), "utf8"));
const wasm = await readFile(path("pkg/browser/vidyut_bg.wasm"));
const MAX_WASM_BYTES = 1_200_000;
const MAX_GZIP_BYTES = 450_000;
const gzipBytes = gzipSync(wasm, { level: 9 }).byteLength;
if (wasm.byteLength > MAX_WASM_BYTES || gzipBytes > MAX_GZIP_BYTES) {
  throw new Error(`WASM size budget exceeded: ${wasm.byteLength} bytes raw (max ${MAX_WASM_BYTES}), ${gzipBytes} bytes gzip (max ${MAX_GZIP_BYTES})`);
}

// This is the complete supported API. Keeping generated wasm-bindgen modules private prevents
// transitive bindings from silently becoming public and avoids fragile string surgery on their d.ts.
const publicTypes = `
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
`;

for (const target of ["browser", "node"]) {
  await rename(path(`pkg/${target}/vidyut.js`), path(`pkg/${target}/vidyut-bindgen.js`));
  await rename(path(`pkg/${target}/vidyut.d.ts`), path(`pkg/${target}/vidyut-bindgen.d.ts`));
}
await writeFile(path("pkg/browser/vidyut.js"), `import generatedInit, { initSync as generatedInitSync, Chandas, Sandhi, Scheme, Vyakarana, detect, transliterate } from "./vidyut-bindgen.js";
export { Chandas, Sandhi, Scheme, Vyakarana, detect, transliterate };
let initialization;
let initialized = false;
let output;
export function initSync(options) {
  if (initialized) return output;
  if (initialization) throw new Error("Vidyut is already initializing asynchronously");
  output = generatedInitSync(options);
  initialized = true;
  return output;
}
export default function init(options) {
  if (initialized) return Promise.resolve(output);
  initialization ??= generatedInit(options)
    .then((value) => { output = value; initialized = true; return value; })
    .catch((error) => { initialization = undefined; throw error; });
  return initialization;
}
`);
await writeFile(path("pkg/node/vidyut.mjs"), `import generated from "./vidyut-bindgen.js";
const { Chandas, Sandhi, Scheme, Vyakarana, detect, transliterate } = generated;
export { Chandas, Sandhi, Scheme, Vyakarana, detect, transliterate };
`);
await writeFile(path("pkg/node/vidyut.cjs"), `const generated = require("./vidyut-bindgen.js");
const { Chandas, Sandhi, Scheme, Vyakarana, detect, transliterate } = generated;
module.exports = { Chandas, Sandhi, Scheme, Vyakarana, detect, transliterate };
`);
await writeFile(path("pkg/node/vidyut.d.mts"), publicTypes);
await writeFile(path("pkg/node/vidyut.d.cts"), publicTypes);
await writeFile(path("pkg/browser/vidyut.d.ts"), `${publicTypes}
export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;
export type SyncInitInput = BufferSource | WebAssembly.Module;
export interface InitOutput { readonly memory: WebAssembly.Memory; }
export declare function initSync(options: { module: SyncInitInput }): InitOutput;
export default function init(options?: { module_or_path: InitInput | Promise<InitInput> }): Promise<InitOutput>;
`);

await Promise.all([
  copyFile(path("LICENSE-MIT"), path("pkg/LICENSE-MIT")),
  copyFile(path("README.md"), path("pkg/README.md")),
  writeFile(path("pkg/browser/wasm-url.js"), "export default new URL(\"./vidyut_bg.wasm\", import.meta.url);\n"),
  writeFile(path("pkg/browser/wasm-url.d.ts"), "declare const wasmUrl: URL;\nexport default wasmUrl;\n"),
  rm(path("pkg/browser/.gitignore"), { force: true }),
  rm(path("pkg/node/.gitignore"), { force: true }),
]);

packageJson.name = "@siva-sh/vidyut";
packageJson.keywords = ["vidyut", "sanskrit", "transliteration", "sandhi", "chanda", "vyakarana"];
packageJson.publishConfig = { ...packageJson.publishConfig, access: "public" };
packageJson.main = "node/vidyut.mjs";
packageJson.types = "node/vidyut.d.mts";
packageJson.exports = {
  ".": {
    types: {
      import: "./node/vidyut.d.mts",
      require: "./node/vidyut.d.cts",
      node: "./node/vidyut.d.mts",
      browser: "./browser/vidyut.d.ts",
      default: "./browser/vidyut.d.ts",
    },
    browser: "./browser/vidyut.js",
    import: "./node/vidyut.mjs",
    require: "./node/vidyut.cjs",
    node: "./node/vidyut.mjs",
    default: "./browser/vidyut.js",
  },
  "./browser": { types: "./browser/vidyut.d.ts", default: "./browser/vidyut.js" },
  "./wasm-url": { types: "./browser/wasm-url.d.ts", default: "./browser/wasm-url.js" },
};
packageJson.files = ["browser", "node", "LICENSE-MIT", "README.md"];
await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
