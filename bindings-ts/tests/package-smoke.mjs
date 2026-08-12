import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const root = new URL("..", import.meta.url);
const pkg = new URL("../pkg/", import.meta.url);
const consumer = await mkdtemp(join(tmpdir(), "vidyut-npm-consumer-"));

try {
  const { stdout } = await exec("npm", ["pack", "--json"], { cwd: pkg });
  const [{ filename }] = JSON.parse(stdout);
  await exec("npm", ["install", "--ignore-scripts", join(pkg.pathname, filename)], { cwd: consumer });
  await writeFile(join(consumer, "node-consumer.mts"), `
    import { Chandas, Scheme, transliterate } from "@siva-sh/vidyut";
    const matches = new Chandas().findMeters("mAtaH samastajagatAM maDukEwaBAreH");
    const output: string = transliterate("rAma", Scheme.Slp1, Scheme.Devanagari);
    void matches; void output;
  `);
  await writeFile(join(consumer, "commonjs-consumer.cts"), `
    import vidyut = require("@siva-sh/vidyut");
    const output: string = vidyut.transliterate("rAma", vidyut.Scheme.Slp1, vidyut.Scheme.Devanagari);
    void output;
  `);
  await writeFile(join(consumer, "browser-consumer.ts"), `
    import init, { Chandas, Scheme, transliterate } from "@siva-sh/vidyut/browser";
    const matches = new Chandas().findMeters("mAtaH samastajagatAM maDukEwaBAreH");
    const output: string = transliterate("rAma", Scheme.Slp1, Scheme.Devanagari);
    void init; void matches; void output;
  `);
  await writeFile(join(consumer, "tsconfig.node.json"), JSON.stringify({
    compilerOptions: { noEmit: true, strict: true, target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext" },
    files: ["node-consumer.mts", "commonjs-consumer.cts"],
  }));
  await writeFile(join(consumer, "tsconfig.browser.json"), JSON.stringify({
    compilerOptions: { noEmit: true, strict: true, target: "ES2022", module: "ESNext", moduleResolution: "Bundler" },
    files: ["browser-consumer.ts"],
  }));
  await exec("npm", ["exec", "--yes", "--package=typescript", "--", "tsc", "--project", "tsconfig.node.json"], { cwd: consumer });
  await exec("npm", ["exec", "--yes", "--package=typescript", "--", "tsc", "--project", "tsconfig.browser.json"], { cwd: consumer });
  await exec(process.execPath, ["--input-type=module", "--eval", `
    import { readFile } from "node:fs/promises";
    import { Scheme, transliterate } from "@siva-sh/vidyut";
    import init, { Scheme as BrowserScheme, transliterate as browserTransliterate } from "@siva-sh/vidyut/browser";
    import wasmUrl from "@siva-sh/vidyut/wasm-url";
    if (transliterate("rAma", Scheme.Slp1, Scheme.Devanagari) !== "राम") throw new Error("root export failed");
    await init({ module_or_path: await readFile(wasmUrl) });
    if (browserTransliterate("rAma", BrowserScheme.Slp1, BrowserScheme.Devanagari) !== "राम") throw new Error("browser export failed");
  `], { cwd: consumer });
  await exec(process.execPath, ["--conditions=browser", "--input-type=module", "--eval", `
    import { readFile } from "node:fs/promises";
    import init, { Scheme, transliterate } from "@siva-sh/vidyut";
    const wasm = await readFile(new URL("./node_modules/@siva-sh/vidyut/browser/vidyut_bg.wasm", import.meta.url));
    const output = await init({ module_or_path: wasm });
    if (!output.memory || transliterate("rAma", Scheme.Slp1, Scheme.Devanagari) !== "राम") throw new Error("browser conditional export failed");
  `], { cwd: consumer });
  await exec(process.execPath, ["--eval", `
    const { Scheme, transliterate } = require("@siva-sh/vidyut");
    if (transliterate("rAma", Scheme.Slp1, Scheme.Devanagari) !== "राम") throw new Error("CommonJS export failed");
  `], { cwd: consumer });
  console.log("Published package smoke test passed");
} finally {
  await rm(consumer, { recursive: true, force: true });
}
