import { spawn } from "node:child_process";
import { copyFile, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const packageDirectory = fileURLToPath(new URL(".", import.meta.url));
const path = (...segments) => resolve(packageDirectory, ...segments);
const WASM_PACK_VERSION = "0.15.0";

const facadeSource = `import generatedInit, { initSync as generatedInitSync, Chandas, Sandhi, Scheme, Vyakarana, detect, transliterate } from "./vidyut-bindgen.js";
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
`;

function declarationSource(publicTypes) {
  return `${publicTypes}
export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;
export type SyncInitInput = BufferSource | WebAssembly.Module;
export interface InitOutput { readonly memory: WebAssembly.Memory; }
export declare function initSync(options: { module: SyncInitInput }): InitOutput;
export default function init(options?: { module_or_path: InitInput | Promise<InitInput> }): Promise<InitOutput>;
`;
}

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

// Build in a sibling staging directory, then replace `pkg` only after every generated file is
// complete. This leaves a usable previous package behind if wasm-pack, size checks, or package
// assembly fails, and keeps the final rename on the same filesystem.
const stagingDirectory = await mkdtemp(path(".pkg-build-"));
const stagingPath = (...segments) => resolve(stagingDirectory, ...segments);

try {
  await run("wasm-pack", [
    "build", "--target", "web", "--release",
    "--out-dir", stagingPath("browser"), "--out-name", "vidyut", "--scope", "siva-sh",
  ]);

  const packagePath = stagingPath("package.json");
  const browserPath = (...segments) => stagingPath("browser", ...segments);
  const packageJson = JSON.parse(await readFile(browserPath("package.json"), "utf8"));
  const wasm = await readFile(browserPath("vidyut_bg.wasm"));
  const MAX_WASM_BYTES = 1_200_000;
  const MAX_GZIP_BYTES = 450_000;
  const gzipBytes = gzipSync(wasm, { level: 9 }).byteLength;
  if (wasm.byteLength > MAX_WASM_BYTES || gzipBytes > MAX_GZIP_BYTES) {
    throw new Error(`WASM size budget exceeded: ${wasm.byteLength} bytes raw (max ${MAX_WASM_BYTES}), ${gzipBytes} bytes gzip (max ${MAX_GZIP_BYTES})`);
  }

  // This is the complete supported API. Keeping generated wasm-bindgen modules private prevents
  // transitive bindings from silently becoming public. `api.d.ts` is the single source of truth.
  const publicTypes = await readFile(path("api.d.ts"), "utf8");
  await Promise.all([
    rename(browserPath("vidyut.js"), browserPath("vidyut-bindgen.js")),
    rename(browserPath("vidyut.d.ts"), browserPath("vidyut-bindgen.d.ts")),
  ]);
  await Promise.all([
    copyFile(path("LICENSE-MIT"), stagingPath("LICENSE-MIT")),
    copyFile(path("README.md"), stagingPath("README.md")),
    writeFile(browserPath("vidyut.js"), facadeSource),
    writeFile(browserPath("vidyut.d.ts"), declarationSource(publicTypes)),
    writeFile(browserPath("wasm-url.js"), "export default new URL(\"./vidyut_bg.wasm\", import.meta.url);\n"),
    writeFile(browserPath("wasm-url.d.ts"), "declare const wasmUrl: URL;\nexport default wasmUrl;\n"),
    rm(browserPath(".gitignore"), { force: true }),
    rm(browserPath("package.json"), { force: true }),
    rm(browserPath("README.md"), { force: true }),
    rm(browserPath("LICENSE-APACHE"), { force: true }),
    rm(browserPath("LICENSE-MIT"), { force: true }),
    rm(browserPath("vidyut_bg.wasm.d.ts"), { force: true }),
  ]);

  packageJson.name = "@siva-sh/vidyut";
  packageJson.keywords = ["vidyut", "sanskrit", "transliteration", "sandhi", "chanda", "vyakarana"];
  packageJson.publishConfig = { ...packageJson.publishConfig, access: "public" };
  packageJson.main = "browser/vidyut.js";
  packageJson.types = "browser/vidyut.d.ts";
  packageJson.exports = {
    ".": { types: "./browser/vidyut.d.ts", default: "./browser/vidyut.js" },
    "./browser": { types: "./browser/vidyut.d.ts", default: "./browser/vidyut.js" },
    "./wasm-url": { types: "./browser/wasm-url.d.ts", default: "./browser/wasm-url.js" },
  };
  packageJson.files = ["browser", "LICENSE-MIT", "README.md"];
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

  await rm(path("pkg"), { recursive: true, force: true });
  await rename(stagingDirectory, path("pkg"));
} catch (error) {
  await rm(stagingDirectory, { recursive: true, force: true });
  throw error;
}
