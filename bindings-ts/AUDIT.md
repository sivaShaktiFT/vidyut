# `bindings-ts` audit

Audit date: 2026-08-12

## Remediation status (2026-08-12)

Implemented the findings in this audit. The package now has an explicit public facade (rather than
re-exporting generated transitive bindings), correct initializer return values and declarations,
SLP1 validation, deterministic sandhi precedence, and stronger packed-package coverage. The
release command now includes the browser WASM suite. `wasm-pack test --headless --chrome` remains
environment-blocked on this host because chromedriver is unavailable for its target; the Playwright
Chromium package smoke test passed.

## Scope and method

Reviewed the Rust WASM boundary, generated-package build script, published-package manifest,
README examples, and test coverage. Findings marked **confirmed** were reproduced from a fresh
`npm run build` output or by exercising its Node loader. This is an audit only; no binding code
was changed.

## Findings

| # | Severity | Finding | Evidence and impact | Recommended remediation |
| --- | --- | --- | --- | --- |
| 1 | High | Browser initializer has a false return contract. | **Confirmed.** The wrapper generated at [`build.mjs:85-100`](build.mjs#L85-L100) drops the value from both `generatedInitSync` and `generatedInit`. The untouched generated declaration still promises `initSync(...): InitOutput` and `default init(...): Promise<InitOutput>`. A fresh build followed by `await init({ module_or_path: wasm })` returned `undefined`; a repeated `await init()` also returned `undefined`. Consumers that use the documented/generated `InitOutput` receive an unexpected `undefined`. | Either return and cache the generated `InitOutput`, including on repeat initialization, or rewrite the declarations to the deliberate `void` / `Promise<void>` contract. Add runtime and type tests for first, concurrent, and post-success calls. |
| 2 | High | The package exports incompatible grammar enums alongside a string-only grammar API. | **Confirmed.** wasm-bindgen exposes numeric `BaseKrt`, `Gana`, etc. through the transitive `vidyut_prakriya::wasm` bindings, while the hand-written API types require strings ([`src/lib.rs:48-79`](src/lib.rs#L48-L79)) and the README says grammar values are strings ([`README.md:145-147`](README.md#L145-L147)). `deriveKrdantas({ ..., krt: BaseKrt.kta })` fails with `invalid type: floating point \`39.0\`, expected enum BaseKrt`; passing `Gana.Bhvadi` similarly fails. The public exports actively suggest the wrong values. | Hide the legacy `Vidyut`/grammar enum exports behind a private module, or make the typed API accept the exported values and convert them. Add negative/positive smoke tests using every documented representation. |
| 3 | Medium | An undocumented second word-generator API leaks as public surface. | The emitted declaration exports `Vidyut` as well as the intended `Vyakarana`. `Vidyut` has `any`-typed derive methods and a non-idiomatic `Vidyut.init()` constructor; it bypasses the refined public contract. This contradicts the package's stated root-only typed API and makes removal a future breaking change. The leak follows from storing `vidyut_prakriya::wasm::Vidyut` in the public binding ([`src/lib.rs:352-406`](src/lib.rs#L352-L406)). | Prevent the transitive WASM exports from being linked into this package, or publish a selective JavaScript facade that exports only the supported symbols. Document any intentional compatibility API and test its contract. |
| 4 | Medium | Declaration refinement is a silent, version-sensitive text substitution. | [`refineDeclarations`](build.mjs#L54-L67) matches exact wasm-bindgen strings and never checks how many replacements occurred. A wasm-bindgen formatting, parameter-name, or return-type change silently publishes `any` methods or stale types. This is especially likely because `wasm-pack`/wasm-bindgen is invoked from PATH without a pinned tool version ([`build.mjs:25-33`](build.mjs#L25-L33)). | Generate a small declaration facade from structured source, or assert every expected replacement count and fail the build on drift. Pin and report the wasm-pack/wasm-bindgen version in CI. |
| 5 | Medium | The published manifest advertises a declaration file that is never produced or packed. | [`build.mjs:119`](build.mjs#L119) sets `types` to `index.d.ts`, but the package's `files` list only includes `browser`, `node`, and license/readme ([`build.mjs:128`](build.mjs#L128)); a fresh package contains no `index.d.ts`. Modern TypeScript resolves the `exports.types` condition, but older/non-NodeNext resolvers can follow `types` and fail. | Point `types` at an existing declaration, generate/pack an `index.d.ts` forwarding to the appropriate API, or formally declare the minimum supported TypeScript/resolution mode and test it. |
| 6 | Medium | Release tests do not test the root package in a real browser package-resolution path. | `test:package` imports `@siva-sh/vidyut/browser` in Node ([`tests/package-smoke.mjs`](tests/package-smoke.mjs)); the Playwright test serves repository files directly, rather than a packed/installable dependency. Neither verifies that a browser/bundler selects the root `exports["."].browser` branch and loads its WASM asset after npm installation. A conditional-export or package-files regression can therefore pass every release gate. | Add a temporary packed consumer with Vite/webpack (or equivalent), import the package root, and run it in a browser. Assert the browser loader and WASM asset actually load. |
| 7 | Medium | The publish gate omits browser WASM unit tests. | [`test`](package.json#L15) runs `test:wasm` (Node) but not `test:wasm:browser`, despite defining the latter at [`package.json:13`](package.json#L13). `publish:npm` delegates to this incomplete test command. The package browser smoke test is useful but does not execute the wasm-bindgen browser test suite. | Include `npm run test:wasm:browser` in the release/CI gate, or document and enforce an equivalent mandatory CI job. |
| 8 | Low | `Sandhi.join` silently accepts non-SLP1 input while the splitting methods reject it. | `splitAt` and `splitAll` explicitly reject non-ASCII input ([`src/lib.rs:318-341`](src/lib.rs#L318-L341)); `join` is documented as SLP1 but performs no equivalent check ([`src/lib.rs:278-296`](src/lib.rs#L278-L296)). For example, a Devanagari first word simply bypasses most rules and is concatenated. This inconsistency makes invalid input look like a valid no-rule result. | Validate both join inputs as SLP1/ASCII and return `Result<String, JsError>`, or document that join deliberately accepts arbitrary text and define its fallback semantics. |
| 9 | Low | `Sandhi.join` discards equally-specific rule alternatives without a documented tie-break. | The implementation uses `max_by_key` solely on combined input length ([`src/lib.rs:283-287`](src/lib.rs#L283-L287)). The generated rules contain two conflicting equal-specificity pairs: `n + l` (`~l l` vs `Ml l`) and `n + S` (`Y S` vs `c C`). The current generation order decides the output, so a rule reordering can alter transliteration results with no API change. | Specify a linguistic precedence and encode it, or expose all equally best joins. Add regression tests for the ambiguous pairs. |
| 10 | Low | The React example can produce an unhandled rejection and frees an object after an abandoned render without reporting the error. | The effect starts `void loadVidyut().then(...)` with no rejection handler ([`README.md:91-103`](README.md#L91-L103)). A failed WASM fetch/initialization becomes an unhandled promise rejection; retry behavior described earlier is not surfaced to the component. | Add `.catch` that respects cancellation and stores/report errors, or use an async effect helper with explicit error state. |
| 11 | Low | SLP1 validation is inconsistent across text APIs. | `Chandas.classify`/`classifyAll` are documented as SLP1 ([`src/lib.rs:180-193`](src/lib.rs#L180-L193)), but forward arbitrary text without validation. The underlying scanner ignores non-SLP1 characters, so Devanagari or mixed input can return a plausible-looking empty/no-match result rather than a caller-visible error. | Validate SLP1 before classification, or change the API/documentation to explicitly describe the permissive scanner behavior. |

## Verification performed

- `npm run build` completed and produced browser and Node loaders. It emitted pre-existing warnings
  in `vidyut-lipi` and `vidyut-prakriya`; none were introduced by this audit.
- `npm run test:types` passed.
- `npm run test:package` passed.
- Direct browser-loader probe confirmed that both the first and repeat `init()` resolve to
  `undefined` despite the generated `Promise<InitOutput>` declaration.
- Direct Node-loader probes confirmed that `BaseKrt.kta` and `Gana.Bhvadi` fail when passed to
  the corresponding `Vyakarana` methods, while their documented string equivalents work.
- Enumerating `Sandhi.rules()` found 1,468 rules and the two conflicting equal-specificity pairs
  cited above.

## Priority order

Fix 1 and 2 before publishing: they are confirmed type/runtime contract violations. Fix 3-7 in
the same release-hardening pass, because they either expand the unintended semver surface or can
let the next package regression escape. Items 8-11 are API-consistency and developer-experience
issues that should receive explicit behavior and regression tests.
