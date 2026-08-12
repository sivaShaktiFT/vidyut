import { describe, expect, it } from 'vitest';
import {
  aspectedSigns,
  calculateVimshottariDasha,
  civilDateToJulianDay,
  julianDayToCivilDate,
  karanaName,
  nakshatraIndex,
  normalizeDegrees,
  SOURCE_OBSERVANCES,
  sourceRamanAyanamsha,
  tithiIndex,
  vargaSign,
  zonedCivilDateToJulianDay,
} from '../src/index.js';
import { createNodeCalculator } from '../src/node.js';

describe('Panchanga primitives', () => {
  it('normalizes circular longitudes and derives limb indices', () => {
    expect(normalizeDegrees(-1)).toBe(359);
    expect(tithiIndex(25, 1)).toBe(2);
    expect(nakshatraIndex(359.99)).toBe(26);
    expect(karanaName(0)).toBe('Kimstughna');
    expect(karanaName(57)).toBe('Shakuni');
  });
  it('round-trips a local civil clock through Julian Day', () => {
    const jd = civilDateToJulianDay({ year: 2026, month: 8, day: 11 }, 5.5, 6.5);
    const date = julianDayToCivilDate(jd, 5.5);
    expect([
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
    ]).toEqual([2026, 8, 11, 1, 0]);
  });
  it('applies supported varga conventions', () => {
    expect(vargaSign(5, 2)).toBe(7); // Raman hora: Aries first half -> Scorpio
    expect(vargaSign(15, 3)).toBe(4); // Aries second drekkana -> Leo
    expect(vargaSign(0, 9)).toBe(0);
    expect(vargaSign(29.9, 30)).toBe(1); // Aries trimsamsa -> Taurus
  });
  it('calculates dasha and aspect rules', () => {
    expect(aspectedSigns('Mars', 0)).toEqual([3, 6, 7]);
    expect(calculateVimshottariDasha(0, 2451545).periods).toHaveLength(9);
    expect(sourceRamanAyanamsha(1858013)).toBe(0);
  });
  it('resolves an IANA civil time without a fixed offset', () => {
    expect(
      zonedCivilDateToJulianDay({ year: 2026, month: 8, day: 11 }, 'Asia/Kolkata', 6.5),
    ).toBeCloseTo(civilDateToJulianDay({ year: 2026, month: 8, day: 11 }, 5.5, 6.5), 8);
  });
  it('preserves seconds when resolving an IANA civil time', () => {
    const hour = 6 + 30 / 60 + 17 / 3600;
    expect(
      zonedCivilDateToJulianDay({ year: 2026, month: 8, day: 11 }, 'Asia/Kolkata', hour),
    ).toBeCloseTo(civilDateToJulianDay({ year: 2026, month: 8, day: 11 }, 5.5, hour), 10);
  });
  it('rejects invalid civil input and contradictory timezone forms', async () => {
    expect(() => civilDateToJulianDay({ year: 2026, month: 2, day: 29 }, 0)).toThrow(RangeError);
    expect(() =>
      zonedCivilDateToJulianDay({ year: 2026, month: 8, day: 11 }, 'Asia/Kolkata', 24),
    ).toThrow(RangeError);
    const calculator = await createNodeCalculator({ offline: true });
    expect(() => calculator.ephemeris(2026, 8, 24)).toThrow(RangeError);
    expect(() =>
      calculator.birthChart(
        { year: 1990, month: 1, day: 1, hour: 12, minute: 60 },
        { latitude: 0, longitude: 0, utcOffset: 0 },
      ),
    ).toThrow(RangeError);
    expect(() =>
      calculator.calculate(
        { year: 2026, month: 8, day: 11 },
        { latitude: 0, longitude: 0, utcOffset: 0, timeZone: 'Etc/UTC' },
      ),
    ).toThrow(RangeError);
  });
  it('initializes Node calculators concurrently without replacing global fetch', async () => {
    const originalFetch = globalThis.fetch;
    const calculators = await Promise.all([
      createNodeCalculator({ offline: true }),
      createNodeCalculator({ offline: true }),
    ]);
    expect(calculators).toHaveLength(2);
    expect(globalThis.fetch).toBe(originalFetch);
  });
  it('ships the bundled observance catalogue', () => {
    expect(SOURCE_OBSERVANCES).toHaveLength(73);
    expect(SOURCE_OBSERVANCES.find((item) => item.name === 'Dīpāvalī')?.tithi).toBe(29);
    expect(SOURCE_OBSERVANCES.find((item) => item.name === 'Dīpāvalī')?.desc).toBe(
      'Festival of Lights',
    );
    expect(SOURCE_OBSERVANCES.find((item) => item.name === 'Makara Saṅkrānti')?.type).toBe('solar');
  });
  it('matches the Bengaluru regression fixture', async () => {
    const calculator = await createNodeCalculator({ offline: true });
    const location = { latitude: 12.9716, longitude: 77.5946, utcOffset: 5.5 };
    const panchanga = calculator.calculate({ year: 2026, month: 8, day: 11 }, location);
    expect(panchanga.sunrise.toISOString()).toBe('2026-08-11T00:36:54.606Z');
    expect(panchanga.sunset.toISOString()).toBe('2026-08-11T13:12:42.740Z');
    expect([
      panchanga.tithi.name,
      panchanga.nakshatra.name,
      panchanga.yoga.name,
      panchanga.karana.name,
    ]).toEqual(['Amavasya', 'Punarvasu', 'Siddhi', 'Vishti']);
    expect(panchanga.observances.map((item) => item.name)).toEqual([
      'Māsika Śivarātri',
      'Maṅgalavāra Vrata',
    ]);
    const ephemeris = calculator.localEphemeris(2026, 8, 6, location)[10].grahas;
    expect(ephemeris.find((item) => item.name === 'Ketu')?.retrograde).toBe(false);
    expect(ephemeris.find((item) => item.name === 'Sun')?.longitude).toBeCloseTo(115.603181, 5);
    const chart = calculator.birthChart(
      { year: 1990, month: 1, day: 1, hour: 12, second: 17 },
      location,
    );
    expect(chart.ascendant.longitude).toBeCloseTo(344.459201, 5);
  });
});
