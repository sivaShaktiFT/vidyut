# Source implementation audit

Audited: 2026-08-11  
Package: `@vidyut-hora/panchanga`  
Scope: the five URLs in [`sources.md`](sources.md)

## Executive summary

`vidyut-hora` now covers substantially more of the cited calculators than the initial version: the sunrise Panchanga limbs, rise/set calculation, Hindu-year details, muhūrtas, monthly rows, local-time ephemeris annotations, natal positions/lagna, varga placement, basic aspect helpers, Vimshottari periods, source label dictionaries, and bundled observance data are all present.

The remediation below resolves every actionable calculation, packaging, type, and documentation finding recorded in this audit. The package remains a **headless calculation library modelled on the cited tools**, not a browser/UI replacement for the source pages.

## Remediation (2026-08-11)

- Node initialization now intercepts the dependency's local `file:` WASM URL and loads it through Node's filesystem API; the normal `PanchangaCalculator.create()` path executes successfully in Node 22.
- IANA-zone resolution retains seconds, including `BirthTime.second`; ambiguous/nonexistent DST clocks still require a fixed offset by design.
- `lunarMonthRange()` now follows the deployed Monthly Panchanga's 06:00 *exit* boundary and its visible-month midpoint selection.
- Default `source-altitude` rise/set mode now includes the source's final solar and lunar fallbacks. `bounded` marks limb/timeline end times for which the source search horizon did not bracket a crossing.
- Ephemeris calls use the source's stationary/non-retrograde Ketu convention, while natal `grahas()` keeps the natal-chart convention explicitly.
- `calculate()` returns matched bundled observances; `SOURCE_OBSERVANCES` publicly types its source `type`, `aliases`, and `desc` fields.
- Source-compatible Sanskrit/English dictionaries, the UTC-instant contract, and an MIT package licence are now exported/documented.
- The suite now has eight tests, including a Node-loaded Bengaluru Panchanga/ephemeris/natal fixture based on the deployed source algorithms inspected in this audit.

## Method and evidence

- Fetched all five URLs in `sources.md` on 2026-08-11.
- Inspected the currently deployed shared Panchanga script: `panchanga-today-widget.js?v=20260728-newage1`, as referenced by the [Monthly Panchanga](https://www.astrologicalmagazine.com/monthly-panchanga.html) and [Daily Panchanga](https://www.astrologicalmagazine.com/panchanga.html) pages.
- Cross-checked the embedded implementations in [Vedic Ephemeris](https://www.astrologicalmagazine.com/ephemeris.html), [Default Horoscopes](https://www.astrologicalmagazine.com/horoscope_embed_project/default_charts.html), and [Atmakaraka Calculator](https://www.astrologicalmagazine.com/horoscope_embed_project/atmakaraka.html).
- Reviewed `src/index.ts`, `src/source-observances.ts`, README claims, and tests. `npm test`, `npm run typecheck`, and `npm run build` pass locally.

Source pages are client-rendered and do not publish a stable output API. Findings below distinguish code-path correspondence from verified numerical parity.

Status: **match** = same deployed source algorithm was found; **partial** = core is present but source behaviour/data is incomplete; **different** = an intentional or material divergence; **missing** = no equivalent API.

## Historical findings (resolved 2026-08-11)

| Severity | Area | Finding | Evidence and impact | Recommended action |
| --- | --- | --- | --- | --- |
| High | Node runtime packaging | `await PanchangaCalculator.create()` fails in Node 22 with `Aborted(both async and sync fetching of the wasm failed)`. | `sweph-wasm` resolves its default `swisseph.wasm` relative URL and Node's `fetch` cannot retrieve it. The documented optional `wasmPath` does not make the package work out of the box and no Node integration test covers it. | Provide a Node-safe loader/asset path (or clearly browser-only exports), document the required deployment setup, and add a Node smoke test that executes `calculate()`. |
| High | Source-output validation | No golden fixtures call or record any cited source tool. The test suite has six primitive tests only. | Passing typecheck/build/tests verifies packaging, not Panchanga, ephemeris, natal-chart, or Atmakaraka output. A one-sign error or a several-minute rise/set difference would pass. | Capture published-page fixtures for at least 10 dates/locations and assert longitudes, limbs, event times, lagna, and karaka ordering with stated tolerances. |
| High | `timeZone` + birth seconds | `birthChart()` converts `hour + minute + second/3600` through `zonedCivilDateToJulianDay()`, which rounds the fractional hour to a whole minute. | The [Default Horoscopes](https://www.astrologicalmagazine.com/horoscope_embed_project/default_charts.html) calculator accepts seconds and computes its JD with them. A named-zone input silently loses 1–30 seconds (and can round forward by up to 30 seconds), changing fast Moon/lagna results near a boundary. | Make the zoned resolver second-precise and test both sides of a DST transition plus a nonzero `BirthTime.second`. |
| High | High-latitude rise/set | The shared widget samples altitude, tries `swe_rise_trans`, then supplies a solar approximation and a Moon elongation fallback. The library stops after the direct Swiss call and `calculate()` throws when Sun events are null. | The [Daily Panchanga](https://www.astrologicalmagazine.com/panchanga.html) remains operable in cases where the package rejects the same civil date. This also prevents timeline, muhūrta, festival, and monthly calculations. | Port the final two fallback paths or explicitly make them an opt-in source-compatibility mode and add polar fixtures. |
| Medium | Lunar-month range | The Monthly page adds a boundary when the *previous* 06:00 sample is target tithi and the current sample is no longer target tithi. `lunarMonthRange()` adds it when the current sample first becomes target tithi. | This is the opposite edge of Pūrṇimā/Amāvāsyā. The returned `start`, `end`, and `dates` can differ by a civil day from [Monthly Panchanga](https://www.astrologicalmagazine.com/monthly-panchanga.html). The page also selects the range surrounding the 15th of its visible month; the API selects around the supplied anchor. | Mirror the source's exit-boundary condition and month-midpoint selection; test a month where target tithi spans 06:00. |
| Medium | Ketu ephemeris state | `grahas()` always marks Ketu retrograde. The live [Vedic Ephemeris](https://www.astrologicalmagazine.com/ephemeris.html) derives Ketu from Rahu with `speed: 0` and `retro: false` (and suppresses node retrograde markers). | Consumers of `localEphemeris()` receive a different boolean from the cited ephemeris. The Default Horoscopes source does mark Ketu retrograde, so one shared return type cannot be identical to both tools without a profile. | Add an explicit `profile`/node-motion convention, default the ephemeris path to the ephemeris source convention, and document the natal-chart convention. |
| Medium | Observance API | `SOURCE_OBSERVANCES` contains the source catalogue, but `calculate()` never returns observances; callers must separately invoke `observances(panchanga, SOURCE_OBSERVANCES)`. | The daily/monthly source output includes festivals directly. The package's API is usable but incomplete as a source-shaped result, and it is easy to omit the source data unintentionally. | Return matched observances from an opt-in `calculate` option, or expose an explicit `calculateWithObservances` API and document region filtering. |
| Medium | Public source-data fidelity | `SourceObservance` omits source fields such as `type`, `aliases`, and `desc`; the exported catalogue currently retains them structurally but the public type does not promise them. | Applications cannot safely use the source's labels/description/solar-versus-weekly classification without narrowing an under-specified type. | Export a complete, readonly source-observance type that includes all bundled fields, and add an exact catalogue snapshot/count test against the fetched source data. |
| Medium | Source fallback semantics | `findTransition()` assumes an index changes in its supplied horizon. As on the widget, it returns the horizon end when no transition is found; no result indicates that it is a sentinel rather than an actual end time. | Consumers can present an invented limb end at `sunrise + 1.5` days (or `+.75` for karaṇa) if a calculation/library anomaly prevents a crossing. | Return `null` or an `estimated`/`bounded` flag when no bracketed index change exists; keep source emulation as an explicit compatibility choice. |
| Medium | Date/time contract | Returned values are UTC `Date` instants, while source pages format browser-local dates after adding the selected numeric offset. `julianDayToCivilDate()` accepts an `utcOffset` but deliberately ignores it. | The values are technically sound instants, but the argument name and source-oriented documentation invite consumers to treat them as local civil dates. This is especially error-prone around DST. | Remove the unused offset argument in the next major version or replace it with explicit `formatInTimeZone`/civil-time helpers; state UTC-instant semantics prominently. |
| Low | Rise/set mode naming | The default `source-compatible` method matches the source altitude sampling and bisection, but lacks its final fallback paths. | Calling it source-compatible overclaims parity in exactly the cases where fallback matters. | Rename it `source-altitude` until all source fallback behaviour is ported. |
| Low | Labels and locale | Public labels are ASCII English transliterations; the sources present Sanskrit diacritics, abbreviations, symbols, and language/display controls. | Headless output need not render a UI, but a source-equivalent display cannot be built from the canonical values alone. | Export stable IDs plus locale dictionaries for source English/Sanskrit labels and abbreviations. |
| Low | Distribution | Package metadata is `UNLICENSED` while the README describes copied source observance data as permitted. | Consumers cannot determine the licence for code or bundled data. | Add a chosen package licence and a concise provenance/licence notice for the source-derived catalogue. |

## Cross-reference by source

### Monthly Panchanga

Source: [Monthly Panchanga](https://www.astrologicalmagazine.com/monthly-panchanga.html)

| Capability | Package status | Notes |
| --- | --- | --- |
| Gregorian monthly rows | match | `monthlyPanchanga()` produces per-day sunrise Panchanga values. |
| Sunrise limbs, ends, nakshatra pada | match in code path | Uses the same Raman sidereal setup, 30-minute horizon samples, bisection, and binary limb-end search. Fixture parity is still absent. |
| Amānta/Pūrṇimānta view | different | `lunarMonthRange()` currently detects the entering target tithi; the page detects leaving it at 06:00. |
| Moon/sun fallback events | partial | Direct Swiss fallback is present; source's final approximations are missing. |
| Festival card | partial | Catalogue and matching exist, but inclusion in the calculated result is manual. |
| Location selection, persistence, 12/24-hour display | missing by design | Browser/UI responsibilities; not expected in a headless core. |

### Daily Panchanga

Source: [Daily Panchanga](https://www.astrologicalmagazine.com/panchanga.html)

| Capability | Package status | Notes |
| --- | --- | --- |
| Five limbs, Hindu year, daily yogas, seven muhūrtas | match in code path | The shared widget's rules and intervals are represented. Golden outputs are required before asserting numerical parity. |
| Sunrise-to-next-sunrise timeline | match in code path | `timeline()` mirrors the widget's one-day horizon and per-limb segments. |
| Limb percentage progress | missing | Source exposes progress for each limb; package returns end instants only. |
| Festivals and upcoming festival presentation | partial | Matching exists but no `calculate()` field or 60-day lookahead helper. |
| Source high-latitude fallback | missing | See high-severity rise/set finding. |

### Vedic Ephemeris

Source: [Vedic Ephemeris](https://www.astrologicalmagazine.com/ephemeris.html)

| Capability | Package status | Notes |
| --- | --- | --- |
| Nine-graha sidereal positions and speed | match in code path | Raman Swiss Ephemeris flow, mean Rahu, and derived Ketu are present. |
| Local sample hour/timezone | match | `localEphemeris()` accepts a local hour and a fixed offset or IANA zone; source UI limits its choices to 00/06/12/18. |
| Ingress, dignity, combustion | match in code path | The source tables' states are emitted as data rather than markup. |
| Ketu retrograde boolean | different | Library `true`; deployed ephemeris `false`/speed zero. |
| DMS, glyphs, language/display preferences | missing by design | Presentation data should be a separate formatter/localisation module. |

### Default Horoscopes

Source: [Default Horoscopes](https://www.astrologicalmagazine.com/horoscope_embed_project/default_charts.html)

| Capability | Package status | Notes |
| --- | --- | --- |
| Custom linear Raman natal positions and lagna | match in code path | The library now uses tropical positions/houses and subtracts the source formula. Timezone birth seconds remain defective for IANA input. |
| 16 source varga mappings | match | `vargaSign()` mirrors the deployed division rules. |
| Parāśari sign aspects/conjunctions | partial | Generic helpers exist; the source also derives received aspects and chart-grouped placements. |
| Vimshottari through pratyantardasha | partial | The period tree is present; source UI additionally selects current periods and emits display state. |
| Yoga evaluation | partial | Only a caller-supplied rule evaluator exists; the source's yoga catalogue is not exported. |
| Birth Panchanga and Dina Viṣaya | partial/missing | Sunrise daily Panchanga is separate; the source's instant birth panel and Dina Viṣaya calculations are not public APIs. |
| Charts, saved/current charts, geocoding, sharing | missing by design | UI/integration features outside the headless package. |

### Atmakaraka Calculator

Source: [Atmakaraka Calculator](https://www.astrologicalmagazine.com/horoscope_embed_project/atmakaraka.html)

| Capability | Package status | Notes |
| --- | --- | --- |
| Eight candidates (no Ketu), mean Rahu, reversed retrograde degrees, descending ranking | match in code path | `atmakaraka()` follows the deployed algorithm through `birthChart()`. |
| Linear Raman longitude | match in code path | Same tropical-minus-custom-ayanamsha approach. |
| Seconds and named-zone birth time | different | Seconds are rounded away when a `timeZone` is used. |
| Interpretive readings, symbols, place lookup, image/share | missing by design | Content/UI rather than the karaka calculation itself. |

## Verification and release gate

Completed locally after remediation:

```text
npm test              # 8 tests, including Node Panchanga/ephemeris/natal fixture
npm run typecheck
npm run build
```

The Node calculation smoke test passes with the default loader. `sweph-wasm` first reports an unsupported `file:` MIME type for streaming compilation, then falls back to successful ArrayBuffer instantiation as designed.

Recommended hardening after this remediation:

1. Add more fixtures across DST/non-DST zones, a polar/high-latitude case, tithi/nakshatra/ingress boundaries, and retrograde planetary positions.
2. Compare source output versus package output using stated rise/set, limb-end, longitude, lagna, varga, and karaka tolerances whenever a browser automation environment is available.
3. Keep source-specific profiles explicit wherever the cited tools intentionally disagree, especially Ketu's `retrograde` field.
