import { execFile, spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { chromium } from "@playwright/test";

const exec = promisify(execFile);
const pkg = new URL("../pkg/", import.meta.url);
const consumer = await mkdtemp(join(tmpdir(), "vidyut-nextjs-consumer-"));
const nextVersion = "16.3.0";

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForServer(url, child) {
  let lastError;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Next.js exited before serving ${url}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`Server returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for Next.js: ${lastError}`);
}

async function stop(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await new Promise((resolve) => child.once("exit", resolve));
}

let server;
try {
  const { stdout } = await exec("npm", ["pack", "--json"], { cwd: pkg });
  const [{ filename }] = JSON.parse(stdout);
  const tarball = join(pkg.pathname, filename);

  await writeFile(join(consumer, "package.json"), JSON.stringify({
    private: true,
    scripts: { build: "next build", start: "next start" },
  }, null, 2));
  await mkdir(join(consumer, "app"), { recursive: true });
  await writeFile(join(consumer, "app", "layout.js"), `export default function Layout({ children }) { return <html><body>{children}</body></html>; }\n`);
  await writeFile(join(consumer, "app", "page.js"), `"use client";
import { useEffect, useState } from "react";
import init, { Chandas, Sandhi, Scheme, transliterate } from "@siva-sh/vidyut/browser";

export default function Page() {
  const [result, setResult] = useState("loading");
  useEffect(() => {
    void Promise.all(Array.from({ length: 8 }, () => init()))
      .then(() => {
        const outputs = Array.from({ length: 50 }, () => transliterate("rAma", Scheme.Slp1, Scheme.Devanagari));
        const sandhi = new Sandhi();
        try {
          if (sandhi.join("ca", "iti") !== "ceti") throw new Error("Sandhi result mismatch");
        } finally { sandhi.free(); }
        const metres = new Chandas();
        try {
          if (!metres.findMeters("mAtaH samastajagatAM maDukEwaBAreH").some((match) => match.name === "vasantatilakA")) {
            throw new Error("Bundled metre catalogue result mismatch");
          }
        } finally { metres.free(); }
        if (outputs.some((output) => output !== "राम")) throw new Error("Transliteration result mismatch");
        setResult("Vidyut Next.js deployment smoke test passed: राम × " + outputs.length);
      })
      .catch((error) => setResult("error: " + error.message));
  }, []);
  return <output id="result">{result}</output>;
}
`);

  await exec("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--no-package-lock", `next@${nextVersion}`, "react@19.2.0", "react-dom@19.2.0", tarball], { cwd: consumer, maxBuffer: 10_000_000 });
  await exec("npm", ["run", "build"], { cwd: consumer, maxBuffer: 10_000_000 });

  const port = await availablePort();
  const url = `http://127.0.0.1:${port}`;
  server = spawn(join(consumer, "node_modules", ".bin", "next"), ["start", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: consumer, stdio: "inherit" });
  await waitForServer(url, server);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  const wasmResponses = [];
  page.on("pageerror", (error) => errors.push(error));
  page.on("console", (message) => { if (message.type() === "error") errors.push(new Error(message.text())); });
  page.on("response", (response) => { if (response.url().includes(".wasm")) wasmResponses.push(response); });
  try {
    await page.goto(url, { waitUntil: "networkidle" });
    const result = await page.locator("#result").textContent();
    if (result !== "Vidyut Next.js deployment smoke test passed: राम × 50") throw new Error(`Unexpected page result: ${result}`);
    if (wasmResponses.length !== 1 || !wasmResponses[0].ok()) throw new Error("The packaged WASM asset was not loaded exactly once");
    if (errors.length) throw new AggregateError(errors, "Next.js page emitted errors");
  } finally {
    await browser.close();
  }
  console.log("Next.js production deployment smoke test passed");
} finally {
  if (server) await stop(server);
  await rm(consumer, { recursive: true, force: true });
}
