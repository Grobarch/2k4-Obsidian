// scripts/generate-aliases.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  heuristicCommaSplit,
  heuristicDashSplit,
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
