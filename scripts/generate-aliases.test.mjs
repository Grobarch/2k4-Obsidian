// scripts/generate-aliases.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  heuristicCommaSplit,
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
