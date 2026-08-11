# TypeScript bindings audit

Audit date: 2026-08-11

Scope: the newly added `bindings-ts` wrapper, its generated npm artefact, documentation, and
the `vidyut-prakriya` WASM API that the wrapper exposes. This is a findings report, not a patch;
pre-existing workspace changes were not modified.

## Summary

The crate builds and the two narrow WASM tests pass, but the package is not ready to publish as a
reliably typed browser API. The most serious problems are that malformed but type-valid grammar
arguments can permanently trap the WASM instance, and that the advertised TypeScript contracts
are not connected to any exported method signatures.

| Severity | Finding |
| --- | --- |
| Critical | Partial `KrdantaArgs.upapada` traps the whole WASM instance. |
| High | Invalid `PratipadikaArgs` can silently generate forms of `doza`; other invalid forms trap. |
| High | The generated API is `any` at every JSON boundary, so the claimed TypeScript API and its test provide no protection. |
| High | The default documented `web` build is used before WASM initialization and fails at runtime. |
| Medium | The published surface exposes incompatible numeric Rust enums next to string-based grammar arguments. |
| Medium | Error handling returns `[]` and logs to the console, conflating invalid input with a valid empty derivation. |
| Medium | `splitAll` crosses whitespace and returns analyses that are not within an SLP1 chunk. |
| Medium | Release-size settings are ignored in this workspace; the generated WASM is 1.3 MiB. |
| Low | Package licensing metadata and shipped license files disagree. |

## Findings

### Critical — partial `upapada` arguments cause an unrecoverable WASM trap

`KrdantaArgs.upapada` declares all of `stem`, `linga`, `vibhakti`, and `vacana` as optional in
the custom TypeScript section. When `stem` is present, the underlying conversion unconditionally
unwraps the other three fields (`vidyut-prakriya/src/wasm.rs:245-256`). Thus this value satisfies
the declared TS type but aborts the instance:

```ts
new Vyakarana().deriveKrdantas({
  dhatu: { aupadeshika: "BU", gana: "Bhvadi", sanadi: [], prefixes: [] },
  krt: "kta",
  upapada: { stem: "rAma" },
});
// RuntimeError: unreachable
// panicked at vidyut-prakriya/src/wasm.rs:247:38: called `Option::unwrap()` on a `None` value
```

In WASM, a Rust panic leaves the module unusable for the remainder of the page/session. Make
`upapada` a discriminated union (`undefined` or an object with all four required fields), validate
it before forwarding, and replace every `unwrap`/`expect` on caller data in the downstream WASM
adapter with a returned JS error.

### High — invalid `PratipadikaArgs` can return a plausible but unrelated word

`PratipadikaArgs` is advertised as a one-of union, but the forwarded adapter treats an invalid
combination as the literal basic stem `"doza"` (`vidyut-prakriya/src/wasm.rs:267-295`). For
example, this invalid argument returns a derivation whose text is `dozaH`:

```ts
new Vyakarana().deriveSubantas({
  pratipadika: { basic: "rAma", nyap: "nadI" },
  linga: "Pum", vibhakti: "Prathama", vacana: "Eka",
});
```

The TypeScript union catches this only if callers actually receive a typed parameter (they do not;
see the next finding), and untyped JavaScript remains affected. This is worse than an empty result
because it looks like a successful derivation. Reject zero-or-many variants explicitly. The same
file additionally uses `expect("ok")` for `nyap` and nested `taddhitanta.stem`; invalid SLP1 such
as `"@"` traps rather than producing a recoverable validation error.

### High — declared input/output types are detached from the actual API

The custom section declares `Classification`, `SandhiSplit`, `TinantaArgs`, and related types, but
all of the relevant generated signatures are `any`:

```ts
class Chandas { classify(text: string): any; classifyAll(text: string): any }
class Sandhi { rules(): any; splitAt(input: string, index: number): any; splitAll(input: string): any }
class Vyakarana { deriveTinantas(args: any): any /* and all other derivations */ }
```

This is visible in the generated `pkg/vidyut.d.ts`. Consequently, `tests/typecheck.ts` passes by
assigning `any` to `Classification` and `SandhiSplit[]`; it does not test the public type contract.

Export typed JavaScript facade functions/classes (or a hand-authored `.d.ts` merged after
wasm-bindgen) so parameters and returns use the declared interfaces. Add negative tests with
`@ts-expect-error` for malformed input and positive checks that method returns infer as the named
types. Use literal unions for the grammar enum spellings, rather than broad `string`, if generating
the complete vocabulary is practical.

### High — README's primary usage path invokes uninitialized WebAssembly

`npm run build` produces `wasm-pack --target web`, whose module exports an asynchronous default
initializer. The README's example imports named exports and immediately calls constructors; it
never calls `await init()`. Running the generated web artifact exactly that way gives:

```text
Cannot read properties of undefined (reading '__wbindgen_malloc')
```

The default initializer also cannot load a local `file:` URL in Node, which makes the current
default artifact unsuitable for the README's documented Node-adjacent verification story. Either
make `build:bundler` the documented/package default for bundlers, or show `import init, { ... }`
followed by `await init()` before every use. Test that exact README snippet in a real browser build.

### Medium — numeric exported enums are incompatible with the documented argument protocol

Because `vidyut-prakriya`'s WASM module is linked in, the package exports `Gana`, `Lakara`,
`Prayoga`, `Purusha`, etc. as numeric wasm-bindgen enums, while the forwarded serde API accepts
Rust enum *names* as strings. The README correctly uses strings, but a natural typed call using
the exported enum fails silently:

```ts
new Vyakarana().deriveTinantas({
  dhatu: { aupadeshika: "BU", gana: Gana.Bhvadi, sanadi: [], prefixes: [] },
  lakara: Lakara.Lat, prayoga: Prayoga.Kartari,
  purusha: Purusha.Prathama, vacana: Vacana.Eka, skip_at_agama: false,
});
// logs a serde parse error and returns []
```

Do not expose the legacy `Vidyut`/numeric-enum surface from this package, or change the facade to
accept those values consistently. The public declaration should make the accepted representation
unambiguous.

### Medium — caller errors are indistinguishable from valid empty results

Every forwarded grammar method returns `JsValue`, and parse/conversion failures in the underlying
adapter are caught, logged to `console.error`, then converted to `[]`. A typo in a mandatory enum,
invalid SLP1 in the `basic` path, and a derivation that genuinely has no forms are therefore
indistinguishable to application code. Console-only diagnostics are particularly unsuitable for a
library API and do not work well in workers or production telemetry.

Have the wrapper return `Result<JsValue, JsError>` and throw a descriptive `Error`, or adopt an
explicit `{ ok: true, value } | { ok: false, error }` result. Preserve an empty array only for a
successful derivation with no results.

### Medium — `splitAll` returns cross-chunk prefix noise

The wrapper implements `splitAll` by invoking `split_at` at every byte index
(`bindings-ts/src/lib.rs:337-343`), including spaces. For `"ca iti"` it returns prefixes such as
`{ first: "ca ", second: "iti", kind: "prefix" }` and `{ first: "ca i", second: "ti" }`.
Those are not splits inside an SLP1 chunk. The native `Splitter::split_all` explicitly stops at the
first non-Sanskrit character for this reason.

Either use the native behavior, skip non-SLP1 positions and start a separate analysis for each
chunk, or document and model the method as arbitrary string slicing. The current documentation
promises "every SLP1 boundary", which these whitespace indices are not.

### Medium — release-size configuration is ineffective

`bindings-ts/Cargo.toml` specifies `[profile.release] opt-level = "s"`, but Cargo emits:

```text
profiles for the non root package will be ignored, specify profiles at the workspace root
```

The workspace root instead sets `debug = 2` and `incremental = true` for release builds. The
generated optimized `pkg/vidyut_bg.wasm` is 1.3 MiB. The binding crate's comment promising a
small deployment binary is therefore inaccurate. Move the relevant release profile policy to the
workspace root (and decide deliberately whether release debug information is publishable), then
set and test a compressed and uncompressed size budget.

### Low — published license file conflicts with package metadata

The Cargo package declares `license = "MIT"`, but `bindings-ts` contains and wasm-pack publishes
only `LICENSE-APACHE`; the generated npm `files` list likewise omits an MIT license. Either ship
the MIT license and retain `MIT`, or update the declared license/SPDX expression to the intended
terms. This should be fixed before a public npm release.

## Verification performed

- `cargo check -p bindings-ts` — passes (with the ignored-profile warning).
- `npm run build`, `npm run build:bundler`, and `npm run test:types` — complete.
- `wasm-pack test --node` — 2 tests pass; they cover only transliteration and forward sandhi.
- Executed the bundler artifact in Node to reproduce the `upapada` trap, `dozaH` fallback,
  whitespace `splitAll` results, and numeric-enum parse failure.

The current tests do not cover initialization, typed method signatures, invalid grammar objects,
or the grammar methods' successful and failing runtime paths.
