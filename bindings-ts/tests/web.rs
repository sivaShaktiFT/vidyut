//! Test suite for the Web and headless browsers.

#![cfg(target_arch = "wasm32")]

use bindings_ts::{transliterate, Chandas, Sandhi, Vyakarana};
extern crate wasm_bindgen_test;
use serde::Serialize;
use vidyut_lipi::Scheme;
use wasm_bindgen_test::*;

#[wasm_bindgen_test]
fn transliterates_in_wasm() {
    assert_eq!(
        transliterate("rAma", Scheme::Slp1, Scheme::Devanagari),
        "राम"
    );
}

#[wasm_bindgen_test]
fn joins_sandhi_in_wasm() {
    assert_eq!(Sandhi::new().join("ca", "iti").unwrap(), "ceti");
}

#[wasm_bindgen_test]
fn classifies_jati_as_the_best_available_match() {
    let chandas = Chandas::new();
    // AryA has four padas with 12, 18, 12, and 15 matras. This sequence has 28 guru syllables.
    let result = chandas.classify(&"gA ".repeat(28)).unwrap();
    let result: serde_json::Value = serde_wasm_bindgen::from_value(result).unwrap();

    assert_eq!(result["name"], "AryA");
    assert_eq!(result["matchType"], "full");
}

#[wasm_bindgen_test]
fn serializes_an_absent_metre_name_as_null() {
    let chandas = Chandas::new();
    let result = chandas
        .classify("gA ga ga ga ga ga ga ga ga ga ga ga ")
        .unwrap();
    let result: serde_json::Value = serde_wasm_bindgen::from_value(result).unwrap();

    assert!(result["name"].is_null());
    assert_eq!(result["matchType"], "none");
}

#[derive(Serialize)]
struct Dhatu<'a> {
    aupadeshika: &'a str,
    gana: &'a str,
    sanadi: Vec<&'a str>,
    prefixes: Vec<&'a str>,
}

#[derive(Serialize)]
struct PartialUpapada<'a> {
    stem: &'a str,
}

#[derive(Serialize)]
struct Krdanta<'a> {
    dhatu: Dhatu<'a>,
    krt: &'a str,
    upapada: PartialUpapada<'a>,
}

#[derive(Serialize)]
struct ConflictingKrdanta<'a> {
    dhatu: Dhatu<'a>,
    krt: &'a str,
    unadi: &'a str,
}

#[derive(Serialize)]
struct Tinanta<'a> {
    dhatu: Dhatu<'a>,
    lakara: &'a str,
    prayoga: &'a str,
    purusha: &'a str,
    vacana: &'a str,
    skip_at_agama: bool,
}

#[wasm_bindgen_test]
fn malformed_grammar_rejects_without_poisoning_the_instance() {
    let vyakarana = Vyakarana::new();
    let partial = Krdanta {
        dhatu: Dhatu {
            aupadeshika: "BU",
            gana: "Bhvadi",
            sanadi: vec![],
            prefixes: vec![],
        },
        krt: "kta",
        upapada: PartialUpapada { stem: "rAma" },
    };
    let partial = serde_wasm_bindgen::to_value(&partial).expect("serializable test input");
    assert!(vyakarana.derive_krdantas(partial).is_err());

    let conflicting = ConflictingKrdanta {
        dhatu: Dhatu {
            aupadeshika: "BU",
            gana: "Bhvadi",
            sanadi: vec![],
            prefixes: vec![],
        },
        krt: "kta",
        unadi: "YuR",
    };
    let conflicting = serde_wasm_bindgen::to_value(&conflicting).expect("serializable test input");
    assert!(vyakarana.derive_krdantas(conflicting).is_err());

    let valid = Tinanta {
        dhatu: Dhatu {
            aupadeshika: "BU",
            gana: "Bhvadi",
            sanadi: vec![],
            prefixes: vec![],
        },
        lakara: "Lat",
        prayoga: "Kartari",
        purusha: "Prathama",
        vacana: "Eka",
        skip_at_agama: false,
    };
    let valid = serde_wasm_bindgen::to_value(&valid).expect("serializable test input");
    assert!(vyakarana.derive_tinantas(valid).is_ok());
}
