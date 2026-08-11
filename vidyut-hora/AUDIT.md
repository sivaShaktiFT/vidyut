# Package verification notes

Package: `@siva-sh/hora`
Audited: 2026-08-11

## Scope

This package provides headless Panchanga, ephemeris, natal-chart, varga,
karaka, and Vimshottari calculations. It intentionally excludes application
UI, location search, translations, sharing, and any presentation-specific
festival or horoscope features.

## Verification performed

- Unit tests cover Panchanga primitives, date/time conversion, input
  validation, the bundled observance catalogue, calculator initialization, and
  a Bengaluru regression fixture.
- Type checking verifies the public TypeScript implementation.
- The build produces ESM and declaration outputs for both the browser and Node
  entry points.
- The browser-entry check confirms that the browser build has no `node:`
  specifier.
- Regular tests run with `offline: true`; they do not make network requests.

## Known limits

- Panchanga conventions, festival observance rules, and ayanamsha choices vary
  by region and lineage. Integrators should validate outputs against the rules
  required for their application.
- The bundled observance catalogue is a useful default, not a complete or
  authoritative calendar for every tradition or region.
- The regression fixture protects against unintended changes, but it is not a
  substitute for an integrator's own acceptance data and boundary testing.
- Production deployments that require reproducible precision should pin and
  self-host the desired Swiss Ephemeris data files through `ephemerisUrl` and
  `ephemerisFiles`.

## Verification commands

```text
npm test
npm run typecheck
npm run build
npm run test:browser-entry
```
