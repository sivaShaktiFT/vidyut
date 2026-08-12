import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
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
  await exec(process.execPath, ["--input-type=module", "--eval", `
    import { readFile } from "node:fs/promises";
    import { Scheme, transliterate } from "@siva-sh/vidyut";
    import init, { Scheme as BrowserScheme, transliterate as browserTransliterate } from "@siva-sh/vidyut/browser";
    import wasmUrl from "@siva-sh/vidyut/wasm-url";
    if (transliterate("rAma", Scheme.Slp1, Scheme.Devanagari) !== "राम") throw new Error("root export failed");
    await init({ module_or_path: await readFile(wasmUrl) });
    if (browserTransliterate("rAma", BrowserScheme.Slp1, BrowserScheme.Devanagari) !== "राम") throw new Error("browser export failed");
  `], { cwd: consumer });
  console.log("Published package smoke test passed");
} finally {
  await rm(consumer, { recursive: true, force: true });
}
