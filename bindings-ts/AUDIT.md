# TypeScript bindings audit

Audit date: 2026-08-11

Scope: `bindings-ts`, its npm packaging script, the generated `pkg/` artefact, and the
`vidyut-prakriya` WASM adapter it exposes.

## Result

All findings from the prior audit are fixed in the current worktree:

| Previous finding | Resolution |
| --- | --- |
| Ambiguous `KrdantaArgs` suffix selector | `KrdantaArgs` is now an exclusive union, and the Rust adapter rejects zero or two selectors for JavaScript callers. |
| Untyped deep import of an internal module | The generated package now has a root-only `exports` map. |
| No browser execution of the web package | `tests/web-smoke.html` exercises the built web package after its asynchronous initializer; `npm run test:web:manual` builds and serves it for browser execution. |

The README has also been narrowed to a client-side React integration guide. It initializes
WebAssembly once from `useEffect`, which avoids SSR and React Strict Mode issues.

## Verification performed

- `cargo fmt --check`
- `npm run build`
- `npm run test:types`
- `cargo test -p bindings-ts` — 4 tests pass.
- `wasm-pack test --node` — 3 tests pass, including rejection of conflicting `krt` and `unadi`
  selectors without poisoning the WASM instance.
- `(cd pkg && npm pack --dry-run --json)` — passes; the tarball contains the root API, README,
  MIT licence, and WebAssembly artefact.
- Chromium smoke test against `tests/web-smoke.html` — passed after loading the built default web
  target over HTTP. It awaited `init()` and verified transliteration, sandhi, and a `Vyakarana`
  derivation.

The workspace still emits pre-existing warnings from `vidyut-lipi` and `vidyut-prakriya`; none
originate in `bindings-ts`.
