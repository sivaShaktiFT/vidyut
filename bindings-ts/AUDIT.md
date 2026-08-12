# `bindings-ts` release verification

Verification date: 2026-08-12

## Result

No open audit findings remain. The package is ready for publication as `@siva-sh/vidyut@0.3.0`.

## Release contract

- `Chandas` embeds the checked-in 145-metre JSON catalogue and exposes `findMeters` without a
  runtime data request or TSV configuration surface.
- `Sandhi.splitAt(input, offset)` uses conventional boundary offsets: `0` is before the input and
  `input.length` is after it.
- Node.js supports both ESM `import` and CommonJS `require`; browsers use the asynchronous loader.
- Next.js Client Components use `@siva-sh/vidyut/browser` and are covered by a packed production
  deployment test.
- The published binary excludes the development panic hook. Public API failures are regular
  JavaScript errors.
- Builds require the verified `wasm-pack 0.15.0` toolchain.

## Verification performed

- `cargo test -p bindings-ts`
- `npm run build`
- Node, TypeScript, browser-loader, synchronous-loader, and Playwright browser smoke tests
- Packed-package runtime and TypeScript resolution tests for ESM Node, CommonJS Node, and browsers
- Packed Next.js 16 production build and Chromium deployment test
- `wasm-pack test --node`
- `npm pack --dry-run` inspection of `@siva-sh/vidyut@0.3.0`

`wasm-pack test --headless --chrome` remains available for hosts with chromedriver. Playwright
provides the mandatory browser coverage on this host.
