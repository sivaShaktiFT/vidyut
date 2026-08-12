import { spawn } from "node:child_process";
import { copyFile, readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const packageDirectory = fileURLToPath(new URL(".", import.meta.url));
const path = (...segments) => resolve(packageDirectory, ...segments);

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: packageDirectory, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

// wasm-pack owns this directory. Starting clean prevents it from reading publication metadata
// created by a previous build and makes the package contents deterministic.
await rm(path("pkg"), { recursive: true, force: true });

for (const target of ["web", "nodejs"]) {
  await run("wasm-pack", [
    "build",
    "--target", target,
    "--release",
    "--out-dir", `pkg/${target === "web" ? "browser" : "node"}`,
    "--out-name", "vidyut",
    "--scope", "siva-sh",
  ]);
}

const packagePath = path("pkg/package.json");
const generatedPackagePath = path("pkg/browser/package.json");
const packageJson = JSON.parse(await readFile(generatedPackagePath, "utf8"));
const generatedDeclarations = await readFile(path("pkg/browser/vidyut.d.ts"), "utf8");
const wasm = await readFile(path("pkg/browser/vidyut_bg.wasm"));

const MAX_WASM_BYTES = 1_200_000;
const MAX_GZIP_BYTES = 450_000;
const gzipBytes = gzipSync(wasm, { level: 9 }).byteLength;
if (wasm.byteLength > MAX_WASM_BYTES || gzipBytes > MAX_GZIP_BYTES) {
  throw new Error(
    `WASM size budget exceeded: ${wasm.byteLength} bytes raw (max ${MAX_WASM_BYTES}), ${gzipBytes} bytes gzip (max ${MAX_GZIP_BYTES})`,
  );
}

// wasm-bindgen is the source of truth for every generated symbol. Its `JsValue` methods are
// refined using the custom TypeScript types emitted by src/lib.rs, rather than recreating the
// whole public declaration from a hand-maintained template.
function refineDeclarations(declarations) {
  return declarations
    .replace("classifyAll(text: string): any;", "classifyAll(text: string): Classifications;")
    .replace("classify(text: string): any;", "classify(text: string): Classification;")
    .replace("rules(): any;", "rules(): SandhiRule[];")
    .replace("splitAt(input: string, index: number): any;", "splitAt(input: string, index: number): SandhiSplit[];")
    .replace("splitAll(input: string): any;", "splitAll(input: string): SandhiSplit[];")
    .replaceAll("deriveDhatus(args: any): any;", "deriveDhatus(args: DhatuArgs): Prakriya[];")
    .replaceAll("deriveKrdantas(args: any): any;", "deriveKrdantas(args: KrdantaArgs): Prakriya[];")
    .replaceAll("deriveSubantas(args: any): any;", "deriveSubantas(args: SubantaArgs): Prakriya[];")
    .replaceAll("deriveTinantas(args: any): any;", "deriveTinantas(args: TinantaArgs): Prakriya[];")
    .replaceAll("deriveStryantas(args: any): any;", "deriveStryantas(args: PratipadikaArgs): Prakriya[];")
    .replaceAll("deriveTaddhitantas(args: any): any;", "deriveTaddhitantas(args: TaddhitantaArgs): Prakriya[];");
}

for (const target of ["browser", "node"]) {
  const declaration = await readFile(path(`pkg/${target}/vidyut.d.ts`), "utf8");
  await writeFile(path(`pkg/${target}/vidyut.d.ts`), refineDeclarations(declaration));
}

// Keep wasm-bindgen's loader private and expose a package-owned initializer that shares an
// in-flight initialization, preserves retryability after failures, and avoids re-finalization.
await rename(path("pkg/browser/vidyut.js"), path("pkg/browser/vidyut-bindgen.js"));
await writeFile(
  path("pkg/browser/vidyut.js"),
  `import generatedInit, { initSync as generatedInitSync } from "./vidyut-bindgen.js";
export * from "./vidyut-bindgen.js";

let initialization;
let initialized = false;

export function initSync(options) {
  if (initialized) return;
  if (initialization) throw new Error("Vidyut is already initializing asynchronously");
  generatedInitSync(options);
  initialized = true;
}

export default function init(options) {
  if (initialized) return Promise.resolve();
  initialization ??= generatedInit(options)
    .then(() => { initialized = true; })
    .catch((error) => {
      initialization = undefined;
      throw error;
    });
  return initialization;
}
`,
);

await Promise.all([
  copyFile(path("LICENSE-MIT"), path("pkg/LICENSE-MIT")),
  copyFile(path("README.md"), path("pkg/README.md")),
  writeFile(path("pkg/browser/wasm-url.js"), "export default new URL(\"./vidyut_bg.wasm\", import.meta.url);\n"),
  writeFile(path("pkg/browser/wasm-url.d.ts"), "declare const wasmUrl: URL;\nexport default wasmUrl;\n"),
  // npm honours wasm-pack's generated ignore files even for entries in `files`.
  rm(path("pkg/browser/.gitignore"), { force: true }),
  rm(path("pkg/node/.gitignore"), { force: true }),
]);

packageJson.name = "@siva-sh/vidyut";
packageJson.keywords = ["vidyut", "sanskrit", "transliteration", "sandhi", "chanda", "vyakarana"];
packageJson.publishConfig = { ...packageJson.publishConfig, access: "public" };
packageJson.main = "node/vidyut.js";
packageJson.types = "index.d.ts";
packageJson.exports = {
  ".": {
    types: { node: "./node/vidyut.d.ts", browser: "./browser/vidyut.d.ts", default: "./browser/vidyut.d.ts" },
    node: "./node/vidyut.js", browser: "./browser/vidyut.js", default: "./browser/vidyut.js",
  },
  "./browser": { types: "./browser/vidyut.d.ts", default: "./browser/vidyut.js" },
  "./wasm-url": { types: "./browser/wasm-url.d.ts", default: "./browser/wasm-url.js" },
};
packageJson.files = ["browser", "node", "LICENSE-MIT", "README.md"];
await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
