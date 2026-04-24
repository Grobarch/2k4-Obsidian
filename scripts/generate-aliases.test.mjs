// scripts/generate-aliases.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  heuristicCommaSplit,
  heuristicDashSplit,
  heuristicQuoteExtract,
  heuristicPrefixStrip,
} from "./generate-aliases.mjs";

test("heuristicCommaSplit: zwraca segment przed pierwszym przecinkiem", () => {
  assert.equal(
    heuristicCommaSplit("Donatan z Tulendalu h. Niedźwiedź, Rycerz Zakonu Białej Róży, 32 lata"),
    "Donatan z Tulendalu h. Niedźwiedź"
  );
});

test("heuristicCommaSplit: null gdy brak przecinka", () => {
  assert.equal(heuristicCommaSplit("Akodo Monzo"), null);
});

test("heuristicCommaSplit: null gdy segment pusty po trim", () => {
  assert.equal(heuristicCommaSplit(", Foo"), null);
});

test("heuristicCommaSplit: trailing comma → segment przed przecinkiem", () => {
  assert.equal(heuristicCommaSplit("Foo Bar,"), "Foo Bar");
});

test("heuristicDashSplit: segment przed ' - ' (ASCII hyphen ze spacjami)", () => {
  assert.equal(
    heuristicDashSplit("Hebi Taishiro - Czarnoksiężnik Maho-tsukai"),
    "Hebi Taishiro"
  );
});

test("heuristicDashSplit: segment przed ' — ' (em-dash ze spacjami)", () => {
  assert.equal(
    heuristicDashSplit("Cień Kobiety — Jedna z Mrocznych Zjaw"),
    "Cień Kobiety"
  );
});

test("heuristicDashSplit: nie łamie słów złożonych z myślnikiem bez spacji", () => {
  assert.equal(heuristicDashSplit("Maho-tsukai"), null);
  assert.equal(heuristicDashSplit("gannokański pilot Speedy Tuk-Tuk"), null);
});

test("heuristicDashSplit: null gdy brak ' - ' i ' — '", () => {
  assert.equal(heuristicDashSplit("Akodo Monzo"), null);
});

test("heuristicDashSplit: pierwsze wystąpienie wygrywa", () => {
  assert.equal(heuristicDashSplit("A - B - C"), "A");
});

test("heuristicQuoteExtract: wyciąga pojedynczy cytat 'ASCII single'", () => {
  assert.deepEqual(
    heuristicQuoteExtract("Donatan, znany również jako 'Łowca Elfów'"),
    ["Łowca Elfów"]
  );
});

test("heuristicQuoteExtract: wyciąga cytat \"ASCII double\"", () => {
  assert.deepEqual(
    heuristicQuoteExtract('John "Krwawy Topór" Smith'),
    ["Krwawy Topór"]
  );
});

test("heuristicQuoteExtract: wyciąga polskie „curly quotes\"", () => {
  assert.deepEqual(
    heuristicQuoteExtract("Baron \u201EŻelazna Pięść\u201D Hawkwood"),
    ["Żelazna Pięść"]
  );
});

test("heuristicQuoteExtract: wyciąga smart quotes 'typograficzne'", () => {
  assert.deepEqual(
    heuristicQuoteExtract("Paweł \u2018Wilk\u2019 Nowak"),
    ["Wilk"]
  );
});

test("heuristicQuoteExtract: wiele cytatów w jednym tytule", () => {
  assert.deepEqual(
    heuristicQuoteExtract("'Foo' i 'Bar'"),
    ["Foo", "Bar"]
  );
});

test("heuristicQuoteExtract: pusta tablica gdy brak cudzysłowów", () => {
  assert.deepEqual(heuristicQuoteExtract("Akodo Monzo"), []);
});

test("heuristicQuoteExtract: pomija puste cytaty", () => {
  assert.deepEqual(heuristicQuoteExtract("''"), []);
});

test("heuristicPrefixStrip: zdejmuje jedno słowo lowercase", () => {
  assert.equal(heuristicPrefixStrip("baron Kamden Wyndon Hawkwood"), "Kamden Wyndon Hawkwood");
});

test("heuristicPrefixStrip: zdejmuje słowo zaczynające się polskim lowercase", () => {
  assert.equal(heuristicPrefixStrip("żołnierz Yojimbo"), "Yojimbo");
});

test("heuristicPrefixStrip: zdejmuje iteracyjnie wiele słów lowercase", () => {
  assert.equal(heuristicPrefixStrip("gannokański pilot Speedy Tuk-Tuk"), "Speedy Tuk-Tuk");
});

test("heuristicPrefixStrip: null gdy pierwsze słowo wielką literą", () => {
  assert.equal(heuristicPrefixStrip("Akodo Monzo"), null);
});

test("heuristicPrefixStrip: null gdy cały tytuł lowercase (zostałby pusty)", () => {
  assert.equal(heuristicPrefixStrip("baron kamden"), null);
});

test("heuristicPrefixStrip: null gdy single-word lowercase", () => {
  assert.equal(heuristicPrefixStrip("baron"), null);
});
