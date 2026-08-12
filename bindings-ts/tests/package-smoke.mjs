import { execFile } from "node:child_process";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const root = new URL("..", import.meta.url);
const pkg = new URL("../pkg/", import.meta.url);
const consumer = await mkdtemp(join(tmpdir(), "vidyut-npm-consumer-"));

try {
  const artifact = await readFile(new URL("../pkg/browser/vidyut_bg.wasm", import.meta.url));
  assert.ok(!new TextDecoder().decode(artifact).includes("console_error_panic_hook"), "production WASM must not ship the development panic hook");
  const { stdout } = await exec("npm", ["pack", "--json"], { cwd: pkg });
  const [{ filename }] = JSON.parse(stdout);
  await exec("npm", ["install", "--ignore-scripts", join(pkg.pathname, filename)], { cwd: consumer });
  await writeFile(join(consumer, "root-browser-consumer.ts"), `
    import init, { Chandas, Scheme, transliterate } from "@siva-sh/vidyut";
    const matches = new Chandas().findMeters("mAtaH samastajagatAM maDukEwaBAreH");
    const output: string = transliterate("rAma", Scheme.Slp1, Scheme.Devanagari);
    void init; void matches; void output;
  `);
  await writeFile(join(consumer, "browser-consumer.ts"), `
    import init, { Chandas, Scheme, transliterate } from "@siva-sh/vidyut/browser";
    const matches = new Chandas().findMeters("mAtaH samastajagatAM maDukEwaBAreH");
    const output: string = transliterate("rAma", Scheme.Slp1, Scheme.Devanagari);
    void init; void matches; void output;
  `);
  await writeFile(join(consumer, "tsconfig.browser.json"), JSON.stringify({
    compilerOptions: { noEmit: true, strict: true, target: "ES2022", module: "ESNext", moduleResolution: "Bundler" },
    files: ["root-browser-consumer.ts", "browser-consumer.ts"],
  }));
  await exec("npm", ["exec", "--yes", "--package=typescript", "--", "tsc", "--project", "tsconfig.browser.json"], { cwd: consumer });
  await exec(process.execPath, ["--input-type=module", "--eval", `
    import { readFile } from "node:fs/promises";
    import init, { Scheme, transliterate } from "@siva-sh/vidyut";
    import wasmUrl from "@siva-sh/vidyut/wasm-url";
    await init({ module_or_path: await readFile(wasmUrl) });
    if (transliterate("rAma", Scheme.Slp1, Scheme.Devanagari) !== "राम") throw new Error("root browser export failed");
  `], { cwd: consumer });
  console.log("Published package smoke test passed");
} finally {
  await rm(consumer, { recursive: true, force: true });
}
