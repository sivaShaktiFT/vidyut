import SwissEPH from "sweph-wasm";
import { SOURCE_OBSERVANCES } from "./source-observances.js";
export { SOURCE_OBSERVANCES } from "./source-observances.js";

/** A civil Gregorian date at the requested location (not a UTC timestamp). */
export interface CivilDate { year: number; month: number; day: number }
export interface Location { latitude: number; longitude: number; /** Offset from UTC in hours, e.g. 5.5 for IST. Required unless `timeZone` is supplied. */ utcOffset?: number; /** IANA timezone, e.g. `Asia/Kolkata`. Handles DST for the requested date. */ timeZone?: string }
export type Ayanamsha = "raman" | "lahiri";
export interface PanchangaOptions { ayanamsha?: Ayanamsha }
export interface CalculateOptions { riseSetMethod?: "source-altitude" | "swiss" }
export interface Limb { index: number; name: string; endsAt: Date; /** True when no index crossing was bracketed before the source search horizon. */ bounded: boolean }
export interface TimeRange { start: Date; end: Date }
export interface DailyYoga { name: string; good: boolean; basis: "nakshatra" | "tithi"; endsAt: Date; bounded: boolean }
export interface HinduYear { samvatsara: string; vikramaSamvat: number; shakaSamvat: number; kaliYuga: number }
export interface Muhurtas { rahuKala: TimeRange; yamaganda: TimeRange; gulika: TimeRange; abhijit: TimeRange; brahma: TimeRange; durMuhurta1: TimeRange; durMuhurta2: TimeRange }
export interface Panchanga {
  date: CivilDate;
  location: Location;
  sunrise: Date;
  sunset: Date;
  moonrise: Date | null;
  moonset: Date | null;
  vara: { index: number; name: string };
  paksha: "Shukla" | "Krishna";
  lunarMonth: string;
  tithi: Limb;
  nakshatra: Limb & { pada: number };
  yoga: Limb;
  karana: Limb;
  hinduYear: HinduYear;
  dailyYogas: DailyYoga[];
  muhurtas: Muhurtas;
  observances: readonly SourceObservance[];
}

export const NAKSHATRAS = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishtha", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"] as const;
export const TITHIS = ["Pratipada", "Dvitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dvadashi", "Trayodashi", "Chaturdashi", "Purnima", "Pratipada", "Dvitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Navami", "Dashami", "Ekadashi", "Dvadashi", "Trayodashi", "Chaturdashi", "Amavasya"] as const;
export const YOGAS = ["Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarman", "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyana", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti"] as const;
export const VARAS = ["Ravivara", "Somavara", "Mangalavara", "Budhavara", "Guruvara", "Shukravara", "Shanivara"] as const;
export const RASHIS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"] as const;
export const GRAHAS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"] as const;
/** Display dictionaries for consumers that need the cited tools' English/Sanskrit labels. */
export const SOURCE_LABELS = {
  english: { rashis: RASHIS, nakshatras: NAKSHATRAS, tithis: TITHIS, yogas: YOGAS, varas: VARAS, grahas: GRAHAS },
  sanskrit: {
    rashis: ["Meṣa", "Vṛṣabha", "Mithuna", "Karkaṭa", "Siṃha", "Kanyā", "Tulā", "Vṛścika", "Dhanu", "Makara", "Kumbha", "Mīna"],
    nakshatras: ["Aśvinī", "Bharaṇī", "Kṛttikā", "Rohiṇī", "Mṛgaśirā", "Ārdrā", "Punarvasu", "Puṣya", "Āśleṣā", "Maghā", "Pūrva Phālgunī", "Uttara Phālgunī", "Hasta", "Citrā", "Svātī", "Viśākhā", "Anurādhā", "Jyeṣṭhā", "Mūla", "Pūrva Āṣāḍhā", "Uttara Āṣāḍhā", "Śravaṇa", "Dhaniṣṭhā", "Śatabhiṣā", "Pūrva Bhādrapadā", "Uttara Bhādrapadā", "Revatī"],
    tithis: ["Pratipadā", "Dvitīyā", "Tṛtīyā", "Caturthī", "Pañcamī", "Ṣaṣṭhī", "Saptamī", "Aṣṭamī", "Navamī", "Daśamī", "Ekādaśī", "Dvādaśī", "Trayodaśī", "Caturdaśī", "Pūrṇimā", "Pratipadā", "Dvitīyā", "Tṛtīyā", "Caturthī", "Pañcamī", "Ṣaṣṭhī", "Saptamī", "Aṣṭamī", "Navamī", "Daśamī", "Ekādaśī", "Dvādaśī", "Trayodaśī", "Caturdaśī", "Amāvāsyā"],
    yogas: ["Viṣkambha", "Prīti", "Āyuṣmān", "Saubhāgya", "Śobhana", "Atigaṇḍa", "Sukarmā", "Dhṛti", "Śūla", "Gaṇḍa", "Vṛddhi", "Dhruva", "Vyāghāta", "Harṣaṇa", "Vajra", "Siddhi", "Vyatīpāta", "Varīyān", "Parigha", "Śiva", "Siddha", "Sādhya", "Śubha", "Śukla", "Brahmā", "Indra", "Vaidhṛti"],
    varas: ["Ravivāra", "Somavāra", "Maṅgalavāra", "Budhavāra", "Guruvāra", "Śukravāra", "Śanivāra"],
    grahas: ["Sūrya", "Candra", "Kuja", "Budha", "Guru", "Śukra", "Śani", "Rāhu", "Ketu"]
  }
} as const;
const LUNAR_MONTHS = ["Chaitra", "Vaishakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada", "Ashvina", "Karttika", "Margashirsha", "Pausha", "Magha", "Phalguna"] as const;
const KARANAS = ["Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti", "Shakuni", "Chatushpada", "Naga", "Kimstughna"] as const;
const DAY_MS = 86_400_000;
const GRAHA_IDS = { Sun: 0, Moon: 1, Mars: 4, Mercury: 2, Jupiter: 5, Venus: 3, Saturn: 6, Rahu: 10 } as const;
const KARAKA_NAMES = ["Atmakaraka", "Amatyakaraka", "Bhratrikaraka", "Matrikaraka", "Putrakaraka", "Gnatikaraka", "Darakaraka", "Pitrikaraka"] as const;
const SAMVATSARAS = ["Prabhava","Vibhava","Shukla","Pramodoota","Prajotpatti","Angirasa","Shrimukha","Bhava","Yuva","Dhatri","Ishvara","Bahudhanya","Pramathi","Vikrama","Vrisha","Chitrabhanu","Svabhanu","Tarana","Parthiva","Vyaya","Sarvajit","Sarvadhari","Virodhi","Vikriti","Khara","Nandana","Vijaya","Jaya","Manmatha","Durmukhi","Hevilambi","Vilambi","Vikari","Sharvari","Plava","Shubhakrit","Shobhakrit","Krodhi","Vishvavasu","Parabhava","Plavanga","Kilaka","Saumya","Sadharana","Virodhikrit","Paridhavi","Pramadicha","Ananda","Rakshasa","Nala","Pingala","Kalayukti","Siddharthi","Raudra","Durmati","Dundubhi","Rudhirodgari","Raktakshi","Krodhana","Akshaya"] as const;
const DAILY_YOGA_RULES: Array<[string, boolean, "nakshatra" | "tithi", number[][]]> = [
  ["Amrita Siddhi", true, "nakshatra", [[6,10,14,22],[2,10,13,20],[0,5,12,17],[3,7,16,24],[1,8,15,23],[4,9,19,26],[6,11,18,25]]],
  ["Siddha", true, "tithi", [[1,4,6,9,14],[2,7,11,12],[3,5,10,13],[1,4,8,11,14],[2,5,6,9,12],[1,3,7,10,13],[4,6,8,11,15]]],
  ["Marana", false, "nakshatra", [[11,25],[4,18],[13,22],[8,21],[16,24],[3,26],[1,14]]],
  ["Prabalarishta", false, "tithi", [[8,14],[6,12],[7,15],[5,9],[10,13],[1,11],[3,4]]],
  ["Mrityu", false, "nakshatra", [[9],[15],[23],[3],[12],[20],[0]]],
  ["Dagdha", false, "tithi", [[12],[11],[5],[3],[6],[8],[9]]],
];
export interface GrahaPosition { name: typeof GRAHAS[number]; longitude: number; speed: number; retrograde: boolean; sign: number; signName: string; degreesInSign: number; nakshatra: string; pada: number }
export interface BirthTime extends CivilDate { hour: number; minute?: number; second?: number }
export interface BirthChart { julianDay: number; ascendant: GrahaPosition; grahas: GrahaPosition[] }
export interface CharaKaraka extends GrahaPosition { karaka: typeof KARAKA_NAMES[number]; karakaDegrees: number }
export interface DashaPeriod { planet: string; startJulianDay: number; endJulianDay: number; years: number; antardasha: DashaPeriod[] }
export interface VimshottariDasha { birthNakshatra: string; birthNakshatraLord: string; cycleYears: number; balanceYears: number; periods: DashaPeriod[] }
export interface YogaRule { name: string; test: (grahas: readonly GrahaPosition[], ascendant: GrahaPosition) => boolean }
export interface Observance { name: string; category: "major" | "regional" | "monthly" | "weekly"; region: string; lunarMonth?: string; tithi?: number | readonly number[]; weekday?: number; sunLongitude?: number }
export interface SourceObservance { name: string; cat: "major" | "regional" | "monthly" | "weekly"; region: string; type?: "solar" | "weekly"; lunarMonth?: string; tithi?: number | readonly number[]; weekday?: number; sunLonDeg?: number; aliases?: readonly string[]; desc: string }
export interface LunarMonthRange { mode: "amanta" | "purnimanta"; start: CivilDate; end: CivilDate; dates: CivilDate[] }
export interface TimelineSegment { limb: "tithi" | "nakshatra" | "yoga" | "karana"; index: number; name: string; start: Date; end: Date; bounded: boolean }

/** Converts a location's civil date and clock time to Julian Day (UT). */
export function civilDateToJulianDay(date: CivilDate, utcOffset: number, hour = 0): number {
  let y = date.year, m = date.month;
  const d = date.day + (hour - utcOffset) / 24;
  if (m <= 2) { y -= 1; m += 12; }
  const a = Math.floor(y / 100);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + 2 - a + Math.floor(a / 4) - 1524.5;
}

/** Converts Julian Day (UT) to a JavaScript instant. */
export function julianDayToCivilDate(jd: number, utcOffset: number): Date {
  void utcOffset; // retained for a symmetric, location-aware public API
  const unixMs = Math.round((jd - 2440587.5) * DAY_MS);
  return new Date(unixMs);
}

export function normalizeDegrees(value: number): number { return ((value % 360) + 360) % 360; }
export function tithiIndex(moonLongitude: number, sunLongitude: number): number { return Math.floor(normalizeDegrees(moonLongitude - sunLongitude) / 12); }
export function nakshatraIndex(moonLongitude: number): number { return Math.floor(normalizeDegrees(moonLongitude) / (360 / 27)); }
export function yogaIndex(moonLongitude: number, sunLongitude: number): number { return Math.floor(normalizeDegrees(moonLongitude + sunLongitude) / (360 / 27)); }
export function karanaIndex(moonLongitude: number, sunLongitude: number): number { return Math.floor(normalizeDegrees(moonLongitude - sunLongitude) / 6); }
export function karanaName(index: number): string {
  if (index === 0) return KARANAS[10];
  if (index >= 57) return KARANAS[index - 50] ?? KARANAS[10];
  return KARANAS[(index - 1) % 7];
}

/** Source-compatible B.V. Raman linear ayanamsha used by Default Horoscopes and Atmakaraka. */
export function sourceRamanAyanamsha(julianDay: number): number { return ((julianDay - 1858013) / 365.25 * 50.333333333) / 3600; }

/** Resolves a local civil date/time to JD using an IANA timezone, including daylight-saving changes. */
export function zonedCivilDateToJulianDay(date: CivilDate, timeZone: string, hour = 0): number {
  const local = new Date(Date.UTC(date.year, date.month - 1, date.day) + Math.round(hour * 3600) * 1000);
  const target = [local.getUTCFullYear(), local.getUTCMonth() + 1, local.getUTCDate(), local.getUTCHours(), local.getUTCMinutes(), local.getUTCSeconds()].join(":");
  const base = local.getTime();
  for (let delta = -14 * 60; delta <= 14 * 60; delta += 15) {
    const instant = new Date(base - delta * 60_000);
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(instant);
    const field = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    if ([field("year"), field("month"), field("day"), field("hour"), field("minute"), field("second")].join(":") === target) return instant.getTime() / DAY_MS + 2440587.5;
  }
  throw new RangeError(`The local time is invalid or ambiguous in ${timeZone}. Supply utcOffset to disambiguate it.`);
}

/** Sign index (0 = Aries) occupied by a sidereal longitude. */
export function signIndex(longitude: number): number { return Math.floor(normalizeDegrees(longitude) / 30); }

/** Returns the sign occupied by a longitude in a supported divisional chart. */
export function vargaSign(longitude: number, division: number): number {
  if (!Number.isInteger(division) || division < 1) throw new RangeError("division must be a positive integer.");
  const sign = signIndex(longitude), within = normalizeDegrees(longitude) % 30, odd = sign % 2 === 0;
  const part = (size: number) => Math.min(division - 1, Math.floor(within / size));
  switch (division) {
    case 1: return sign;
    case 2: return [[7,9],[1,11],[5,0],[3,6],[4,2],[2,3],[6,4],[0,5],[11,1],[9,7],[10,8],[8,10]][sign][within < 15 ? 0 : 1];
    case 3: return (sign + [0,4,8][part(10)]) % 12;
    case 4: return (sign + (odd ? 0 : 3) + part(7.5) * 3) % 12;
    case 7: return (sign + (odd ? 0 : 6) + part(30 / 7)) % 12;
    case 9: return Math.floor(normalizeDegrees(longitude) / (360 / 108)) % 12;
    case 10: return (sign + (odd ? 0 : 9) + part(3)) % 12;
    case 12: return (sign + part(2.5)) % 12;
    case 16: return ([0,4,8][sign % 3] + part(30 / 16)) % 12;
    case 20: return ([0,8,4][sign % 3] + part(1.5)) % 12;
    case 24: return ((odd ? 4 : 3) + part(1.25)) % 12;
    case 27: return ((sign % 4) * 3 + part(30 / 27)) % 12;
    case 30: { const limits = odd ? [[5,0],[10,9],[18,8],[25,5],[30,1]] : [[5,1],[10,5],[18,8],[25,9],[30,0]]; return limits.find(([limit]) => within < limit)?.[1] ?? limits[4][1]; }
    case 40: return ((odd ? 0 : 6) + part(.75)) % 12;
    case 45: return ([0,4,8][sign % 3] + part(30 / 45)) % 12;
    case 60: return (sign + part(.5)) % 12;
    default: return (sign + part(30 / division)) % 12;
  }
}

/** Source-compatible Parashari aspects: all grahas aspect the 7th, with Mars/Jupiter/Saturn special aspects. */
export function aspectedSigns(graha: string, fromSign: number): number[] { const offsets: Record<string, number[]> = { Mars:[4,7,8], Jupiter:[5,7,9], Saturn:[3,7,10] }; return (offsets[graha] ?? [7]).map((house) => (fromSign + house - 1) % 12); }
export function conjunctions(grahas: readonly GrahaPosition[], graha: GrahaPosition): GrahaPosition[] { return grahas.filter((item) => item.name !== graha.name && item.sign === graha.sign); }
/** Applies source-style yoga rules supplied by an application without coupling the engine to presentation data. */
export function evaluateYogas(grahas: readonly GrahaPosition[], ascendant: GrahaPosition, rules: readonly YogaRule[]): string[] { return rules.filter((rule) => rule.test(grahas, ascendant)).map((rule) => rule.name); }

/** Source-compatible Vimshottari hierarchy through pratyantardasha. */
export function calculateVimshottariDasha(moonLongitude: number, birthJulianDay: number, chartType: "Human" | "National" = "Human"): VimshottariDasha {
  const sequence = [["Ketu",7],["Venus",20],["Sun",6],["Moon",10],["Mars",7],["Rahu",18],["Jupiter",16],["Saturn",19],["Mercury",17]] as const, cycleYears = chartType === "National" ? 144 : 120, scale = cycleYears / 120, scaled = sequence.map(([planet, years]) => [planet, years * scale] as const), lords = ["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"];
  const nak = nakshatraIndex(moonLongitude), first = lords.indexOf(lords[nak % 9]), span = 360 / 27, balanceYears = scaled[first][1] * (1 - (normalizeDegrees(moonLongitude) % span) / span); let start = birthJulianDay;
  const create = (index: number, years: number): DashaPeriod => { const end = start + years * 365.25, subs: DashaPeriod[] = []; let subStart = start; for (let i = 0; i < 9; i += 1) { const [planet, subYears] = scaled[(index + i) % 9], subEnd = subStart + (years * subYears / cycleYears) * 365.25, pratyantardasha: DashaPeriod[] = []; let pratStart = subStart; for (let j = 0; j < 9; j += 1) { const [prat, pratYears] = scaled[(index + i + j) % 9], pratEnd = pratStart + (years * subYears * pratYears / (cycleYears * cycleYears)) * 365.25; pratyantardasha.push({ planet: prat, startJulianDay: pratStart, endJulianDay: pratEnd, years: (years * subYears * pratYears) / (cycleYears * cycleYears), antardasha: [] }); pratStart = pratEnd; } subs.push({ planet, startJulianDay: subStart, endJulianDay: subEnd, years: years * subYears / cycleYears, antardasha: pratyantardasha }); subStart = subEnd; } const period = { planet: scaled[index][0], startJulianDay: start, endJulianDay: end, years, antardasha: subs }; start = end; return period; };
  const periods = [create(first, balanceYears)]; for (let i = 1; i <= 8; i += 1) periods.push(create((first + i) % 9, scaled[(first + i) % 9][1])); return { birthNakshatra: NAKSHATRAS[nak], birthNakshatraLord: lords[nak % 9], cycleYears, balanceYears, periods };
}

export class PanchangaCalculator {
  private readonly swe: SwissEPH;
  private readonly flags: number;

  private constructor(swe: SwissEPH, ayanamsha: Ayanamsha) {
    this.swe = swe;
    this.swe.swe_set_sid_mode(ayanamsha === "lahiri" ? swe.SE_SIDM_LAHIRI : swe.SE_SIDM_RAMAN, 0, 0);
    this.flags = swe.SEFLG_SIDEREAL | swe.SEFLG_SPEED;
  }

  /** Creates a calculator in browser or Node and loads the required Swiss Ephemeris assets. */
  static async create(options: PanchangaOptions = {}): Promise<PanchangaCalculator> {
    const swe = await initialiseSwissEphemeris();
    await swe.swe_set_ephe_path();
    return new PanchangaCalculator(swe, options.ayanamsha ?? "raman");
  }

  /** Calculates source-compatible daily Panchanga data at local sunrise. */
  calculate(date: CivilDate, location: Location, options: CalculateOptions = {}): Panchanga {
    this.assertLocation(location);
    const offset = this.offset(location);
    const start = this.localJulianDay(date, location);
    const sourceCompatible = options.riseSetMethod !== "swiss";
    const sunrise = this.riseSet(start, this.swe.SE_SUN, location, false, sourceCompatible);
    const sunset = this.riseSet(start, this.swe.SE_SUN, location, true, sourceCompatible);
    if (sunrise === null || sunset === null) throw new RangeError("Sunrise or sunset does not occur on this civil date at this location.");
    const moonrise = this.riseSet(start, this.swe.SE_MOON, location, false, sourceCompatible);
    const moonset = this.riseSet(start, this.swe.SE_MOON, location, true, sourceCompatible);
    const atSunrise = this.longitudes(sunrise);
    const ti = tithiIndex(atSunrise.moon, atSunrise.sun);
    const nk = nakshatraIndex(atSunrise.moon);
    const yo = yogaIndex(atSunrise.moon, atSunrise.sun);
    const ka = karanaIndex(atSunrise.moon, atSunrise.sun);
    const weekday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
    const end = (index: number, span: number, fn: (p: Longitudes) => number) => this.findTransition(sunrise, sunrise + span, index, fn);
    const tithiEnd = end(ti, 1.5, p => tithiIndex(p.moon, p.sun)), nakEnd = end(nk, 1.5, p => nakshatraIndex(p.moon)), yogaEnd = end(yo, 1.5, p => yogaIndex(p.moon, p.sun)), karanaEnd = end(ka, .75, p => karanaIndex(p.moon, p.sun));
    const toDate = (jd: number) => julianDayToCivilDate(jd, offset);
    const dailyYogas = this.dailyYogas(weekday, nk, ti, nakEnd, tithiEnd, toDate);
    const panchanga: Panchanga = {
      date, location,
      sunrise: toDate(sunrise), sunset: toDate(sunset), moonrise: moonrise === null ? null : toDate(moonrise), moonset: moonset === null ? null : toDate(moonset),
      vara: { index: weekday, name: VARAS[weekday] }, paksha: ti < 15 ? "Shukla" : "Krishna",
      lunarMonth: LUNAR_MONTHS[(Math.floor(atSunrise.sun / 30) + 1) % 12],
      tithi: { index: ti, name: TITHIS[ti], endsAt: toDate(tithiEnd.jd), bounded: tithiEnd.bounded }, nakshatra: { index: nk, name: NAKSHATRAS[nk], pada: Math.floor((atSunrise.moon % (360 / 27)) / (360 / 108)) + 1, endsAt: toDate(nakEnd.jd), bounded: nakEnd.bounded }, yoga: { index: yo, name: YOGAS[yo], endsAt: toDate(yogaEnd.jd), bounded: yogaEnd.bounded }, karana: { index: ka, name: karanaName(ka), endsAt: toDate(karanaEnd.jd), bounded: karanaEnd.bounded },
      hinduYear: this.hinduYear(date, LUNAR_MONTHS[(Math.floor(atSunrise.sun / 30) + 1) % 12]), dailyYogas,
      muhurtas: this.muhurtas(toDate(sunrise), toDate(sunset), weekday), observances: []
    };
    panchanga.observances = this.observances(panchanga, SOURCE_OBSERVANCES);
    return panchanga;
  }

  /** Gregorian-month table used by the source Monthly Panchanga view. */
  monthlyPanchanga(year: number, month: number, location: Location, options: CalculateOptions = {}): Panchanga[] {
    if (!Number.isInteger(month) || month < 1 || month > 12) throw new RangeError("month must be 1 through 12.");
    const days = new Date(Date.UTC(year, month, 0)).getUTCDate(); return Array.from({ length: days }, (_, index) => this.calculate({ year, month, day: index + 1 }, location, options));
  }

  /** Source monthly-view lunar-date range, bounded by Amavasya (amanta) or Purnima (purnimanta) onset. */
  lunarMonthRange(anchor: CivilDate, location: Location, mode: "amanta" | "purnimanta" = "amanta"): LunarMonthRange {
    const target = mode === "amanta" ? 29 : 14, candidates = Array.from({ length: 71 }, (_, i) => shiftDate({ year: anchor.year, month: anchor.month, day: 1 }, i - 20)); let prior: number | undefined; const boundaries: CivilDate[] = [];
    for (const date of candidates) { const atSix = this.longitudes(this.localJulianDay(date, location, 6)), index = tithiIndex(atSix.moon, atSix.sun); if (prior === target && index !== target) boundaries.push(date); prior = index; }
    if (boundaries.length < 2) throw new RangeError("Could not find two lunar-month boundaries in the source search window.");
    const center = Date.UTC(anchor.year, anchor.month - 1, 15); let start = boundaries[0], end = boundaries[1];
    for (let i = 0; i < boundaries.length - 1; i += 1) if (Date.UTC(boundaries[i].year, boundaries[i].month - 1, boundaries[i].day) <= center && center <= Date.UTC(boundaries[i + 1].year, boundaries[i + 1].month - 1, boundaries[i + 1].day)) { start = boundaries[i]; end = boundaries[i + 1]; break; }
    const dates: CivilDate[] = []; for (let date = start; Date.UTC(date.year, date.month - 1, date.day) < Date.UTC(end.year, end.month - 1, end.day); date = shiftDate(date, 1)) dates.push(date); return { mode, start, end, dates };
  }

  /** Sunrise-to-next-sunrise limb timeline used by the daily Panchanga widget. */
  timeline(date: CivilDate, location: Location, options: CalculateOptions = {}): TimelineSegment[] {
    const day = this.calculate(date, location, options), offset = this.offset(location), start = day.sunrise.getTime() / DAY_MS + 2440587.5, end = start + 1, specs: Array<[TimelineSegment["limb"], (p: Longitudes) => number, readonly string[], number]> = [["tithi", p => tithiIndex(p.moon, p.sun), TITHIS, 1.5], ["nakshatra", p => nakshatraIndex(p.moon), NAKSHATRAS, 1.5], ["yoga", p => yogaIndex(p.moon, p.sun), YOGAS, 1.5], ["karana", p => karanaIndex(p.moon, p.sun), KARANAS, .75]];
    return specs.flatMap(([limb, getIndex, names, span]) => { const result: TimelineSegment[] = []; let current = start, index = getIndex(this.longitudes(current)); while (current < end && result.length < 20) { const found = this.findTransition(current, current + span, index, getIndex), transition = Math.min(found.jd, end); result.push({ limb, index, name: limb === "karana" ? karanaName(index) : names[index], start: julianDayToCivilDate(current, offset), end: julianDayToCivilDate(transition, offset), bounded: found.bounded }); if (transition >= end) break; current = transition; index = getIndex(this.longitudes(current + .000001)); } return result; });
  }

  /** Applies source festival matching rules to caller-supplied or bundled observances. */
  observances<T extends Observance | SourceObservance>(panchanga: Panchanga, observances: readonly T[]): T[] {
    const sunrise = panchanga.sunrise.getTime() / DAY_MS + 2440587.5, sun = this.longitudes(sunrise).sun, dominantTithi = panchanga.tithi.endsAt.getTime() < (panchanga.sunrise.getTime() + panchanga.sunset.getTime()) / 2 ? (panchanga.tithi.index + 1) % 30 : panchanga.tithi.index;
    return observances.filter((item) => { const solar = "sunLongitude" in item ? item.sunLongitude : "sunLonDeg" in item ? item.sunLonDeg : undefined; return (solar === undefined || Math.abs(normalizeDegrees(sun) - solar) < 1 || Math.abs(normalizeDegrees(sun) - solar) > 359) && (item.lunarMonth === undefined || item.lunarMonth === panchanga.lunarMonth) && (item.tithi === undefined || (Array.isArray(item.tithi) ? item.tithi : [item.tithi]).includes(dominantTithi)) && (item.weekday === undefined || item.weekday === panchanga.vara.index); });
  }

  /** Sidereal positions of the nine grahas. This powers the ephemeris and chart APIs. */
  grahas(julianDay: number, nodeMotion: "natal" | "ephemeris" = "natal"): GrahaPosition[] {
    const result: GrahaPosition[] = [];
    for (const [name, id] of Object.entries(GRAHA_IDS) as [keyof typeof GRAHA_IDS, number][]) result.push(this.position(name, id, julianDay));
    const rahu = result.find((item) => item.name === "Rahu")!;
    result.push(this.decorate("Ketu", normalizeDegrees(rahu.longitude + 180), 0, nodeMotion === "natal"));
    return result;
  }

  /** Daily sidereal ephemeris for a Gregorian month, sampled at a UTC hour. */
  ephemeris(year: number, month: number, hourUtc = 0): Array<{ date: CivilDate; julianDay: number; grahas: GrahaPosition[] }> {
    if (!Number.isInteger(month) || month < 1 || month > 12) throw new RangeError("month must be 1 through 12.");
    const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return Array.from({ length: count }, (_, i) => { const date = { year, month, day: i + 1 }; const julianDay = civilDateToJulianDay(date, 0, hourUtc); return { date, julianDay, grahas: this.grahas(julianDay, "ephemeris") }; });
  }

  /** Source-style ephemeris sampled at a local clock hour, with prior-day ingress metadata. */
  localEphemeris(year: number, month: number, localHour: number, location: Pick<Location, "utcOffset" | "timeZone">): Array<{ date: CivilDate; julianDay: number; grahas: Array<GrahaPosition & { ingress: boolean; dignity: string; combust: boolean }> }> {
    const count = new Date(Date.UTC(year, month, 0)).getUTCDate(); const prior = new Date(Date.UTC(year, month - 1, 0)); let previous = this.grahas(this.localJulianDay({ year: prior.getUTCFullYear(), month: prior.getUTCMonth() + 1, day: prior.getUTCDate() }, location, localHour), "ephemeris");
    return Array.from({ length: count }, (_, i) => { const date = { year, month, day: i + 1 }, julianDay = this.localJulianDay(date, location, localHour), grahas = this.grahas(julianDay, "ephemeris"); const sun = grahas[0].longitude; const annotated = grahas.map((p, index) => ({ ...p, ingress: p.sign !== previous[index].sign, dignity: dignity(p.name, p.sign, p.degreesInSign), combust: combust(p.name, p.longitude, sun) })); previous = grahas; return { date, julianDay, grahas: annotated }; });
  }

  /** Computes a natal chart's grahas and sidereal ascendant. */
  birthChart(birth: BirthTime, location: Location): BirthChart {
    this.assertLocation(location);
    const hour = birth.hour + (birth.minute ?? 0) / 60 + (birth.second ?? 0) / 3600;
    const julianDay = this.localJulianDay(birth, location, hour), ayanamsha = sourceRamanAyanamsha(julianDay);
    const ascendant = normalizeDegrees(this.swe.swe_houses(julianDay, location.latitude, location.longitude, "W").ascmc[0] - ayanamsha);
    return { julianDay, ascendant: this.decorate("Ascendant", ascendant, 0, false), grahas: this.sourceGrahas(julianDay, ayanamsha) };
  }

  /** Jaimini eight-chara-karaka hierarchy, using sign degrees and retrograde reversal. */
  atmakaraka(birth: BirthTime, location: Location): CharaKaraka[] {
    const chart = this.birthChart(birth, location);
    return chart.grahas.filter((p) => p.name !== "Ketu").map((p) => ({ ...p, karakaDegrees: p.retrograde ? 30 - p.degreesInSign : p.degreesInSign }))
      .sort((a, b) => b.karakaDegrees - a.karakaDegrees).map((p, index) => ({ ...p, karaka: KARAKA_NAMES[index] }));
  }

  /** Source chart module's Vimshottari dasha based on source-compatible natal Moon longitude. */
  vimshottariDasha(birth: BirthTime, location: Location, chartType: "Human" | "National" = "Human"): VimshottariDasha { const chart = this.birthChart(birth, location); return calculateVimshottariDasha(chart.grahas.find((item) => item.name === "Moon")!.longitude, chart.julianDay, chartType); }

  private longitudes(jd: number): Longitudes {
    const sun = normalizeDegrees(this.swe.swe_calc_ut(jd, this.swe.SE_SUN, this.flags)[0]);
    const moon = normalizeDegrees(this.swe.swe_calc_ut(jd, this.swe.SE_MOON, this.flags)[0]);
    return { sun, moon };
  }
  private position(name: keyof typeof GRAHA_IDS, id: number, jd: number): GrahaPosition {
    const data = this.swe.swe_calc_ut(jd, id, this.flags);
    return this.decorate(name, data[0], data[3], data[3] < 0);
  }
  private sourceGrahas(jd: number, ayanamsha: number): GrahaPosition[] {
    const flags = this.swe.SEFLG_SPEED;
    const result = (Object.entries(GRAHA_IDS) as [keyof typeof GRAHA_IDS, number][]).map(([name, id]) => { const data = this.swe.swe_calc_ut(jd, id, flags); return this.decorate(name, normalizeDegrees(data[0] - ayanamsha), data[3], data[3] < 0); });
    const rahu = result.find((item) => item.name === "Rahu")!; result.push(this.decorate("Ketu", rahu.longitude + 180, 0, true)); return result;
  }
  private decorate(name: string, longitude: number, speed: number, retrograde: boolean): GrahaPosition {
    const lon = normalizeDegrees(longitude), sign = signIndex(lon), within = lon % 30, nak = nakshatraIndex(lon);
    return { name: name as GrahaPosition["name"], longitude: lon, speed, retrograde, sign, signName: RASHIS[sign], degreesInSign: within, nakshatra: NAKSHATRAS[nak], pada: Math.floor((lon % (360 / 27)) / (360 / 108)) + 1 };
  }
  private riseSet(start: number, body: number, location: Location, set: boolean, sourceCompatible: boolean): number | null {
    if (sourceCompatible) {
      const horizon = body === this.swe.SE_SUN ? -0.8333 : .125, samples = 48;
      let prior = this.altitude(start, body, location), priorJd = start;
      for (let i = 1; i <= samples; i += 1) { const jd = start + i / samples, current = this.altitude(jd, body, location); if ((prior < horizon) !== (current < horizon)) { const rising = prior < horizon; if (rising !== set) return this.altitudeCrossing(priorJd, jd, body, location, horizon); } prior = current; priorJd = jd; }
    }
    try {
      const result = this.swe.swe_rise_trans(start, body, null, 0, set ? this.swe.SE_CALC_SET : this.swe.SE_CALC_RISE, [location.longitude, location.latitude, 0], 0, 0);
      if (Number.isFinite(result) && result >= start && result < start + 1) return result;
    } catch { /* source continues with an approximation */ }
    return sourceCompatible ? this.riseSetFallback(start, body, set, location) : null;
  }
  private altitudeCrossing(lo: number, hi: number, body: number, location: Location, horizon: number): number { const below = this.altitude(lo, body, location) < horizon; for (let i = 0; i < 40; i += 1) { const mid = (lo + hi) / 2; if ((this.altitude(mid, body, location) < horizon) === below) lo = mid; else hi = mid; } return (lo + hi) / 2; }
  private altitude(jd: number, body: number, location: Location): number {
    const data = this.swe.swe_calc_ut(jd, body, this.swe.SEFLG_EQUATORIAL), ra = data[0] * Math.PI / 180, dec = data[1] * Math.PI / 180;
    const t = (jd - 2451545) / 36525, gmst = normalizeDegrees(280.46061837 + 360.98564736629 * (jd - 2451545) + .000387933 * t * t - t * t * t / 38710000), ha = (gmst + location.longitude) * Math.PI / 180 - ra, lat = location.latitude * Math.PI / 180;
    return Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha)) * 180 / Math.PI;
  }
  /** Final deployed-widget fallback for dates without a detected horizon crossing. */
  private riseSetFallback(start: number, body: number, set: boolean, location: Location): number {
    if (body === this.swe.SE_SUN) {
      const date = new Date((start - 2440587.5) * DAY_MS), yearStart = Date.UTC(date.getUTCFullYear(), 0, 0), dayOfYear = Math.floor((date.getTime() - yearStart) / DAY_MS), lat = location.latitude * Math.PI / 180;
      const declination = -23.45 * Math.cos(2 * Math.PI * (dayOfYear + 10) / 365) * Math.PI / 180;
      const hourAngle = Math.acos(Math.max(-1, Math.min(1, -Math.tan(lat) * Math.tan(declination)))) * 180 / Math.PI;
      const b = 2 * Math.PI * (dayOfYear - 81) / 365, equationOfTime = (9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b)) / 60;
      const hourUtc = 12 - location.longitude / 15 - equationOfTime + (set ? hourAngle : -hourAngle) / 15;
      return start + (hourUtc + this.offset(location)) / 24;
    }
    const sunrise = this.riseSetFallback(start, this.swe.SE_SUN, false, location), positions = this.longitudes(sunrise), elongation = normalizeDegrees(positions.moon - positions.sun);
    return sunrise + (elongation / 360) * 24.8 / 24 + (set ? .5 : 0);
  }
  private findTransition(start: number, end: number, current: number, index: (p: Longitudes) => number): { jd: number; bounded: boolean } {
    if (index(this.longitudes(end)) === current) return { jd: end, bounded: true };
    let lo = start, hi = end;
    for (let i = 0; i < 28; i += 1) { const mid = (lo + hi) / 2; if (index(this.longitudes(mid)) === current) lo = mid; else hi = mid; }
    return { jd: hi, bounded: false };
  }
  private localJulianDay(date: CivilDate, location: Pick<Location, "utcOffset" | "timeZone">, hour = 0): number { return location.timeZone ? zonedCivilDateToJulianDay(date, location.timeZone, hour) : civilDateToJulianDay(date, this.offset(location), hour); }
  private offset(location: Pick<Location, "utcOffset" | "timeZone">): number { if (Number.isFinite(location.utcOffset)) return location.utcOffset!; if (!location.timeZone) throw new RangeError("Specify utcOffset or timeZone."); const parts = new Intl.DateTimeFormat("en-US", { timeZone: location.timeZone, timeZoneName: "longOffset" }).formatToParts(new Date()); const value = parts.find((p) => p.type === "timeZoneName")?.value ?? ""; const match = value.match(/GMT([+-])(\d{2}):?(\d{2})/); if (!match) throw new RangeError(`Could not resolve offset for ${location.timeZone}.`); return (match[1] === "+" ? 1 : -1) * (Number(match[2]) + Number(match[3]) / 60); }
  private hinduYear(date: CivilDate, lunarMonth: string): HinduYear { const base = date.month < 3 || (date.month === 3 && ["Margashirsha", "Pausha", "Magha", "Phalguna"].includes(lunarMonth)) ? date.year - 1 : date.year; return { samvatsara: SAMVATSARAS[((base - 1987) % 60 + 60) % 60], vikramaSamvat: base + 57, shakaSamvat: base - 78, kaliYuga: base + 3101 }; }
  private dailyYogas(weekday: number, nakshatra: number, tithi: number, nakEnd: { jd: number; bounded: boolean }, tithiEnd: { jd: number; bounded: boolean }, toDate: (jd: number) => Date): DailyYoga[] { return DAILY_YOGA_RULES.flatMap(([name, good, basis, values]) => { const end = basis === "nakshatra" ? nakEnd : tithiEnd; return values[weekday].includes(basis === "nakshatra" ? nakshatra : tithi % 15 + 1) ? [{ name, good, basis, endsAt: toDate(end.jd), bounded: end.bounded }] : []; }); }
  private muhurtas(sunrise: Date, sunset: Date, weekday: number): Muhurtas { const duration = sunset.getTime() - sunrise.getTime(), eighth = duration / 8, segment = (index: number): TimeRange => ({ start: new Date(sunrise.getTime() + index * eighth), end: new Date(sunrise.getTime() + (index + 1) * eighth) }), range = (start: number, end: number): TimeRange => ({ start: new Date(start), end: new Date(end) }), noon = (sunrise.getTime() + sunset.getTime()) / 2, fifteenth = duration / 15, d1 = [10,6,2,5,9,1,3][weekday], d2 = [14,8,4,7,13,3,5][weekday]; return { rahuKala: segment([7,1,6,4,5,3,2][weekday]), yamaganda: segment([4,3,2,1,0,6,5][weekday]), gulika: segment([6,5,4,3,2,1,0][weekday]), abhijit: range(noon - 28 * 60000, noon + 28 * 60000), brahma: range(sunrise.getTime() - 96 * 60000, sunrise.getTime() - 48 * 60000), durMuhurta1: range(sunrise.getTime() + d1 * fifteenth, sunrise.getTime() + (d1 + 1) * fifteenth), durMuhurta2: range(sunrise.getTime() + d2 * fifteenth, sunrise.getTime() + (d2 + 1) * fifteenth) }; }
  private assertLocation(location: Location): void {
    if (!Number.isFinite(location.latitude) || location.latitude < -90 || location.latitude > 90 || !Number.isFinite(location.longitude) || location.longitude < -180 || location.longitude > 180 || (!Number.isFinite(location.utcOffset) && !location.timeZone)) throw new RangeError("Location must contain valid latitude, longitude, and either utcOffset or timeZone.");
  }
}
interface Longitudes { sun: number; moon: number }

/** Makes sweph-wasm's file URL work in Node while leaving browser fetching untouched. */
async function initialiseSwissEphemeris(): Promise<SwissEPH> {
  const processLike = (globalThis as typeof globalThis & { process?: { versions?: { node?: string } } }).process;
  if (!processLike?.versions?.node) return SwissEPH.init();
  const { readFile } = await import("node:fs/promises"), originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = input instanceof URL ? input : new URL(typeof input === "string" ? input : input.url);
    if (url.protocol === "file:") return new Response(await readFile(url));
    return originalFetch(input, init);
  };
  try { return await SwissEPH.init(); } finally { globalThis.fetch = originalFetch; }
}

const DIGNITIES: Record<string, [number, number, number[], number, number, number]> = { Sun:[0,6,[4],4,0,20], Moon:[1,7,[3],1,0,30], Mercury:[5,11,[2,5],5,16,20], Venus:[11,5,[1,6],6,0,15], Mars:[9,3,[0,7],0,0,12], Jupiter:[3,9,[8,11],8,0,10], Saturn:[6,0,[9,10],10,0,20], Rahu:[2,8,[],-1,0,0], Ketu:[8,2,[],-1,0,0] };
function dignity(name: string, sign: number, degrees: number): string { const [exalt, debil, own, mt, from, to] = DIGNITIES[name] ?? [-1,-1,[],-1,0,0]; return sign === exalt ? "exalted" : sign === debil ? "debilitated" : sign === mt && degrees >= from && degrees < to ? "moolatrikona" : own.includes(sign) ? "own-sign" : "normal"; }
function combust(name: string, longitude: number, sun: number): boolean { const orb: Record<string, number> = { Moon:12, Mercury:12, Venus:10, Mars:17, Jupiter:11, Saturn:15 }; const distance = Math.abs(normalizeDegrees(longitude - sun)); return !!orb[name] && Math.min(distance, 360 - distance) < orb[name]; }
function shiftDate(date: CivilDate, days: number): CivilDate { const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days)); return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() }; }
