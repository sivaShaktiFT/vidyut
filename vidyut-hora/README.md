# @siva-sh/hora

`@siva-sh/hora` is a headless TypeScript library for Panchanga and Vedic
astrology calculations. It uses Swiss Ephemeris through `sweph-wasm` and is
intended for applications that need calculation results without a bundled UI.

It provides:

- daily and monthly Panchanga data: vara, tithi, nakshatra, yoga, karana,
  lunar month, rise/set events, Hindu year, daily yogas, and muhurtas;
- sidereal graha positions and local or UTC ephemerides;
- natal-chart primitives: grahas, ascendant, vargas, aspects, and
  Vimshottari dasha; and
- the Jaimini eight-chara-karaka hierarchy, including Atmakaraka.

## Install

```sh
npm install @siva-sh/hora
```

## Quick start

```ts
import { PanchangaCalculator } from '@siva-sh/hora';

const calculator = await PanchangaCalculator.create({ ayanamsha: 'raman' });
const panchanga = calculator.calculate(
  { year: 2026, month: 8, day: 11 },
  { latitude: 12.9716, longitude: 77.5946, utcOffset: 5.5 },
);

console.log(panchanga.tithi.name, panchanga.tithi.endsAt);
```

In Node.js, use the Node-specific entry point. It loads the packaged WASM asset
without replacing global `fetch`. By default, no ephemeris data is downloaded;
provide a pinned, self-hosted ephemeris URL when your deployment requires it.

```ts
import { createNodeCalculator } from '@siva-sh/hora/node';

const calculator = await createNodeCalculator({
  ephemerisUrl: 'https://assets.example.com/sweph/2.6.9',
  ephemerisFiles: ['sepl_18.se1', 'semo_18.se1', 'seas_18.se1'],
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

## API notes

- `calculate(date, location)` evaluates the five limbs at local sunrise and
  returns rise/set events with their calculation method. Pass
  `{ riseSetMethod: "swiss" }` to use Swiss Ephemeris for every rise/set event.
- `monthlyPanchanga()`, `lunarMonthRange()`, and `timeline()` provide calendar
  and limb-timeline data. Lunar month ranges use a 06:00 local boundary and a
  month-midpoint selection rule.
- `SOURCE_OBSERVANCES` is a bundled festival and vrata catalogue. Pass your
  own catalogue to `observances()` to use application-specific traditions,
  regions, or rules.
- `localEphemeris()` takes a local clock hour and a fixed UTC offset or IANA
  time zone, then adds ingress, dignity, and combustion annotations.
- `birthChart()` and `atmakaraka()` use a linear B.V. Raman ayanamsha formula.
  `grahas()` and `ephemeris()` use Swiss Ephemeris sidereal positions with the
  selected ayanamsha.
- `calculateVimshottariDasha()`, `aspectedSigns()`, `conjunctions()`, and
  `vargaSign()` expose calculation primitives independent of rendering.

`CivilDate` represents a calendar date at the supplied location; it is not a
JavaScript `Date`. Returned `Date` values are UTC instants. Use
`formatInstantInTimeZone()` or an IANA-aware formatter for display. A
`Location` must include exactly one of `utcOffset` or `timeZone`; prefer
`timeZone` where daylight-saving changes apply. Named-zone conversion rejects
ambiguous and nonexistent local times.

## Scope and conventions

This package is a calculation core, not a calendar or horoscope application. It
does not provide a location picker, UI components, translations, sharing,
festival presentation, or tradition-specific catalogues beyond its bundled
observances.

Panchanga conventions vary by region and lineage. The package evaluates limbs
at sunrise, defaults to Raman ayanamsha, and also supports Lahiri. Adhika and
kshaya month handling, festival observance rules, and other tradition-specific
requirements should be validated for the application and audience using them.

Review the license and deployment requirements of `sweph-wasm` and Swiss
Ephemeris before production use. Ensure your bundler serves the WASM and any
configured ephemeris assets.

## Development

```sh
npm install
npm run typecheck
npm test
npm run build
```

## Publishing

Update the version, authenticate with npm as a maintainer of the `siva-sh`
scope, then run:

```sh
npm run publish:npm
```

The script publishes `@siva-sh/hora` with public access.
