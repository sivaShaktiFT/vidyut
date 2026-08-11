//! Test suite for the Web and headless browsers.

#![cfg(target_arch = "wasm32")]

use bindings_ts::{transliterate, Sandhi};
extern crate wasm_bindgen_test;
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
    assert_eq!(Sandhi::new().join("ca", "iti"), "ceti");
}
