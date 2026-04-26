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
