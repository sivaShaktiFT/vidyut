# @vidyut-hora/panchanga

Reusable TypeScript calculations consolidated from the tools listed in `sources.md`:

- daily and monthly Panchanga: vara, tithi, nakshatra, yoga, karana, lunar month, and rise/set times;
- monthly sidereal graha ephemerides;
- natal-chart primitives: sidereal grahas, ascendant, and divisional-sign (varga) helpers; and
- the Jaimini eight-chara-karaka hierarchy, including Atmakaraka.

```ts
import { PanchangaCalculator } from "@vidyut-hora/panchanga";

const calculator = await PanchangaCalculator.create({ ayanamsha: "raman" });
const panchanga = calculator.calculate(
  { year: 2026, month: 8, day: 11 },
  { latitude: 12.9716, longitude: 77.5946, utcOffset: 5.5 },
);

console.log(panchanga.tithi.name, panchanga.tithi.endsAt);
```

In Node, use the Node-specific entry point. It loads the WASM asset without replacing
global `fetch`. No external data is downloaded by default: configure a
pinned/self-hosted ephemeris URL for production precision, or use the built-in
fallback deliberately (the default, also expressible as `offline: true`).

```ts
import { createNodeCalculator } from "@vidyut-hora/panchanga/node";

const calculator = await createNodeCalculator({
  ephemerisUrl: "https://assets.example.com/sweph/2.6.9",
  ephemerisFiles: ["sepl_18.se1", "semo_18.se1", "seas_18.se1"],
});
```

```ts
const chart = calculator.birthChart(
  { year: 1990, month: 1, day: 1, hour: 12, minute: 0 },
  { latitude: 12.9716, longitude: 77.5946, utcOffset: 5.5 },
);
const atmakaraka = calculator.atmakaraka(
  { year: 1990, month: 1, day: 1, hour: 12 },
  { latitude: 12.9716, longitude: 77.5946, utcOffset: 5.5 },
)[0];
const august = calculator.ephemeris(2026, 8);
```

## Source-compatible modules

- `calculate(date, location)` returns five limbs, source-altitude rise/set calculation by default (including the source fallbacks), Hindu year, daily yogas, muhūrtas, and matched `SOURCE_OBSERVANCES`. `events` identifies whether each celestial event came from altitude crossing, Swiss Ephemeris, or an approximation. A limb/timeline `bounded` flag identifies the source search-horizon fallback. Use `{ riseSetMethod: "swiss" }` to delegate rise/set entirely to Swiss Ephemeris.
- `monthlyPanchanga()`, `lunarMonthRange()`, and `timeline()` cover the Monthly/Daily Panchanga views. Lunar ranges use the deployed widget's 06:00 boundary and month-midpoint selection. `SOURCE_OBSERVANCES` carries the source type, aliases, and descriptions; `observances()` also accepts an application-owned catalogue.
- `localEphemeris()` takes a local clock hour and a numeric offset or IANA zone, and adds ingress, dignity, and combustion annotations.
- `birthChart()` and `atmakaraka()` deliberately use the Default Horoscopes/Atmakaraka source's linear B.V. Raman ayanamsha formula. `grahas()` and `ephemeris()` use Swiss Ephemeris Raman sidereal positions, matching the Ephemeris source.
- `calculateVimshottariDasha()`, `aspectedSigns()`, `conjunctions()`, and `vargaSign()` expose the Default Horoscopes calculation rules without coupling them to a renderer.

`CivilDate` is deliberately not a JavaScript `Date`: it represents the calendar date at the supplied location. Returned `Date` values are UTC instants; use `formatInstantInTimeZone()` or an IANA-aware formatter to display them. `Location` accepts exactly one of a fixed `utcOffset` or an IANA `timeZone`; prefer `timeZone` where DST is possible. Named-zone conversion resolves the offset for the requested civil date, preserves birth seconds, and rejects ambiguous/nonexistent DST civil times.

## Explicit non-goals

This is a headless calculation core, not a full clone of the cited pages. It does not
ship their rendered-output fixtures, location picker, source yoga catalogue, Dina
Viṣaya, received-aspect/grouped-varga presentation helpers, instant birth-Panchanga
panel, current-dasha selection UI, limb-progress display, or 60-day festival UI.
Consumers can compose these presentation and catalogue features from the pure APIs.

## Learnings and provenance

- `sources.md` is the canonical source list. The implementation was extracted with permission from the public tools at [Monthly Panchanga](https://www.astrologicalmagazine.com/monthly-panchanga.html), [Daily Panchanga](https://www.astrologicalmagazine.com/panchanga.html), [Vedic Ephemeris](https://www.astrologicalmagazine.com/ephemeris.html), [Default Horoscopes](https://www.astrologicalmagazine.com/horoscope_embed_project/default_charts.html), and [Atmakaraka Calculator](https://www.astrologicalmagazine.com/horoscope_embed_project/atmakaraka.html), inspected 2026-08-11.
- This package contains calculation logic only. It intentionally excludes the source site’s HTML/CSS, location database, UI state, translations, images, and sharing features. The permitted source festival catalogue is bundled as `SOURCE_OBSERVANCES`.
- Panchanga conventions vary. This package evaluates the five limbs at sunrise and exposes the Raman default plus an optional Lahiri mode. Adhika/kshaya months and tradition-specific rules outside the cited source catalogue remain application-provided data.
- `sweph-wasm` carries the Swiss Ephemeris data and license terms. Review its license and ensure your bundler serves its WASM/data assets before production use. `PanchangaCalculator.create()` supports current Node and browser runtimes; Node supplies the dependency's local WASM asset automatically.
- The package is MIT licensed. See [`LICENSE`](LICENSE); the bundled observance catalogue has the permission and provenance recorded above.

## Development

```sh
npm install
npm run typecheck
npm test
npm run build
```
