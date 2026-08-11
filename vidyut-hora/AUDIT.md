# Source implementation audit

Audited: 2026-08-11  
Package: `@vidyut-hora/panchanga`  
Scope: the five URLs in [`sources.md`](sources.md)

## Current assessment

The calculation coverage is broad: the package now implements the deployed Panchanga limb/rise-set paths, source observances, local-time ephemeris annotations, source-specific natal Raman calculations, vargas, karakas, and Vimshottari helpers. It is a useful headless core, but it still has **release-significant reliability and verification gaps**.

The highest-priority issues are an unverified “source-compatible” fixture, a process-global `fetch` override during Node initialization, and a mandatory external ephemeris download at runtime. The prior audit is superseded; resolved work is summarised below rather than retained as open findings.

## Method

- Re-read the five public source pages and the shared `panchanga-today-widget.js?v=20260728-newage1` loaded by [Monthly Panchanga](https://www.astrologicalmagazine.com/monthly-panchanga.html) and [Daily Panchanga](https://www.astrologicalmagazine.com/panchanga.html).
- Cross-checked the current code against [Vedic Ephemeris](https://www.astrologicalmagazine.com/ephemeris.html), [Default Horoscopes](https://www.astrologicalmagazine.com/horoscope_embed_project/default_charts.html), and [Atmakaraka Calculator](https://www.astrologicalmagazine.com/horoscope_embed_project/atmakaraka.html).
- Reviewed `src/index.ts`, the observance catalogue, README, and all eight tests.
- Ran `npm test`, `npm run typecheck`, and `npm run build` successfully. The Node fixture downloads Swiss Ephemeris files from the dependency's CDN during test execution.

Status: **match in code** means the same inspected source rule is represented; it is not a numerical comparison with values obtained from the remote rendered page.

## Open issues

| Severity | Area | Finding | Impact | Recommended action |
| --- | --- | --- | --- | --- |
| High | Parity evidence | The Bengaluru “source-compatible” fixture records values produced by this package, not values captured from a cited page or an independent source harness. The remaining seven tests are mostly pure primitives. | A shared implementation bug or an incorrect interpretation of the source can be frozen as the expected result. The `match in code` claims are not proof of page-output parity. | Capture golden output from the cited tools (or execute their fetched calculation code in an isolated harness) for Panchanga, ephemeris, natal chart, and Atmakaraka. Cover 10+ locations/dates, boundaries, DST, and high latitudes. |
| High | Node initialization safety | `initialiseSwissEphemeris()` temporarily replaces **global** `fetch` to make `file:` WASM loading work. Concurrent calculator initialization or any unrelated request in the same Node process can observe the patched fetch. | This is a process-wide race and can alter an application's network behaviour. It is especially risky in web servers and worker pools. | Move Node loading to a separate Node entry point or use a dependency-supported WASM loader/`locateFile` callback that does not mutate globals. Add a concurrent-initialization test. |
| High | Runtime availability | Every `PanchangaCalculator.create()` calls `swe_set_ephe_path()` with the dependency default, which downloads ephemeris files from an external CDN. No API supplies local files, a self-hosted URL, or an offline mode. | Production calculations and tests fail when the CDN is unavailable, blocked by CSP/firewall, rate-limited, or changes files. Results are not fully reproducible from the package alone. | Accept explicit ephemeris URL/file configuration, document/cache the required files, and add an offline Node integration test. Pin or checksum source data where the dependency permits it. |
| Medium | Time-zone precedence | When `Location` provides both `timeZone` and `utcOffset`, JD conversion uses `timeZone` but the source-compatible rise/set fallback calls `offset()`, which prefers `utcOffset`. For a named zone alone, `offset()` derives the offset for **now**, not the requested date. | A fallback event can use a different offset from the date calculation, particularly for historical/future DST dates. The API silently permits contradictory inputs. | Reject locations that specify both forms, or define one explicit precedence. Resolve the IANA offset for the requested civil date/time and pass it through every fallback path. |
| Medium | Fallback provenance | `source-altitude` can return crude solar or Moon-elongation rise/set estimates, but `Panchanga.sunrise`, `sunset`, `moonrise`, and `moonset` do not indicate that they are approximations. `bounded` only applies to limb transitions. | Consumers can display or make decisions on estimated celestial events as if they were calculated crossings. | Return event metadata such as `{ instant, method: 'altitude' | 'swiss' | 'approximation' }`, or make approximations opt-in. |
| Medium | Input validation | `BirthTime.hour`/minute/second, `localEphemeris.localHour`, `ephemeris.hourUtc`, and `lunarMonthRange()` inputs are not consistently range-validated. Fractional/overflow values are normalised by `Date` or accepted by Julian-day arithmetic. | Invalid UI/API input can silently calculate a different date/time. This differs from the bounded select/input controls on the cited tools. | Validate civil date, time fields, and sample hours at every public entry point; add boundary and invalid-input tests. |
| Medium | Browser compatibility | The main browser-facing module contains a literal dynamic import of `node:fs/promises`, guarded only at runtime. No browser bundle/smoke test exists. | Some browser bundlers resolve dynamic imports statically and can fail builds or include a Node-only dependency. This is directly relevant because the cited tools are browser applications. | Split Node support into a conditional export and test a browser build/import. Keep the default browser entry free of Node specifiers. |
| Medium | Source page feature gaps | `calculate()` still omits limb progress percentages and a 60-day upcoming-festival helper. The chart API has no source yoga catalogue, instant birth-Panchanga panel, Dina Viṣaya calculation, received-aspect/grouped-varga helpers, or current-dasha selection. | The package remains a partial replacement for [Daily Panchanga](https://www.astrologicalmagazine.com/panchanga.html) and [Default Horoscopes](https://www.astrologicalmagazine.com/horoscope_embed_project/default_charts.html), despite strong core coverage. | Decide whether source-page parity is a product goal. If yes, expose these as pure calculation APIs and add fixtures; otherwise list them explicitly as non-goals in README. |
| Low | API contract | `julianDayToCivilDate(jd, utcOffset)` still accepts and ignores `utcOffset`; output is a UTC instant. | The signature suggests local-time conversion and invites DST/display mistakes. | Deprecate the offset parameter and add an explicit timezone formatting/civil-time conversion helper. |
| Low | Test determinism | The test suite's live Node fixture uses network downloads and emits WASM streaming warnings. | CI becomes dependent on third-party availability and produces noisy output; a network outage masks regression signal. | Preload/cache test data or mock the engine transport, reserve one network smoke test for a separate job, and make regular tests hermetic. |

## Cross-reference

| Source | Current status | Remaining deficiency |
| --- | --- | --- |
| [Monthly Panchanga](https://www.astrologicalmagazine.com/monthly-panchanga.html) | Core table, source 06:00 lunar boundaries, limb/rise-set rules, and observance matching are present. | No page-output fixtures; approximate rise/set provenance and timezone precedence are unresolved. |
| [Daily Panchanga](https://www.astrologicalmagazine.com/panchanga.html) | Five limbs, Hindu year, daily yogas, muhūrtas, timeline, and daily observances are exposed. | No limb progress or upcoming-festival API; rendered-output parity is unproven. |
| [Vedic Ephemeris](https://www.astrologicalmagazine.com/ephemeris.html) | Local sampling, ingress, dignity, combustion, and source-specific Ketu motion are exposed. | Local-hour validation and independent longitude/state fixtures are absent. |
| [Default Horoscopes](https://www.astrologicalmagazine.com/horoscope_embed_project/default_charts.html) | Tropical-minus-linear-Raman natal grahas/lagna, source vargas, aspects, and Vimshottari core exist. | Yoga catalogue, Dina Viṣaya, instant Panchanga, received/grouped chart data, and independent natal fixtures are absent. |
| [Atmakaraka Calculator](https://www.astrologicalmagazine.com/horoscope_embed_project/atmakaraka.html) | Candidate set, mean Rahu, retrograde reversal, and descending hierarchy are implemented. | Independent source-output fixtures and strict birth-input validation are absent. |

## Resolved since the previous audit

- Default Node initialization now succeeds.
- IANA conversion preserves seconds.
- Lunar range uses the source's 06:00 exit boundary.
- Ketu follows the ephemeris source convention in ephemeris APIs.
- Observances, source metadata, locale dictionaries, transition bounds, and a package licence are now present.

## Verification

```text
npm test              # 8 tests
npm run typecheck
npm run build
```

These checks pass as of this audit. They do not close the external-source parity gap described above.
