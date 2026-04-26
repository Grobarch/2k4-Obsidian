// scripts/statblock-detect.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractBody,
} from "./statblock-detect.mjs";

test("extractBody: zwraca wszystko po --- frontmatterze", () => {
  const content = "---\ntitle: Foo\ntype: bohater-gracza\n---\nBody text\nLine 2";
  assert.equal(extractBody(content), "Body text\nLine 2");
});

test("extractBody: obsługuje CRLF line endings", () => {
  const content = "---\r\ntitle: Foo\r\n---\r\nBody";
  assert.equal(extractBody(content), "Body");
});

test("extractBody: bez końcowego newline po ---", () => {
  const content = "---\ntitle: Foo\n---Body";
  assert.equal(extractBody(content), content);
});

test("extractBody: bez frontmatteru — zwraca cały content", () => {
  const content = "Just body without frontmatter";
  assert.equal(extractBody(content), content);
});

test("extractBody: pusty body (FM bez treści po)", () => {
  const content = "---\ntitle: Foo\n---\n";
  assert.equal(extractBody(content), "");
});

import { findMissingFields } from "./statblock-detect.mjs";

test("findMissingFields: kanoniczna forma **Label:** —", () => {
  const body = "**Honor:** —\n**Chwała:** —\n";
  assert.deepEqual(findMissingFields(body), ["Honor", "Chwała"]);
});

test("findMissingFields: legacy forma **Label**: —", () => {
  const body = "**Wgląd**: —\n";
  assert.deepEqual(findMissingFields(body), ["Wgląd"]);
});

test("findMissingFields: z frazą w nawiasach (Opis)", () => {
  const body = "**Status (Pozycja społeczna):** —\n";
  assert.deepEqual(findMissingFields(body), ["Status"]);
});

test("findMissingFields: pomija wystąpienia w bloku kodu", () => {
  const body = "```\n**Honor:** —\n```\n**Chwała:** —";
  assert.deepEqual(findMissingFields(body), ["Chwała"]);
});

test("findMissingFields: dedup tych samych pól", () => {
  const body = "**Honor:** —\n**Honor:** —\n";
  assert.deepEqual(findMissingFields(body), ["Honor"]);
});

test("findMissingFields: pusty body → []", () => {
  assert.deepEqual(findMissingFields(""), []);
});

test("findMissingFields: body bez placeholderów → []", () => {
  const body = "**Honor:** 3\n**Chwała:** 1.5\n";
  assert.deepEqual(findMissingFields(body), []);
});
