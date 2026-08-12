# @siva-sh/hora

Professional, headless Jyotish calculations for TypeScript applications.

Vidyut Hora provides a focused calculation engine for Panchanga, sidereal
ephemerides, and natal-chart primitives. It is designed for calendar products,
astrology software, research tools, and services that need to own their user
experience while relying on a typed calculation API. The library uses Swiss
Ephemeris through `sweph-wasm` and ships no UI, location search, or
presentation layer.

## Why “Hora”?

_Horā_ (Sanskrit: होरा) is a technical Jyotish term with several connected
uses: an hour or time division, horoscopy or natal astrology, and the 15° half
of a zodiacal sign. The latter is the basis of the D2 _horā_ division. This is
why the name fits a calculation engine: it points both to the time-and-place
inputs that establish a chart and to the divisions used to interpret it.

Classical literature also uses _horā_ as the horoscopic branch of
_jyotiḥśāstra_. In Varāhamihira’s classification, it stands alongside
mathematical astronomy (_gaṇita_) and _saṃhitā_; it encompasses work such as
nativity, questions, and electional timing. The library’s Panchanga,
ephemeris, birth-chart, varga, and dasha APIs sit at the computational boundary
that these practices require—they calculate positions and periods rather than
rendering an interpretation.

The word has a useful historical wrinkle. A traditional explanation derives
_horā_ from _ahorātra_ (“day and night”) by removing the first and last
syllables. Lexicographical and historical scholarship, however, commonly
identifies the technical word with Greek _hōra_ (“hour”); early Sanskrit
horoscopic literature also preserves evidence of a long exchange between Indian
and Hellenistic astral traditions. Rather than treating one account as an
unqualified fact, Hora takes its name from the term’s established Sanskrit
astrological meaning.

Further reading: [Bṛhatsaṃhitā’s use of _horā_ for horoscopy, an hour, and a
15° division](https://www.wisdomlib.org/definition/hora), [the threefold
classification of _jyotiḥśāstra_](https://www.wisdomlib.org/hinduism/book/indian-astronomy-a-source-book/d/doc1621541.html),
and [a scholarly discussion of the early _Yavanajātaka_ tradition](https://www.wisdomlib.org/uploads/journals/hssa/1_7_7.pdf).

## What you can build

- Daily and monthly Panchanga: vara, tithi, nakshatra, yoga, karana, lunar
  month, sunrise and sunset, moonrise and moonset, Hindu year, daily yogas,
  and muhurtas.
- Sunrise-to-sunrise limb timelines and amanta or purnimanta lunar-month
  ranges.
- Sidereal positions for the nine grahas, UTC and local-time ephemerides, and
  ingress, dignity, and combustion annotations.
- Natal charts, ascendants, divisional-sign calculations, Parashari aspects,
  Jaimini chara karakas, and Vimshottari dasha.
- A bundled observance catalogue, plus support for your own regional or
  tradition-specific rules.

## Install

```sh
npm install @siva-sh/hora
```

The package is ESM-only and supports browser and Node.js applications. Import
from `@siva-sh/hora/node` in Node.js; it loads the packaged WASM asset without
replacing global `fetch`.

## Start with a daily Panchanga

Use an IANA time zone whenever the location observes daylight-saving changes.
Use a fixed `utcOffset` only where that offset is appropriate for the requested
date.

```ts
import { PanchangaCalculator } from '@siva-sh/hora';

const calculator = await PanchangaCalculator.create({
  ayanamsha: 'raman',
});

const bengaluru = {
  latitude: 12.9716,
  longitude: 77.5946,
  timeZone: 'Asia/Kolkata',
};

const panchanga = calculator.calculate({ year: 2026, month: 8, day: 11 }, bengaluru);

console.log({
  vara: panchanga.vara.name,
  tithi: panchanga.tithi.name,
  nakshatra: panchanga.nakshatra.name,
  sunrise: panchanga.sunrise,
  tithiEndsAt: panchanga.tithi.endsAt,
});
```

All returned `Date` values are UTC instants. Format them in the requested
location before display:

```ts
import { formatInstantInTimeZone } from '@siva-sh/hora';

const parts = formatInstantInTimeZone(panchanga.sunrise, 'Asia/Kolkata');
console.log(parts);
```

`CivilDate` is deliberately a calendar date, not a JavaScript `Date`. This
avoids silently moving a requested local day when it crosses a UTC boundary.

## Run in Node.js

```ts
import { createNodeCalculator } from '@siva-sh/hora/node';

const calculator = await createNodeCalculator({
  ayanamsha: 'lahiri',
  ephemerisUrl: 'https://assets.example.com/sweph/2.6.9',
  ephemerisFiles: ['sepl_18.se1', 'semo_18.se1', 'seas_18.se1'],
});
```

For reproducible production results, pin and self-host the Swiss Ephemeris
data files used by your deployment. The `ephemerisUrl` and `ephemerisFiles`
options identify that exact data set. Set `offline: true` only when you
intentionally want to prevent ephemeris-data downloads and accept the
available Swiss Ephemeris fallback.

## Use the calculation APIs

### Natal chart and Jaimini karakas

```ts
const birth = { year: 1990, month: 1, day: 1, hour: 12, minute: 0 };

const chart = calculator.birthChart(birth, bengaluru);
const karakas = calculator.atmakaraka(birth, bengaluru);
const dasha = calculator.vimshottariDasha(birth, bengaluru);

console.log(chart.ascendant.signName);
console.log(karakas[0].karaka, karakas[0].name);
console.log(dasha.periods[0]);
```

`birthChart()` and `atmakaraka()` use the library’s linear B.V. Raman
ayanamsha formula. `grahas()` and ephemeris methods use Swiss Ephemeris
sidereal positions with the calculator’s selected ayanamsha. Keep that
distinction in mind when comparing results across methods or with other
systems.

### Monthly calendar and limb timeline

```ts
const month = calculator.monthlyPanchanga(2026, 8, bengaluru);
const timeline = calculator.timeline({ year: 2026, month: 8, day: 11 }, bengaluru);
const lunarMonth = calculator.lunarMonthRange(
  { year: 2026, month: 8, day: 11 },
  bengaluru,
  'amanta',
);
```

`timeline()` returns segments from one local sunrise to the next. Lunar-month
ranges use a 06:00 local boundary and select the range containing the
Gregorian month’s midpoint.

### Ephemerides and chart primitives

```ts
const utcEphemeris = calculator.ephemeris(2026, 8); // sampled at 00:00 UTC
const localEphemeris = calculator.localEphemeris(2026, 8, 6, bengaluru);

const grahas = calculator.grahas(chart.julianDay);
```

For lower-level work, the package also exports `vargaSign()`, `aspectedSigns()`,
`conjunctions()`, `evaluateYogas()`, and `calculateVimshottariDasha()`.

## Conventions and integration responsibilities

Jyotish conventions vary across regions and lineages. Hora offers explicit,
documented defaults but cannot select the right convention for an application’s
audience.

- Panchanga limbs are evaluated at local sunrise.
- Raman is the default ayanamsha; Lahiri is also available.
- Rise/set results include their method in `panchanga.events`: `altitude`,
  `swiss`, or `approximation`. Pass `{ riseSetMethod: 'swiss' }` to
  `calculate()`, `monthlyPanchanga()`, or `timeline()` when every rise/set
  event must use Swiss Ephemeris.
- A location must specify exactly one of `timeZone` or `utcOffset`. Named-zone
  conversion rejects ambiguous and nonexistent local times rather than
  guessing.
- The bundled `SOURCE_OBSERVANCES` catalogue is a starting point, not an
  authoritative calendar for every region or tradition. Supply a reviewed
  catalogue to `observances()` for application-specific rules.
- Validate adhika and kshaya month handling, observance rules, ayanamsha, and
  boundary behavior against the rules and acceptance data required by your
  product.

At polar locations, a requested civil day can have no sunrise or sunset; in
that case `calculate()` throws a `RangeError`. Validate user input and handle
this condition in your application.

## API at a glance

| Need                                       | API                                                      |
| ------------------------------------------ | -------------------------------------------------------- |
| One daily Panchanga                        | `calculator.calculate(date, location)`                   |
| A Gregorian month of Panchanga             | `calculator.monthlyPanchanga(year, month, location)`     |
| Tithi, nakshatra, yoga, and karana periods | `calculator.timeline(date, location)`                    |
| Amanta or purnimanta dates                 | `calculator.lunarMonthRange(anchor, location, mode)`     |
| Sidereal graha positions                   | `calculator.grahas(julianDay)`                           |
| Monthly UTC or local ephemeris             | `calculator.ephemeris()` / `calculator.localEphemeris()` |
| Natal chart, karakas, and dasha            | `birthChart()` / `atmakaraka()` / `vimshottariDasha()`   |
| Custom observance matching                 | `calculator.observances(panchanga, rules)`               |

## Scope

Hora is a calculation core. Your application owns presentation, translations,
location selection, chart rendering, sharing, authentication, and any
tradition-specific interpretation or advice.

Review the licenses and deployment requirements for `sweph-wasm` and Swiss
Ephemeris before shipping a product. Hora itself is released under the
[MIT License](./LICENSE).
