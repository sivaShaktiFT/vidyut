//! A universal WebAssembly API for the Vidyut Sanskrit toolkit.
//!
//! This crate intentionally presents the independent Vidyut tools as one npm package. Build it
//! with `wasm-pack` to generate the JavaScript loader and TypeScript declarations.

use serde::{Deserialize, Serialize};
use std::sync::OnceLock;
use vidyut_chandas::{Chandas as RustChandas, MatchType, Weight};
use vidyut_lipi::{detect as detect_scheme, Lipika, Scheme};
use vidyut_sandhi::{generate_rules, Kind, Rule, Split, SplitsMap, Splitter};
use wasm_bindgen::prelude::*;

// wasm-bindgen appends this declaration to the generated `.d.ts` file. It documents the JSON
// values crossing the wasm boundary while keeping the runtime representation cheap.
#[wasm_bindgen(typescript_custom_section)]
const TYPESCRIPT_TYPES: &str = r#"
/** A syllable found during metre scanning. */
export interface Akshara { text: string; weight: "G" | "L"; }
/** The best matching metre for a text. */
export interface Classification {
  name: string | null;
  matchType: "none" | "prefix" | "pada" | "full";
  aksharas: Akshara[][];
}
/** Every metre that matches a text. */
export interface Classifications {
  names: string[];
  matchTypes: Array<Classification["matchType"]>;
  aksharas: Akshara[][];
}
/** An external sandhi rule: `first + second → result`. */
export interface SandhiRule { first: string; second: string; result: string; }
/** A possible reverse-sandhi analysis. */
export interface SandhiSplit {
  first: string;
  second: string;
  isValid: boolean;
  isEndOfChunk: boolean;
  kind: "prefix" | "standard";
}
/** A rule applied during a Paninian derivation. */
export interface PrakriyaRule { source: string; code: string; }
export interface PrakriyaStepTerm { text: string; wasChanged: boolean; }
export interface PrakriyaStep { rule: PrakriyaRule; result: PrakriyaStepTerm[]; }
export interface Prakriya { text: string; history: PrakriyaStep[]; }

export interface DhatuArgs {
  aupadeshika: string;
  gana: string;
  antargana?: string;
  sanadi: string[];
  prefixes: string[];
}
export type KrdantaArgs = {
  dhatu: DhatuArgs;
  lakara?: string;
  prayoga?: string;
  upapada?: { stem: string; linga: string; vibhakti: string; vacana: string };
} & (
  | { krt: string; unadi?: never }
  | { unadi: string; krt?: never }
);
export type PratipadikaArgs =
  | { basic: string; nyap?: never; krdanta?: never; taddhitanta?: never }
  | { nyap: string; basic?: never; krdanta?: never; taddhitanta?: never }
  | { krdanta: KrdantaArgs; basic?: never; nyap?: never; taddhitanta?: never }
  | { taddhitanta: { stem: string; taddhita: string }; basic?: never; nyap?: never; krdanta?: never };
export interface SubantaArgs { pratipadika: PratipadikaArgs; linga: string; vibhakti: string; vacana: string; }
export interface TinantaArgs {
  dhatu: DhatuArgs;
  lakara: string;
  prayoga: string;
  purusha: string;
  vacana: string;
  skip_at_agama: boolean;
  pada?: string;
}
export interface TaddhitantaArgs { pratipadika: PratipadikaArgs; taddhita: string; }
"#;

const SLP1_LETTERS: &[u8] = b"aAiIuUfFxXeEoOkKgGNcCjJYwWqQRtTdDnpPbBmyrlvSzshMLH";
const DEFAULT_METERS_JSON: &str = include_str!("../data/meters.json");
static DEFAULT_CHANDAS: OnceLock<RustChandas> = OnceLock::new();

fn is_slp1_text_byte(byte: u8) -> bool {
    SLP1_LETTERS.contains(&byte)
        || matches!(byte, b' ' | b'\t' | b'\n' | b'\r' | b'\'' | b'|' | b'~')
}

fn ensure_slp1_text(input: &str, api: &str) -> Result<(), JsError> {
    if let Some(byte) = input.bytes().find(|byte| !is_slp1_text_byte(*byte)) {
        Err(JsError::new(&format!(
            "{api} accepts SLP1 text only (invalid character: {:?})",
            byte as char
        )))
    } else {
        Ok(())
    }
}

fn to_js_value<T: Serialize>(value: &T) -> Result<JsValue, JsError> {
    serde_wasm_bindgen::to_value(value).map_err(|error| JsError::new(&error.to_string()))
}

/// Transliterate Sanskrit text between any two supported scripts or encodings.
#[wasm_bindgen]
pub fn transliterate(input: &str, from: Scheme, to: Scheme) -> String {
    Lipika::new().transliterate(input, from, to)
}

/// Detect the most likely input scheme.
///
/// If the input is ambiguous, this returns `Scheme::HarvardKyoto`, matching Vidyut's native API.
#[wasm_bindgen]
pub fn detect(input: &str) -> Scheme {
    detect_scheme(input).unwrap_or(Scheme::HarvardKyoto)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WebAkshara {
    text: String,
    weight: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WebMatch {
    name: Option<String>,
    match_type: &'static str,
    aksharas: Vec<Vec<WebAkshara>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WebMatches {
    names: Vec<String>,
    match_types: Vec<&'static str>,
    aksharas: Vec<Vec<WebAkshara>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WebMeterMatch {
    name: String,
    match_type: &'static str,
}

#[derive(Deserialize)]
struct MeterCatalogue {
    meters: Vec<MeterDefinition>,
}

#[derive(Deserialize)]
struct MeterDefinition {
    name: String,
    kind: String,
    pattern: String,
}

fn web_weight(weight: Weight) -> &'static str {
    match weight {
        Weight::G => "G",
        Weight::L => "L",
    }
}

fn web_match_type(match_type: MatchType) -> &'static str {
    match match_type {
        MatchType::None => "none",
        MatchType::Prefix => "prefix",
        MatchType::Pada => "pada",
        MatchType::Full => "full",
    }
}

fn web_aksharas(rows: &[Vec<vidyut_chandas::Akshara>]) -> Vec<Vec<WebAkshara>> {
    rows.iter()
        .map(|row| {
            row.iter()
                .map(|a| WebAkshara {
                    text: a.text().to_owned(),
                    weight: web_weight(a.weight()),
                })
                .collect()
        })
        .collect()
}

fn default_chandas() -> RustChandas {
    DEFAULT_CHANDAS
        .get_or_init(|| {
            let catalogue: MeterCatalogue = serde_json::from_str(DEFAULT_METERS_JSON)
                .expect("bundled metre JSON must be valid at build time");
            let meters_tsv = catalogue
                .meters
                .into_iter()
                .map(|meter| format!("{}\t{}\t{}", meter.name, meter.kind, meter.pattern))
                .collect::<Vec<_>>()
                .join("\n");
            RustChandas::from_text(meters_tsv)
                .expect("bundled metre definitions must be valid at build time")
        })
        .clone()
}

/// Classify Sanskrit verse against Vidyut's bundled traditional-vrtta catalogue.
#[wasm_bindgen]
pub struct Chandas {
    inner: RustChandas,
}

#[wasm_bindgen]
impl Chandas {
    /// Create a metre classifier with Vidyut's bundled catalogue of traditional vrittas.
    #[wasm_bindgen(constructor)]
    pub fn new() -> Chandas {
        Chandas {
            inner: default_chandas(),
        }
    }

    /// Return the best matching metre for SLP1 text.
    pub fn classify(&self, text: &str) -> Result<JsValue, JsError> {
        ensure_slp1_text(text, "Chandas")?;
        let result = self.inner.classify(text);
        let value = WebMatch {
            name: result.padya().as_ref().map(|padya| padya.name().to_owned()),
            match_type: web_match_type(result.match_type()),
            aksharas: web_aksharas(result.aksharas()),
        };
        to_js_value(&value)
    }

    /// Return every matching metre for SLP1 text.
    #[wasm_bindgen(js_name = classifyAll)]
    pub fn classify_all(&self, text: &str) -> Result<JsValue, JsError> {
        ensure_slp1_text(text, "Chandas")?;
        let result = self.inner.classify_all(text);
        let value = WebMatches {
            names: result
                .padyas()
                .iter()
                .map(|padya| padya.name().to_owned())
                .collect(),
            match_types: result
                .match_types()
                .iter()
                .map(|m| web_match_type(*m))
                .collect(),
            aksharas: web_aksharas(result.aksharas()),
        };
        to_js_value(&value)
    }

    /// Return every bundled metre that matches SLP1 text.
    ///
    /// Each result includes `full`, `pada`, or `prefix` match strength.
    #[wasm_bindgen(js_name = findMeters)]
    pub fn find_meters(&self, text: &str) -> Result<JsValue, JsError> {
        ensure_slp1_text(text, "Chandas")?;
        let result = self.inner.classify_all(text);
        let matches: Vec<WebMeterMatch> = result
            .padyas()
            .iter()
            .zip(result.match_types())
            .map(|(padya, match_type)| WebMeterMatch {
                name: padya.name().to_owned(),
                match_type: web_match_type(*match_type),
            })
            .collect();
        to_js_value(&matches)
    }
}

#[derive(Serialize)]
struct WebRule {
    first: String,
    second: String,
    result: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WebSplit {
    first: String,
    second: String,
    is_valid: bool,
    is_end_of_chunk: bool,
    kind: &'static str,
}

fn splitter_from_rules(rules: &[Rule]) -> Splitter {
    let mut map = SplitsMap::new();
    for rule in rules {
        map.insert(
            rule.result().to_owned(),
            (rule.first().to_owned(), rule.second().to_owned()),
        );
        let compact_result = rule.result().replace(' ', "");
        if compact_result != rule.result() {
            map.insert(
                compact_result,
                (rule.first().to_owned(), rule.second().to_owned()),
            );
        }
    }
    Splitter::from_map(map)
}

fn web_split(split: Split) -> WebSplit {
    WebSplit {
        first: split.first().to_owned(),
        second: split.second().to_owned(),
        is_valid: split.is_valid(),
        is_end_of_chunk: split.is_end_of_chunk(),
        kind: match split.kind() {
            Kind::Prefix => "prefix",
            Kind::Standard => "standard",
        },
    }
}

/// Join and split external sandhi in SLP1.
#[wasm_bindgen]
pub struct Sandhi {
    rules: Vec<Rule>,
    splitter: Splitter,
}

#[wasm_bindgen]
impl Sandhi {
    /// Create an engine using Vidyut's built-in external-sandhi rules.
    #[wasm_bindgen(constructor)]
    pub fn new() -> Sandhi {
        let rules = generate_rules();
        let splitter = splitter_from_rules(&rules);
        Sandhi { rules, splitter }
    }

    /// Join two SLP1 words, selecting the most specific matching rule.
    pub fn join(&self, first: &str, second: &str) -> Result<String, JsError> {
        ensure_slp1_text(first, "Sandhi")?;
        ensure_slp1_text(second, "Sandhi")?;
        if first.is_empty() || second.is_empty() {
            return Ok(format!("{first}{second}"));
        }
        // Rules are generated in precedence order. Preserve that order for equally specific
        // matches instead of relying on Iterator::max_by_key's incidental tie behavior.
        let best = self
            .rules
            .iter()
            .filter(|rule| first.ends_with(rule.first()) && second.starts_with(rule.second()))
            .fold(None, |best: Option<&Rule>, rule| match best {
                Some(existing)
                    if existing.first().len() + existing.second().len()
                        >= rule.first().len() + rule.second().len() =>
                {
                    Some(existing)
                }
                _ => Some(rule),
            });
        match best {
            Some(rule) => Ok(format!(
                "{}{}{}",
                &first[..first.len() - rule.first().len()],
                rule.result(),
                &second[rule.second().len()..]
            )),
            None => Ok(format!("{first}{second}")),
        }
    }

    /// Return all generated external-sandhi rules.
    pub fn rules(&self) -> Result<JsValue, JsError> {
        let rules: Vec<WebRule> = self
            .rules
            .iter()
            .map(|rule| WebRule {
                first: rule.first().to_owned(),
                second: rule.second().to_owned(),
                result: rule.result().to_owned(),
            })
            .collect();
        to_js_value(&rules)
    }

    /// Return all possible splits at an SLP1 boundary offset.
    ///
    /// SLP1 is ASCII, so byte offsets are also character offsets. `0` is before the first
    /// character and `input.length` is after the last; these edge boundaries return an empty
    /// array. Use `splitAll` when the desired boundary is not known in advance.
    #[wasm_bindgen(js_name = splitAt)]
    pub fn split_at(&self, input: &str, offset: usize) -> Result<JsValue, JsError> {
        ensure_slp1_text(input, "Sandhi")?;
        if offset > input.len() {
            return Err(JsError::new("offset must be between 0 and input.length"));
        }
        if offset == 0 || offset == input.len() {
            return to_js_value(&Vec::<WebSplit>::new());
        }
        let splits: Vec<WebSplit> = self
            .splitter
            .split_at(input, offset - 1)
            .into_iter()
            .map(web_split)
            .collect();
        to_js_value(&splits)
    }

    /// Return all possible splits in the first contiguous SLP1 chunk.
    #[wasm_bindgen(js_name = splitAll)]
    pub fn split_all(&self, input: &str) -> Result<JsValue, JsError> {
        ensure_slp1_text(input, "Sandhi")?;
        let splits: Vec<WebSplit> = self
            .splitter
            .split_all(input)
            .into_iter()
            .map(web_split)
            .collect();
        to_js_value(&splits)
    }
}

/// Paninian word-generation API.
///
/// The argument objects and returned derivations are documented in the generated TypeScript
/// declarations and package README. This wrapper delegates to Vidyut's established wasm API.
#[wasm_bindgen]
pub struct Vyakarana {
    inner: vidyut_prakriya::wasm::Vidyut,
}

#[wasm_bindgen]
impl Vyakarana {
    /// Create a word generator.
    #[wasm_bindgen(constructor)]
    pub fn new() -> Vyakarana {
        Vyakarana {
            inner: vidyut_prakriya::wasm::Vidyut::init(),
        }
    }

    /// Derive verbal roots.
    #[wasm_bindgen(js_name = deriveDhatus)]
    pub fn derive_dhatus(&self, args: JsValue) -> Result<JsValue, JsError> {
        self.inner.deriveDhatus(args)
    }

    /// Derive nominal forms.
    #[wasm_bindgen(js_name = deriveSubantas)]
    pub fn derive_subantas(&self, args: JsValue) -> Result<JsValue, JsError> {
        self.inner.deriveSubantas(args)
    }

    /// Derive finite verbal forms.
    #[wasm_bindgen(js_name = deriveTinantas)]
    pub fn derive_tinantas(&self, args: JsValue) -> Result<JsValue, JsError> {
        self.inner.deriveTinantas(args)
    }

    /// Derive primary derivatives.
    #[wasm_bindgen(js_name = deriveKrdantas)]
    pub fn derive_krdantas(&self, args: JsValue) -> Result<JsValue, JsError> {
        self.inner.deriveKrdantas(args)
    }

    /// Derive secondary derivatives.
    #[wasm_bindgen(js_name = deriveTaddhitantas)]
    pub fn derive_taddhitantas(&self, args: JsValue) -> Result<JsValue, JsError> {
        self.inner.deriveTaddhitantas(args)
    }

    /// Derive feminine forms.
    #[wasm_bindgen(js_name = deriveStryantas)]
    pub fn derive_stryantas(&self, args: JsValue) -> Result<JsValue, JsError> {
        self.inner.deriveStryantas(args)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn transliterates_between_schemes() {
        assert_eq!(
            transliterate("rAma", Scheme::Slp1, Scheme::Devanagari),
            "राम"
        );
    }

    #[test]
    fn joins_and_splits_sandhi() {
        let sandhi = Sandhi::new();
        assert_eq!(sandhi.join("ca", "iti").unwrap(), "ceti");
        assert!(sandhi
            .splitter
            .split_at("ceti", 1)
            .iter()
            .any(|split| split.first() == "ca" && split.second() == "iti"));
    }

    #[test]
    fn split_all_stops_at_a_chunk_boundary() {
        let sandhi = Sandhi::new();
        assert!(sandhi
            .splitter
            .split_all("ca iti")
            .iter()
            .all(|split| !split.first().contains(char::is_whitespace)));
    }

    #[cfg(target_arch = "wasm32")]
    #[test]
    fn rejects_invalid_ascii_slp1_text() {
        let sandhi = Sandhi::new();
        assert!(sandhi.join("@", "iti").is_err());

        let chandas = Chandas::new();
        assert!(chandas.classify("@").is_err());
    }

    #[test]
    fn classifies_a_known_metre() {
        let chandas = Chandas::new();
        let result = chandas.inner.classify("mAtaH samastajagatAM maDukEwaBAreH");
        assert_eq!(
            result.padya().as_ref().map(|padya| padya.name()),
            Some("vasantatilakA")
        );
        assert_eq!(result.match_type(), MatchType::Pada);
    }

    #[test]
    fn bundled_catalogue_finds_vasantatilaka() {
        let chandas = Chandas::new();
        let matches = chandas
            .inner
            .classify_all("mAtaH samastajagatAM maDukEwaBAreH");
        assert!(matches
            .padyas()
            .iter()
            .zip(matches.match_types())
            .any(|(padya, match_type)| padya.name() == "vasantatilakA"
                && *match_type == MatchType::Pada));
    }

    #[cfg(target_arch = "wasm32")]
    #[test]
    fn rejects_non_slp1_text_consistently() {
        let sandhi = Sandhi::new();
        assert!(sandhi.join("राम", "iti").is_err());
        assert!(sandhi.split_all("राम").is_err());

        let chandas = Chandas::new();
        assert!(chandas.classify("राम").is_err());
    }
}
