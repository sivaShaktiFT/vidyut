import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const types = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm" };

test("the browser package initializes and reports no page errors", async ({ page }) => {
  const errors = [];
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const file = resolve(root, `.${pathname}`);
    if (!file.startsWith(root)) return response.writeHead(403).end();
    try {
      if (!(await stat(file)).isFile()) throw new Error("not a file");
      response.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
      response.end(await readFile(file));
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolveServer) => server.listen(0, "127.0.0.1", resolveServer));
  const port = server.address().port;
  page.on("pageerror", (error) => errors.push(error));
  page.on("console", (message) => { if (message.type() === "error") errors.push(new Error(message.text())); });
  try {
    await page.goto(`http://127.0.0.1:${port}/tests/web-smoke.html`);
    await expect(page.locator("#result")).toHaveText("Vidyut web package smoke test passed");
    expect(errors).toEqual([]);
  } finally {
    await new Promise((resolveServer) => server.close(resolveServer));
  }
});
