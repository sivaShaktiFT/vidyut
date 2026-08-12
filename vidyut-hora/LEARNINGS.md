# Vidyut Hora learnings

This is an implementation-oriented comparison between Vidyut Hora and
[NorthTara's jyotishganit](https://github.com/northtara/jyotishganit). It is a
research note and product backlog, not a claim that the engines are
interchangeable or that proposals already exist.

**Research snapshot:** 2026-08-12. jyotishganit was reviewed at commit
[06f8b6d](https://github.com/northtara/jyotishganit/tree/06f8b6dea11cebd5253babab2771525896a0b92d)
(version 0.1.3 in its pyproject metadata). Both projects are MIT-licensed. Any
future reuse must retain notices and attribution where applicable, and be
independently tested against Hora's own conventions.

## Evidence labels

- **Implemented** — present in inspected source.
- **Reported** — stated in upstream documentation or metadata; not independently
  reproduced here.
- **Proposal** — an idea for Hora, not a committed API or astrological claim.

Terms follow each project's spelling where practical; transliteration varies.

## Vidyut Hora: current capability

### Product and deployment boundary

Hora is a headless TypeScript ESM calculation core powered by sweph-wasm and
Swiss Ephemeris. Its browser entry is free of Node specifiers; its Node entry
embeds the packaged WASM without changing global fetch. Hora intentionally
does not include UI, geocoding, chart rendering, translations, sharing,
authentication, or interpretation.

### Time, location, and reproducibility

| Area        | Implemented behavior                                                                                                                                                  |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Civil date  | CivilDate is year/month/day, deliberately distinct from a JavaScript Date.                                                                                            |
| Location    | Latitude/longitude plus exactly one of fixed utcOffset or IANA timeZone.                                                                                              |
| Zone safety | Named zones preserve local civil intent and reject ambiguous or nonexistent local times.                                                                              |
| Output time | Returned Date values are UTC instants; formatInstantInTimeZone() returns localized parts for rendering.                                                               |
| Assets      | wasmUrl, ephemerisUrl, ephemerisFiles, and offline are explicit initialization options. Pinned self-hosted ephemeris data is the production route documented by Hora. |
| Ayanamsha   | Swiss sidereal mode supports Raman (default) and Lahiri. Natal chart and karaka calculations use Hora's separate linear B.V. Raman formula.                           |

This time-zone and asset-provenance model is a material professional-use
strength. It prevents a client UI from having to guess a local date or silently
choose one side of a daylight-saving ambiguity.

### Implemented calculation surface

| Domain              | Implemented API or behavior                                                                                                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Daily Panchanga     | calculate() evaluates vara, tithi, nakshatra/pada, yoga, karana, paksha, lunar month, Hindu year, daily yogas, muhurtas, and bundled observances at local sunrise. It includes sun/moon rise and set events.                                   |
| Rise/set provenance | events labels values altitude, swiss, or approximation. Passing riseSetMethod: swiss requests Swiss Ephemeris events. No sunrise/sunset raises RangeError.                                                                                     |
| Calendar views      | monthlyPanchanga(), sunrise-to-next-sunrise timeline(), and lunarMonthRange() for amanta/purnimanta. Month ranges use a 06:00 local boundary and midpoint selection rule.                                                                      |
| Observances         | SOURCE_OBSERVANCES has 73 records. observances() accepts a caller's own rule catalogue.                                                                                                                                                        |
| Ephemerides         | grahas(), UTC ephemeris(), and localEphemeris(); the local variant adds ingress, dignity, and combustion annotations.                                                                                                                          |
| Natal chart         | birthChart() returns a sidereal ascendant and nine grahas; atmakaraka() returns the eight Jaimini chara karakas.                                                                                                                               |
| Vargas              | vargaSign() has explicit D1, D2, D3, D4, D7, D9, D10, D12, D16, D20, D24, D27, D30, D40, D45, and D60 branches. Other positive divisions use a generic fallback and must not be marketed as a named traditional convention without validation. |
| Rules               | aspectedSigns() implements Parāśari sign aspects; conjunctions() is same-sign; evaluateYogas() runs caller-provided typed rules.                                                                                                               |
| Dasha               | calculateVimshottariDasha() and vimshottariDasha() calculate a 120-year human or 144-year national cycle through pratyantardasha.                                                                                                              |
| Utilities           | Julian-day, zone, degree, limb-index, karana, ayanamsha, sign, and varga helpers are exported.                                                                                                                                                 |

### Existing quality evidence

The package tests primitive calculations, zone conversion and invalid input,
concurrent Node initialization without fetch mutation, the observance
catalogue, and a Bengaluru Panchanga/ephemeris/natal-chart fixture. Type
checking, linting, format checks, ESM declaration builds, and a browser-entry
check are available. This is a solid base, but it is not a
convention-by-convention validation corpus.

## jyotishganit: reviewed findings

### Architecture

jyotishganit is a Python 3.10+ package built around Skyfield. **Implemented:**
its astronomical module loads JPL DE421 (de421.bsp), derives a True Chitra
Paksha ayanamsha from observed Spica, and chooses an OS-specific data directory
for downloaded assets. Its public calculate_birth_chart() function assembles a
VedicBirthChart consisting of person, ayanamsha, Panchanga, D1, divisional
charts, Ashtakavarga, and dashas. Its model serializes to a JSON-LD-shaped
object with a declared context URL.

The repository contains astronomy, Panchanga, birth chart, dasha, Shadbala,
and Ashtakavarga tests. Its README reports high precision and
cross-verification; Hora should treat those as upstream claims until a shared
fixture comparison is run.

### Implemented feature inventory

| Area            | Inspected functionality                                                                                 | Learning for Hora                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Aggregate chart | A composed model with D1, houses, occupants, lords, aspects, Panchanga, vargas, strengths, and dashas.  | A strong output-model idea; Hora currently exposes smaller primitives.                                              |
| Houses          | Whole-sign houses, occupants, and lord-placement data.                                                  | High-value missing primitive for a consumer-ready natal chart.                                                      |
| Vargas          | Dedicated D2, D3, D4, D7, D9, D10, D12, D16, D20, D24, D27, D30, D40, D45, D60 transformations.         | Hora has matching sign-level coverage but needs independently validated full-chart construction and named profiles. |
| D2              | The code maps Sun hora to Leo and Moon hora to Cancer.                                                  | Do not conflate it with Hora's current D2 convention.                                                               |
| Aspects         | Planet-to-planet, planet-to-house, and house-aspect relationships.                                      | Extends Hora's sign-only aspect helper.                                                                             |
| Dasha           | Vimshottari assembly plus ashtottari.py and yogini.py modules. The aggregate builder calls Vimshottari. | A candidate expansion, not a direct port.                                                                           |
| Strengths       | Shadbala component helpers, Vimshopaka, Ishta/Kashta, and Bhava bala.                                   | The largest research opportunity; it needs written source/convention specifications.                                |
| Ashtakavarga    | Bhinna and Sarva models and calculation functions.                                                      | A bounded, independently testable first advanced module.                                                            |
| Serialization   | Dataclass to_dict() produces JSON-LD-shaped output.                                                     | Adopt the integration goal, but do not claim JSON-LD without a maintained vocabulary.                               |
| Panchanga       | Birth-time tithi, nakshatra, yoga, karana, and vaara.                                                   | Complementary, not a replacement for Hora's sunrise daily Panchanga, timeline, provenance, or observances.          |

## Compatibility findings

| Decision         | Hora                                                                        | jyotishganit                                         | Required combined design                                                                                       |
| ---------------- | --------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Runtime          | TypeScript ESM, browser and Node                                            | Python 3.10+                                         | Port behavior deliberately; do not add a runtime dependency.                                                   |
| Ephemeris        | Swiss Ephemeris/WASM, optionally pinned and self-hosted                     | Skyfield/JPL DE421 download/cache                    | Attach ephemeris provider and data version to reproducible results.                                            |
| Ayanamsha        | Raman/Lahiri Swiss mode; separate natal Raman formula                       | True Chitra Paksha from Spica                        | Compare only fixtures that state the exact calculation path.                                                   |
| Time             | CivilDate plus offset or IANA zone with ambiguity rejection                 | Local datetime plus numeric offset                   | Preserve Hora's IANA-zone model; add a BirthInstant abstraction rather than copying a numeric-offset-only API. |
| Panchanga anchor | Sunrise for daily data                                                      | Birth instant in chart assembly                      | Use separate types and names; the two Panchangas are not equivalent.                                           |
| Output           | Typed primitives and UTC Date instants                                      | Aggregate Python dataclasses and JSON-LD-shaped data | Add opt-in versioned serialization, not a mandatory monolith.                                                  |
| D2               | Current regression identifies Raman Hora (Aries first half maps to Scorpio) | Sun/Moon Hora maps to Leo/Cancer                     | A direct convention conflict: retain existing behavior and add named, opt-in D2 profiles.                      |

The D2 difference is the clearest warning against formula copying. A
professional calculation library names, documents, serializes, and tests each
convention instead of silently choosing one.

## Combined feature direction

### 1. Composable NatalChart layer — P1

**Proposal:** add an opt-in builder separate from birthChart(). It would return
positions, whole-sign houses, occupants, lords, aspects, selected vargas, and
metadata, while keeping the current small primitives callable.

A sketch:

    const chart = calculator.natalChart(birth, location, {
      houseSystem: 'whole-sign',
      vargas: [1, 2, 9, 10, 60],
      vargaConventions: { 2: 'raman' },
      aspects: 'parashari-sign',
    });

The value comes from combining Hora's safe time/deployment model with
jyotishganit's navigable chart model. Every result should carry a calculation
profile: ayanamsha, house system, varga conventions, ephemeris provenance, and
source instant.

### 2. Named convention profiles — P0 prerequisite

**Proposal:** make advanced choices compact and serializable. For example:

    type VargaConvention = 'raman' | 'parasara-sun-moon';
    type CalculationProfile = {
      ayanamsha: 'raman' | 'lahiri';
      houseSystem: 'whole-sign';
      varga: Partial<Record<number, VargaConvention>>;
      ephemeris: { provider: 'swiss'; version?: string };
    };

That converts D2 disagreement into an explicit product choice and preserves it
when data crosses service boundaries.

### 3. Stable JSON before JSON-LD — P1

**Proposal:** add serializeChart() or toJSON() for a versioned plain JSON
document. Include schema version, calculation profile, ISO timestamps, original
time-zone input, units, and results. Publish JSON Schema and fixtures first.
Only use JSON-LD after supplying a maintained vocabulary/context and a real
consumer need.

### 4. Ashtakavarga first — P2

**Proposal:** implement Bhinna and Sarva Ashtakavarga as a pure TypeScript
module fed by normalized GrahaPosition plus ascendant. Return bindus per sign
and an explicit rule-set ID. It is smaller and easier to test than Shadbala;
jyotishganit's feature and test structure is useful discovery, not authority to
adopt its tables or algorithm without review.

### 5. Shadbala as a research project — P3

**Proposal:** only implement after a written calculation specification and
reference corpus. Return component values, intermediate values, units, and rule
profile, not a single score or interpretation. A useful module breakdown,
inspired by the inspected feature map, is Sthana, Dig, Kala, Cheshta,
Naisargika, Drik, then aggregate rupas. Classical sources, retrograde policy,
thresholds, and ephemeris dependencies all require domain review.

### 6. Dasha plug-ins — P3

**Proposal:** retain the current Vimshottari API and introduce a DashaSystem
interface before investigating Ashtottari and Yogini. Emit UTC boundaries and
format them using the caller's zone; use the existing Panchanga timeline
discipline for temporal consistency.

## Validation gates

1. Define a fixture contract: local input, IANA zone, resolved UTC instant,
   coordinates, elevation policy, ephemeris/data version, ayanamsha, and every
   convention.
2. Test sign/amsha edges, tithi/nakshatra transitions, sunrise changes, DST
   gaps/overlaps, midnight crossings, retrograde motion, polar rise/set, and
   D2/D60 boundaries.
3. Normalize provider and convention differences before comparing external
   engines. A difference is a finding to explain, not something to hide with a
   loose tolerance.
4. Store expected precision deliberately: exact discrete values separately from
   time/longitude tolerances.
5. Add property tests for cyclic degrees, sign ranges, varga invariants,
   serialization round trips, and dasha period continuity.
6. Require a source note, calculation profile, and reviewed fixture for every
   new traditional rule set.

## Prioritized roadmap

| Priority | Work                                   | Done when                                                                                         |
| -------- | -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| P0       | CalculationProfile and result metadata | Advanced results state provider, ephemeris version where known, ayanamsha, and named conventions. |
| P0       | Named D2 conventions                   | Existing Raman behavior stays stable; Sun/Moon Hora is additive and opt-in.                       |
| P1       | Composable whole-sign NatalChart       | Positions, houses, occupants, lords, and aspects have typed, fixture-backed results.              |
| P1       | Versioned JSON schema                  | Consumers can persist and validate results without class internals.                               |
| P2       | Ashtakavarga                           | Bhinna/Sarva outputs pass independently reviewed chart fixtures.                                  |
| P3       | Shadbala specification                 | Sources, profiles, units, and acceptance fixtures exist before implementation.                    |
| P3       | Additional dashas                      | Each system is a documented module with boundary tests.                                           |

## Sources

- [Hora source](./src/index.ts), [Node entry](./src/node.ts), and
  [Hora tests](./test/index.test.ts).
- [jyotishganit at the reviewed commit](https://github.com/northtara/jyotishganit/tree/06f8b6dea11cebd5253babab2771525896a0b92d):
  [README](https://github.com/northtara/jyotishganit/blob/06f8b6dea11cebd5253babab2771525896a0b92d/README.md),
  [main API](https://github.com/northtara/jyotishganit/blob/06f8b6dea11cebd5253babab2771525896a0b92d/jyotishganit/main.py),
  [astronomical layer](https://github.com/northtara/jyotishganit/blob/06f8b6dea11cebd5253babab2771525896a0b92d/jyotishganit/core/astronomical.py),
  [divisional charts](https://github.com/northtara/jyotishganit/blob/06f8b6dea11cebd5253babab2771525896a0b92d/jyotishganit/components/divisional_charts.py),
  and [package metadata](https://github.com/northtara/jyotishganit/blob/06f8b6dea11cebd5253babab2771525896a0b92d/pyproject.toml).
