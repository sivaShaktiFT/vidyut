/*!
WebAssembly bindings for vidyut-prakriya.

Since vidyut-prakriya is lightweight and has few dependencies, we can create WebAssembly bindings
for it quite easily. In development, we recommend using these bindings through the `make debugger`
command, which will also start a small Python webserver.

The main struct of interest is `Vidyut`, which wraps all of vidyut-prakriya's high-level APIs.

Although these bindings are usable and reliable, we want to improve their ergonomics so that
JavaScript callers can use them more idiomatically.

Useful links:
- Rust and WebAssembly book: <https://rustwasm.github.io/docs/book/introduction.html>
- wasm-pack book: <https://rustwasm.github.io/docs/wasm-pack/>
- wasm-bindgen book: <https://rustwasm.github.io/wasm-bindgen/introduction.html>
*/
use crate::args::*;
use crate::core::Error;
use crate::core::Rule;
use crate::core::{Prakriya, Step, StepTerm};
use serde::{Deserialize, Serialize};
#[cfg(feature = "panic-hook")]
extern crate console_error_panic_hook;

use crate::Vyakarana;
use wasm_bindgen::prelude::*;

/// A rule that was applied in the derivation.
///
/// We use this data to look up the rule's text in the frontend.
#[allow(non_snake_case)]
#[derive(Serialize)]
pub struct WebRule {
    /// The source of this rule (sutrapatha, varttika, etc.)
    source: String,
    /// The (numeric) code that was applied for this step of the derivation.
    code: String,
}

/// A single term in the derivation history.
#[allow(non_snake_case)]
#[derive(Serialize)]
pub struct WebStepTerm {
    /// The text in the term.
    text: String,
    /// Whether or not this term was changed from the previous step.
    wasChanged: bool,
}

impl From<&StepTerm> for WebStepTerm {
    fn from(x: &StepTerm) -> Self {
        Self {
            text: x.text().to_string(),
            wasChanged: x.was_changed(),
        }
    }
}

/// A lightweight `Step` that exposes fewer private fields than the native `Step` struct.
#[derive(Serialize)]
pub struct WebStep {
    /// The rule that created this step.
    rule: WebRule,
    /// The result of applying the given rule.
    result: Vec<WebStepTerm>,
}

/// A lightweight `Prakriya` that exposes fewer private fields than the native `Prakriya` struct.
#[derive(Serialize)]
pub struct WebPrakriya {
    /// The final text produced by this prakriya.
    text: String,
    /// The list of steps that was applied to produce `text`.
    history: Vec<WebStep>,
}

impl Rule {
    /// The text this rule comes from.
    fn source(&self) -> &str {
        use Rule::*;
        match self {
            Ashtadhyayi(_) => "ashtadhyayi",
            Varttika(_) => "varttika",
            Dhatupatha(_) => "dhatupatha",
            Kashika(_) => "kashika",
            Linganushasana(_) => "linganushasanam",
            Kaumudi(_) => "kaumudi",
            Unadipatha(_) => "unadi",
            Phit(_) => "phit",
            Anyatra(_) => "anyatra",
        }
    }
}

/// Converts the native `Step` array to a format that wasm_bindgen can serialize.
fn to_web_history(history: &[Step]) -> Vec<WebStep> {
    history
        .iter()
        .map(|step| WebStep {
            rule: WebRule {
                source: step.rule().source().to_string(),
                code: step.rule().code().to_string(),
            },
            result: step.result().iter().map(|t| t.into()).collect(),
        })
        .collect()
}

/// Converts the native `Prakriya` struct to a format that wasm_bindgen can serialize.
fn to_web_prakriyas(prakriyas: &[Prakriya]) -> Vec<WebPrakriya> {
    prakriyas
        .iter()
        .map(|p| WebPrakriya {
            text: p.text(),
            history: to_web_history(p.history()),
        })
        .collect()
}

fn to_js_value<T: Serialize>(value: &T) -> std::result::Result<JsValue, JsError> {
    serde_wasm_bindgen::to_value(value).map_err(|error| JsError::new(&error.to_string()))
}

fn invalid_args(message: impl Into<String>) -> Error {
    Error::ParseError(message.into())
}

// For now, mula-dhatus only.
#[derive(Serialize, Deserialize)]
struct DhatuArgs {
    aupadeshika: String,
    gana: Gana,
    antargana: Option<Antargana>,
    sanadi: Vec<Sanadi>,
    prefixes: Vec<String>,
}

#[derive(Serialize, Deserialize)]
struct KrdantaArgs {
    dhatu: DhatuArgs,
    krt: Option<BaseKrt>,
    unadi: Option<Unadi>,
    lakara: Option<Lakara>,
    prayoga: Option<Prayoga>,
    #[serde(skip_serializing_if = "Option::is_none")]
    upapada: Option<UpapadadArgs>,
}

#[derive(Serialize, Deserialize)]
struct UpapadadArgs {
    stem: Option<String>,
    linga: Option<Linga>,
    vibhakti: Option<Vibhakti>,
    vacana: Option<Vacana>,
}

// rust-wasm does not support enums, so fake enum-like behavior through a struct with optional
// fields.
//
// The API expects that exactly one field is set. Otherwise, the API will throw an error.
#[derive(Serialize, Deserialize)]
struct PratipadikaArgs {
    basic: Option<String>,
    nyap: Option<String>,
    krdanta: Option<KrdantaArgs>,
    taddhitanta: Option<TaddhitantaArgsInner>,
}

#[derive(Serialize, Deserialize)]
struct TaddhitantaArgsInner {
    stem: String,
    taddhita: Taddhita,
}

#[derive(Serialize, Deserialize)]
struct SubantaArgs {
    pratipadika: PratipadikaArgs,
    linga: Linga,
    vibhakti: Vibhakti,
    vacana: Vacana,
}

#[derive(Serialize, Deserialize)]
struct TinantaArgs {
    dhatu: DhatuArgs,
    lakara: Lakara,
    prayoga: Prayoga,
    purusha: Purusha,
    vacana: Vacana,
    skip_at_agama: bool,
    pada: Option<DhatuPada>,
}

#[derive(Serialize, Deserialize)]
struct TaddhitantaArgs {
    pratipadika: PratipadikaArgs,
    taddhita: Taddhita,
}

/// Shorthand for result type
pub type Result<T> = std::result::Result<T, Error>;

impl DhatuArgs {
    fn into_rust(self) -> Result<Dhatu> {
        let aupadeshika = Slp1String::from(self.aupadeshika)?;
        let mut dhatu = match self.antargana {
            Some(antargana) => Dhatu::mula_with_antargana(aupadeshika, self.gana, antargana),
            None => Dhatu::mula(aupadeshika, self.gana),
        };

        dhatu = dhatu
            .with_prefixes(&self.prefixes)
            .with_sanadi(&self.sanadi);

        Ok(dhatu)
    }
}

impl KrdantaArgs {
    fn into_rust(self) -> Result<Krdanta> {
        let dhatu: Dhatu = self.dhatu.into_rust()?;
        let mut builder = Krdanta::builder().dhatu(dhatu);

        match (self.krt, self.unadi) {
            (Some(krt), None) => builder = builder.krt(krt),
            (None, Some(unadi)) => builder = builder.krt(unadi),
            (None, None) => {
                return Err(invalid_args("krdanta must include exactly one of krt or unadi"))
            }
            (Some(_), Some(_)) => {
                return Err(invalid_args("krdanta must include exactly one of krt or unadi"))
            }
        }
        if let Some(la) = self.lakara {
            builder = builder.lakara(la);
        }
        if let Some(prayoga) = self.prayoga {
            builder = builder.prayoga(prayoga);
        }
        if let Some(upapada) = self.upapada {
            let (stem, linga, vibhakti, vacana) = match (
                upapada.stem,
                upapada.linga,
                upapada.vibhakti,
                upapada.vacana,
            ) {
                (Some(stem), Some(linga), Some(vibhakti), Some(vacana)) => {
                    (stem, linga, vibhakti, vacana)
                }
                _ => {
                    return Err(invalid_args(
                        "upapada must include stem, linga, vibhakti, and vacana",
                    ))
                }
            };
            let pratipadika = Pratipadika::basic(Slp1String::from(stem)?);
            builder = builder.upapada(Subanta::new(pratipadika, linga, vibhakti, vacana));
        }
        builder.build()
    }
}

impl PratipadikaArgs {
    fn into_rust(self) -> Result<Pratipadika> {
        match self {
            Self {
                basic: Some(basic),
                nyap: None,
                krdanta: None,
                taddhitanta: None,
            } => Ok(Pratipadika::basic(Slp1String::from(basic)?)),
            Self {
                basic: None,
                nyap: Some(nyap),
                krdanta: None,
                taddhitanta: None,
            } => Ok(Pratipadika::nyap(Slp1String::from(nyap)?)),
            Self {
                basic: None,
                nyap: None,
                krdanta: Some(krdanta),
                taddhitanta: None,
            } => Ok(Pratipadika::Krdanta(Box::new(krdanta.into_rust()?))),
            Self {
                basic: None,
                nyap: None,
                krdanta: None,
                taddhitanta: Some(taddhitanta),
            } => {
                let base = Pratipadika::basic(Slp1String::from(taddhitanta.stem)?);
                Ok(Pratipadika::Taddhitanta(Box::new(Taddhitanta::new(
                    base,
                    taddhitanta.taddhita,
                ))))
            }
            _ => Err(invalid_args(
                "pratipadika must specify exactly one of basic, nyap, krdanta, or taddhitanta",
            )),
        }
    }
}

impl SubantaArgs {
    fn into_rust(self) -> Result<Subanta> {
        let pratipadika = self.pratipadika.into_rust()?;
        Subanta::builder()
            .pratipadika(pratipadika)
            .linga(self.linga)
            .vacana(self.vacana)
            .vibhakti(self.vibhakti)
            .build()
    }
}

impl TinantaArgs {
    fn into_rust(self) -> Result<Tinanta> {
        let mut args = Tinanta::builder()
            .dhatu(self.dhatu.into_rust()?)
            .lakara(self.lakara)
            .prayoga(self.prayoga)
            .purusha(self.purusha)
            .vacana(self.vacana)
            .skip_at_agama(self.skip_at_agama);
        if let Some(pada) = self.pada {
            args = args.pada(pada);
        }
        args.build()
    }
}

impl TaddhitantaArgs {
    fn into_rust(self) -> Result<Taddhitanta> {
        let pratipadika = self.pratipadika.into_rust()?;
        Ok(Taddhitanta::new(pratipadika, self.taddhita))
    }
}

/// WebAssembly API for vidyut-prakriya.
///
/// Within reason, we have tried to mimic a native JavaScript API. At some point, we wish to
/// support optional arguments, perhaps by using `Reflect`.
#[wasm_bindgen]
pub struct Vidyut {}

#[wasm_bindgen]
impl Vidyut {
    /// Creates a new API manager.
    ///
    /// This constructor is not called `new` because `new` is a reserved word in JavaScript.
    pub fn init() -> Self {
        // This hook is useful for standalone debugging builds but must be explicitly enabled so
        // production consumers do not ship development panic formatting code.
        #[cfg(feature = "panic-hook")]
        console_error_panic_hook::set_once();

        Self {}
    }

    /// Wrapper for `Vyakarana::derive_krdantas`.
    #[allow(non_snake_case)]
    pub fn deriveKrdantas(&self, val: JsValue) -> std::result::Result<JsValue, JsError> {
        let js_args: KrdantaArgs = serde_wasm_bindgen::from_value(val)
            .map_err(|error| JsError::new(&error.to_string()))?;
        let args = js_args
            .into_rust()
            .map_err(|error| JsError::new(&error.to_string()))?;
        to_js_value(&to_web_prakriyas(&Vyakarana::new().derive_krdantas(&args)))
    }

    /// Wrapper for `Vyakarana::derive_dhatus`.
    #[allow(non_snake_case)]
    pub fn deriveDhatus(&self, val: JsValue) -> std::result::Result<JsValue, JsError> {
        let js_args: DhatuArgs = serde_wasm_bindgen::from_value(val)
            .map_err(|error| JsError::new(&error.to_string()))?;
        let args = js_args
            .into_rust()
            .map_err(|error| JsError::new(&error.to_string()))?;
        to_js_value(&to_web_prakriyas(&Vyakarana::new().derive_dhatus(&args)))
    }

    /// Wrapper for `Vyakarana::derive_subantas`.
    #[allow(non_snake_case)]
    pub fn deriveSubantas(&self, val: JsValue) -> std::result::Result<JsValue, JsError> {
        let js_args: SubantaArgs = serde_wasm_bindgen::from_value(val)
            .map_err(|error| JsError::new(&error.to_string()))?;
        let args = js_args
            .into_rust()
            .map_err(|error| JsError::new(&error.to_string()))?;
        to_js_value(&to_web_prakriyas(&Vyakarana::new().derive_subantas(&args)))
    }

    /// Wrapper for `Vyakarana::derive_tinantas`.
    ///
    /// TODO: how might we reduce the number of arguments here?
    #[allow(non_snake_case)]
    pub fn deriveTinantas(&self, val: JsValue) -> std::result::Result<JsValue, JsError> {
        let js_args: TinantaArgs = serde_wasm_bindgen::from_value(val)
            .map_err(|error| JsError::new(&error.to_string()))?;
        let args = js_args
            .into_rust()
            .map_err(|error| JsError::new(&error.to_string()))?;
        to_js_value(&to_web_prakriyas(&Vyakarana::new().derive_tinantas(&args)))
    }

    /// Wrapper for `Vyakarana::derive_taddhitantas`.
    #[allow(non_snake_case)]
    pub fn deriveTaddhitantas(&self, val: JsValue) -> std::result::Result<JsValue, JsError> {
        let js_args: TaddhitantaArgs = serde_wasm_bindgen::from_value(val)
            .map_err(|error| JsError::new(&error.to_string()))?;
        let args = js_args
            .into_rust()
            .map_err(|error| JsError::new(&error.to_string()))?;
        to_js_value(&to_web_prakriyas(
            &Vyakarana::new().derive_taddhitantas(&args),
        ))
    }

    /// Wrapper for `Vyakarana::derive_stryantas`.
    #[allow(non_snake_case)]
    pub fn deriveStryantas(&self, val: JsValue) -> std::result::Result<JsValue, JsError> {
        let js_args: PratipadikaArgs = serde_wasm_bindgen::from_value(val)
            .map_err(|error| JsError::new(&error.to_string()))?;
        let pratipadika = js_args
            .into_rust()
            .map_err(|error| JsError::new(&error.to_string()))?;
        to_js_value(&to_web_prakriyas(
            &Vyakarana::new().derive_stryantas(&pratipadika),
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_multiple_pratipadika_variants() {
        let args = PratipadikaArgs {
            basic: Some("rAma".to_string()),
            nyap: Some("nadI".to_string()),
            krdanta: None,
            taddhitanta: None,
        };
        assert!(args.into_rust().is_err());
    }

    #[test]
    fn rejects_invalid_pratipadika_slp1() {
        let args = PratipadikaArgs {
            basic: None,
            nyap: Some("@".to_string()),
            krdanta: None,
            taddhitanta: None,
        };
        assert!(args.into_rust().is_err());
    }
}
