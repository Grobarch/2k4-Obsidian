# Aliases Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dodać `aliases` jako typowane opcjonalne pole w `TYPE_SCHEMAS` oraz dostarczyć `scripts/generate-aliases.mjs` — heurystyczny generator aliasów dla postaci (BG/BN) z czterema heurystykami (comma-split, dash-split, quote-extract, prefix-strip) i policy „skip jeśli klucz istnieje".

**Architecture:** Single-file ESM skrypt bez npm deps. Pure heuristic funkcje i helper YAML eksportowane (żeby testy `node --test` mogły je importować); CLI main uruchamia się tylko gdy skrypt wołany bezpośrednio. Jeden plik testowy z `node --test` (zero deps). Jedna drobna zmiana w `scripts/schema.mjs` (dodanie `"aliases"` do `arrayFields` dla 6 typów będących celami backlinks).

**Tech Stack:** Node.js (>=18, obecnie 25.2.1), ESM, `node:test` + `node:assert/strict`, `shared.mjs` (parseFrontmatter, findMdFiles, extractRawFrontmatter), `schema.mjs` (SYSTEM_NAMES).

---

## Struktura plików

**Nowe:**
- `scripts/generate-aliases.mjs` — główny skrypt (heurystyki + helpery + CLI)
- `scripts/generate-aliases.test.mjs` — testy jednostkowe (pure functions)

**Modyfikowane:**
- `scripts/schema.mjs` — `"aliases"` w `arrayFields` dla 6 typów
- `CLAUDE.md` — drzewo repo + sekcja użycia

**Konwencja Skryptu:** Eksportujemy pure funkcje (heurystyki, `generateCandidates`, `filterCandidates`, `insertAliasesAfterTitle`) oraz `main()`. Bottom-of-file guard `if (process.argv[1]?.endsWith("generate-aliases.mjs"))` wywołuje `main()` tylko gdy skrypt odpalany z CLI, nie gdy importowany przez test file.

---

### Task 1: Dodanie `aliases` do schema.mjs

**Files:**
- Modify: `scripts/schema.mjs:41-96`

- [ ] **Step 1: Zmodyfikuj TYPE_SCHEMAS — dodaj `"aliases"` do `arrayFields` w 6 typach**

Zamień blok TYPE_SCHEMAS (linie 40-97) na wersję z dodanym polem `aliases` w każdym z 6 typów celów backlinks (bohater-gracza, bohater-niezalezny, artefakt, lokacja, kampania, system). Typy `epizod`, `scenariusz`, `index` nie są celami backlinks i nie wymagają zmiany.

```javascript
export const TYPE_SCHEMAS = {
  "bohater-gracza": {
    required:    ["title", "type", "system", "system_pelna", "tags"],
    arrayFields: ["tags", "kampania", "kampania_link", "aliases"],
    computed:    ["system_pelna", "tags"],
    defaults:    {},
  },
  "bohater-niezalezny": {
    required:    ["title", "type", "system", "system_pelna", "tags"],
    arrayFields: ["tags", "kampania", "kampania_link", "aliases"],
    computed:    ["system_pelna", "tags"],
    defaults:    {},
  },
  "epizod": {
    required:    ["title", "type", "system", "system_pelna", "kampania_link", "kampania", "data", "tags"],
    arrayFields: ["tags"],
    computed:    ["system_pelna", "kampania_link", "kampania", "tags"],
    defaults:    { mg: "Arkadiusz RYGIEL" },
  },
  "kampania": {
    required:    ["title", "type", "system", "system_pelna", "mg", "gatunek", "tags", "draft"],
    arrayFields: ["tags", "aliases"],
    computed:    ["system_pelna", "tags"],
    // status: opcjonalne pole (aktywna | zawieszona | zakończona). Normalize
    // wypełnia domyślną wartością gdy brak — nowe kampanie dziedziczą z templatki.
    defaults:    { draft: "false", mg: "Arkadiusz RYGIEL", status: "zakończona" },
  },
  "system": {
    required:    ["title", "type", "system", "wydawca", "gatunek", "tags", "draft"],
    arrayFields: ["tags", "aliases"],
    computed:    ["tags"],
    defaults:    { draft: "false" },
  },
  "lokacja": {
    required:    ["title", "type", "system", "system_pelna", "tags"],
    arrayFields: ["tags", "kampania", "kampania_link", "aliases"],
    computed:    ["system_pelna", "tags"],
    defaults:    {},
  },
  "artefakt": {
    required:    ["title", "type", "system", "system_pelna", "tags"],
    arrayFields: ["tags", "kampania", "kampania_link", "aliases"],
    computed:    ["system_pelna", "tags"],
    defaults:    {},
  },
  "scenariusz": {
    required:    ["title", "type", "system", "data", "tags"],
    arrayFields: ["tags"],
    computed:    ["tags"],
    defaults:    {},
  },
  "index": {
    required:    ["title", "type"],
    arrayFields: ["tags"],
    computed:    [],
    defaults:    {},
  },
};
```

- [ ] **Step 2: Weryfikacja — walidator nadal działa**

Run: `node scripts/vault-tools.mjs validate --dir vault 2>&1 | tail -3`

Expected: identyczne wyjście jak przed zmianą (np. `⚠ 23/286 plików ma braki.`). Zmiana w schema nie powinna wprowadzić nowych błędów ani nowych ostrzeżeń, bo `aliases` jest opcjonalne.

- [ ] **Step 3: Weryfikacja — migracja scalar→array działa dla aliases**

Utwórz tymczasowy plik testowy i zweryfikuj że `normalize` zmigruje scalar aliases na array:

```bash
cat > /tmp/test-alias.md <<'EOF'
---
title: Test
type: bohater-gracza
system: l5k
system_pelna: Legenda Pięciu Kręgów 1ed
aliases: "Foo Bar"
tags: [bohater-gracza]
---

Body
EOF
mkdir -p /tmp/test-vault && cp /tmp/test-alias.md /tmp/test-vault/
node scripts/vault-tools.mjs normalize --dir /tmp/test-vault --apply 2>&1 | head -20
grep "aliases:" /tmp/test-vault/test-alias.md
rm -rf /tmp/test-vault /tmp/test-alias.md
```

Expected: output `aliases: ["Foo Bar"]` (tablica w formie flow-style).

- [ ] **Step 4: Commit**

```bash
git add scripts/schema.mjs
git commit -m "feat(RPG-91): aliases jako arrayFields w 6 typach schematu"
```

---

### Task 2: Szkielet `generate-aliases.mjs` + pierwszy test (comma-split)

**Files:**
- Create: `scripts/generate-aliases.mjs`
- Create: `scripts/generate-aliases.test.mjs`

- [ ] **Step 1: Utwórz plik testowy z testem dla heuristicCommaSplit**

```javascript
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

test("heuristicCommaSplit: null gdy segment === title (cały tytuł bez przecinków)", () => {
  assert.equal(heuristicCommaSplit("Foo Bar,"), "Foo Bar"); // trailing comma → segment "Foo Bar" ≠ pełny tytuł
});
```

- [ ] **Step 2: Uruchom test — powinien failować na braku modułu**

Run: `node --test scripts/generate-aliases.test.mjs 2>&1 | head -20`

Expected: FAIL z komunikatem typu `Cannot find module` lub `Cannot find package`.

- [ ] **Step 3: Utwórz skrypt z implementacją heuristicCommaSplit + stubami pozostałych eksportów**

```javascript
#!/usr/bin/env node
/**
 * generate-aliases.mjs — Heurystyczny generator aliasów dla postaci (BG/BN)
 *
 * Skanuje pliki `type: bohater-gracza` / `bohater-niezalezny` i proponuje aliasy
 * na podstawie kształtu tytułu. Cztery heurystyki (patrz docs/superpowers/specs/):
 *   A. comma-split     — segment przed pierwszym `,`
 *   B. dash-split      — segment przed pierwszym ` - ` lub ` — ` (spacje z obu stron)
 *   C. quote-extract   — zawartość cudzysłowów: '...', "...", „...", '...'
 *   D. prefix-strip    — iteracyjnie zdejmij pierwsze słowo pisane małą literą
 *
 * Policy: jeśli plik ma już klucz `aliases:` (dowolnej wartości) → pomijamy.
 *
 * Użycie:
 *   node scripts/generate-aliases.mjs                        # dry-run
 *   node scripts/generate-aliases.mjs --apply                # zapis
 *   node scripts/generate-aliases.mjs --system l5k           # filtr system
 *   node scripts/generate-aliases.mjs --type bohater-niezalezny
 *   node scripts/generate-aliases.mjs --file vault/path.md   # pojedynczy plik
 *   node scripts/generate-aliases.mjs --dir vault            # alt root
 *
 * Exit code: 0 (zawsze), chyba że --file wskazuje plik nieistniejący.
 */

import { readFile, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { findMdFiles, parseFrontmatter, extractRawFrontmatter } from "./shared.mjs";

// ─── Heurystyki ──────────────────────────────────────────────────────────────

/**
 * A. Comma split: zwraca trimowany segment przed pierwszym `,`.
 * Zwraca null gdy brak przecinka lub segment jest pusty.
 */
export function heuristicCommaSplit(title) {
  const idx = title.indexOf(",");
  if (idx < 0) return null;
  const seg = title.slice(0, idx).trim();
  return seg.length > 0 ? seg : null;
}

/**
 * B. Dash split: zwraca trimowany segment przed pierwszym ` - ` lub ` — `.
 * Wymagane spacje z obu stron — nie łamie słów złożonych („Maho-tsukai", „Tuk-Tuk").
 */
export function heuristicDashSplit(title) {
  return null; // TODO task 3
}

/**
 * C. Quote extract: zwraca wszystkie niepustę substringi w cudzysłowach.
 * Obsługuje: '...', "...", „..." (polskie curly), '...' / '...' (smart).
 */
export function heuristicQuoteExtract(title) {
  return []; // TODO task 4
}

/**
 * D. Prefix strip: iteracyjnie zdejmuje pierwsze słowo jeśli zaczyna się małą literą.
 * Polskie znaki (ąćęłńóśźż) traktowane jak małe.
 */
export function heuristicPrefixStrip(title) {
  return null; // TODO task 5
}

// ─── Kompozycja ──────────────────────────────────────────────────────────────

export function generateCandidates(title) {
  return []; // TODO task 6
}

export function filterCandidates(candidates, title) {
  return []; // TODO task 6
}

// ─── YAML helper ─────────────────────────────────────────────────────────────

export function insertAliasesAfterTitle(yaml, aliasList) {
  return null; // TODO task 7
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

export async function main() {
  // TODO task 8
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/generate-aliases.mjs")) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
```

- [ ] **Step 4: Uruchom test — powinien zielony**

Run: `node --test scripts/generate-aliases.test.mjs 2>&1 | tail -10`

Expected: PASS wszystkich 4 testów dla `heuristicCommaSplit` (np. `# tests 4 # pass 4 # fail 0`).

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-aliases.mjs scripts/generate-aliases.test.mjs
git commit -m "feat(RPG-91): szkielet generate-aliases + heuristicCommaSplit"
```

---

### Task 3: Heurystyka B — dash-split

**Files:**
- Modify: `scripts/generate-aliases.mjs` (funkcja `heuristicDashSplit`)
- Modify: `scripts/generate-aliases.test.mjs` (dodaj testy)

- [ ] **Step 1: Dodaj testy dla heuristicDashSplit (RED)**

Dopisz na końcu `scripts/generate-aliases.test.mjs`:

```javascript
import { heuristicDashSplit } from "./generate-aliases.mjs";

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
  assert.equal(
    heuristicDashSplit("A - B - C"),
    "A"
  );
});
```

- [ ] **Step 2: Uruchom testy — nowe powinny failować**

Run: `node --test scripts/generate-aliases.test.mjs 2>&1 | tail -15`

Expected: 5 nowych testów FAIL (wszystkie assertions dla dashSplit dostają `null` zamiast oczekiwanej wartości; tylko test "null gdy brak" zielony).

- [ ] **Step 3: Zaimplementuj heuristicDashSplit**

Zamień body funkcji w `scripts/generate-aliases.mjs`:

```javascript
export function heuristicDashSplit(title) {
  // Szukamy pierwszego wystąpienia ' - ' lub ' — ' (z otaczającymi spacjami).
  const hyphenIdx = title.indexOf(" - ");
  const emDashIdx = title.indexOf(" — ");
  const idx = [hyphenIdx, emDashIdx].filter((i) => i >= 0).sort((a, b) => a - b)[0];
  if (idx === undefined) return null;
  const seg = title.slice(0, idx).trim();
  return seg.length > 0 ? seg : null;
}
```

- [ ] **Step 4: Uruchom testy — zielono**

Run: `node --test scripts/generate-aliases.test.mjs 2>&1 | tail -5`

Expected: wszystkie testy PASS (`# pass 9 # fail 0`).

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-aliases.mjs scripts/generate-aliases.test.mjs
git commit -m "feat(RPG-91): heurystyka dash-split"
```

---

### Task 4: Heurystyka C — quote-extract

**Files:**
- Modify: `scripts/generate-aliases.mjs` (funkcja `heuristicQuoteExtract`)
- Modify: `scripts/generate-aliases.test.mjs`

- [ ] **Step 1: Dodaj testy dla heuristicQuoteExtract (RED)**

Dopisz:

```javascript
import { heuristicQuoteExtract } from "./generate-aliases.mjs";

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
    heuristicQuoteExtract("Baron „Żelazna Pięść\" Hawkwood"),
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

test("heuristicQuoteExtract: puste tablica gdy brak cudzysłowów", () => {
  assert.deepEqual(heuristicQuoteExtract("Akodo Monzo"), []);
});

test("heuristicQuoteExtract: pomija puste cytaty", () => {
  assert.deepEqual(heuristicQuoteExtract("''"), []);
});
```

- [ ] **Step 2: Uruchom — RED**

Run: `node --test scripts/generate-aliases.test.mjs 2>&1 | tail -10`

Expected: 5-6 nowych FAIL-i (pustą tablicę zwraca stub).

- [ ] **Step 3: Zaimplementuj heuristicQuoteExtract**

```javascript
export function heuristicQuoteExtract(title) {
  const patterns = [
    /'([^']+)'/g,      // ASCII single
    /"([^"]+)"/g,      // ASCII double
    /\u201E([^\u201D]+)\u201D/g,  // „...” (U+201E, U+201D — polskie curly)
    /\u2018([^\u2019]+)\u2019/g,  // '...' (U+2018, U+2019 — smart single)
    /\u201C([^\u201D]+)\u201D/g,  // "..." (U+201C, U+201D — smart double, gdyby się trafiły)
  ];
  const results = [];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(title)) !== null) {
      const v = m[1].trim();
      if (v.length > 0) results.push(v);
    }
  }
  return results;
}
```

- [ ] **Step 4: Uruchom — zielono**

Run: `node --test scripts/generate-aliases.test.mjs 2>&1 | tail -5`

Expected: wszystkie PASS (`# pass 16 # fail 0`).

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-aliases.mjs scripts/generate-aliases.test.mjs
git commit -m "feat(RPG-91): heurystyka quote-extract (ASCII + polskie curly + smart)"
```

---

### Task 5: Heurystyka D — lowercase-prefix-strip

**Files:**
- Modify: `scripts/generate-aliases.mjs` (funkcja `heuristicPrefixStrip`)
- Modify: `scripts/generate-aliases.test.mjs`

- [ ] **Step 1: Dodaj testy (RED)**

Dopisz:

```javascript
import { heuristicPrefixStrip } from "./generate-aliases.mjs";

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
```

- [ ] **Step 2: Uruchom — RED**

Run: `node --test scripts/generate-aliases.test.mjs 2>&1 | tail -10`

Expected: 3-6 FAIL-i.

- [ ] **Step 3: Zaimplementuj heuristicPrefixStrip**

```javascript
export function heuristicPrefixStrip(title) {
  // Lowercase start: a-z lub polskie ąćęłńóśźż.
  const isLowerStart = (s) => /^[a-ząćęłńóśźż]/.test(s);
  let remaining = title.trim();
  let changed = false;
  while (isLowerStart(remaining)) {
    // Znajdź koniec pierwszego słowa (whitespace).
    const m = remaining.match(/^\S+\s+/);
    if (!m) return null; // single lowercase word → brak sensownego aliasu
    remaining = remaining.slice(m[0].length);
    changed = true;
  }
  if (!changed) return null;
  return remaining.length > 0 ? remaining : null;
}
```

- [ ] **Step 4: Uruchom — zielono**

Run: `node --test scripts/generate-aliases.test.mjs 2>&1 | tail -5`

Expected: wszystkie PASS (`# pass 22 # fail 0`).

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-aliases.mjs scripts/generate-aliases.test.mjs
git commit -m "feat(RPG-91): heurystyka prefix-strip (iteracyjnie)"
```

---

### Task 6: Kompozycja — `generateCandidates` + `filterCandidates`

**Files:**
- Modify: `scripts/generate-aliases.mjs`
- Modify: `scripts/generate-aliases.test.mjs`

- [ ] **Step 1: Dodaj testy dla generateCandidates (RED)**

```javascript
import { generateCandidates, filterCandidates } from "./generate-aliases.mjs";

test("generateCandidates: łączy wyniki A+B+C+D w kolejności", () => {
  const title = "Donatan z Tulendalu h. Niedźwiedź, Rycerz Zakonu, znany jako 'Łowca Elfów'";
  const result = generateCandidates(title);
  // A: "Donatan z Tulendalu h. Niedźwiedź" (przed pierwszym przecinkiem)
  // B: null (brak ' - ')
  // C: ["Łowca Elfów"]
  // D: null (wielka litera na początku)
  assert.deepEqual(result, [
    { alias: "Donatan z Tulendalu h. Niedźwiedź", source: "comma-split" },
    { alias: "Łowca Elfów", source: "quote-extract" },
  ]);
});

test("generateCandidates: dash-split i prefix-strip dla baron z myślnikiem", () => {
  const title = "baron Kamden - Wyndon Hawkwood";
  const result = generateCandidates(title);
  // A: null (brak przecinka), B: "baron Kamden" (przed pierwszym ' - '), C: [], D: "Kamden - Wyndon Hawkwood"
  assert.deepEqual(result, [
    { alias: "baron Kamden", source: "dash-split" },
    { alias: "Kamden - Wyndon Hawkwood", source: "prefix-strip" },
  ]);
});

test("generateCandidates: pusta lista dla prostego tytułu", () => {
  assert.deepEqual(generateCandidates("Akodo Monzo"), []);
});

test("filterCandidates: usuwa pusty, ≠title, ≥2 znaki, dedup", () => {
  const candidates = [
    { alias: "Foo Bar", source: "comma-split" },
    { alias: "Foo Bar", source: "prefix-strip" },  // duplikat
    { alias: "A", source: "quote-extract" },        // za krótki
    { alias: "Full Title", source: "dash-split" },  // === title
    { alias: "", source: "comma-split" },           // pusty
    { alias: "Valid Alias", source: "dash-split" },
  ];
  const result = filterCandidates(candidates, "Full Title");
  assert.deepEqual(result, [
    { alias: "Foo Bar", source: "comma-split" },
    { alias: "Valid Alias", source: "dash-split" },
  ]);
});
```

- [ ] **Step 2: Uruchom — RED**

Run: `node --test scripts/generate-aliases.test.mjs 2>&1 | tail -10`

Expected: 4 FAIL-e (stub zwraca puste).

- [ ] **Step 3: Zaimplementuj generateCandidates + filterCandidates**

Zamień stuby w `scripts/generate-aliases.mjs`:

```javascript
export function generateCandidates(title) {
  const out = [];
  const a = heuristicCommaSplit(title);
  if (a) out.push({ alias: a, source: "comma-split" });
  const b = heuristicDashSplit(title);
  if (b) out.push({ alias: b, source: "dash-split" });
  for (const q of heuristicQuoteExtract(title)) {
    out.push({ alias: q, source: "quote-extract" });
  }
  const d = heuristicPrefixStrip(title);
  if (d) out.push({ alias: d, source: "prefix-strip" });
  return out;
}

export function filterCandidates(candidates, title) {
  const seen = new Set();
  const out = [];
  for (const c of candidates) {
    const a = (c.alias ?? "").trim();
    if (a.length < 2) continue;
    if (a === title) continue;
    if (seen.has(a)) continue;
    seen.add(a);
    out.push({ alias: a, source: c.source });
  }
  return out;
}
```

- [ ] **Step 4: Uruchom — zielono**

Run: `node --test scripts/generate-aliases.test.mjs 2>&1 | tail -5`

Expected: `# pass 26 # fail 0`.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-aliases.mjs scripts/generate-aliases.test.mjs
git commit -m "feat(RPG-91): generateCandidates + filterCandidates z dedupem"
```

---

### Task 7: Helper YAML — `insertAliasesAfterTitle`

**Files:**
- Modify: `scripts/generate-aliases.mjs`
- Modify: `scripts/generate-aliases.test.mjs`

- [ ] **Step 1: Dodaj testy (RED)**

```javascript
import { insertAliasesAfterTitle } from "./generate-aliases.mjs";

test("insertAliasesAfterTitle: wstawia flow-style array po linii title", () => {
  const yaml = "title: Foo\ntype: bohater-gracza\nsystem: l5k";
  const result = insertAliasesAfterTitle(yaml, ["Bar", "Baz"]);
  assert.equal(result, 'title: Foo\naliases: ["Bar", "Baz"]\ntype: bohater-gracza\nsystem: l5k');
});

test("insertAliasesAfterTitle: escape cudzysłowów w aliasach", () => {
  const yaml = "title: Foo\ntype: bohater-gracza";
  const result = insertAliasesAfterTitle(yaml, ['Alias "with quote"']);
  assert.equal(result, 'title: Foo\naliases: ["Alias \\"with quote\\""]\ntype: bohater-gracza');
});

test("insertAliasesAfterTitle: escape backslash", () => {
  const yaml = "title: Foo\ntype: x";
  const result = insertAliasesAfterTitle(yaml, ["back\\slash"]);
  assert.equal(result, 'title: Foo\naliases: ["back\\\\slash"]\ntype: x');
});

test("insertAliasesAfterTitle: null gdy brak linii title", () => {
  const yaml = "type: bohater-gracza\nsystem: l5k";
  assert.equal(insertAliasesAfterTitle(yaml, ["Foo"]), null);
});

test("insertAliasesAfterTitle: działa z title w cudzysłowach", () => {
  const yaml = 'title: "Foo Bar"\ntype: x';
  const result = insertAliasesAfterTitle(yaml, ["Foo"]);
  assert.equal(result, 'title: "Foo Bar"\naliases: ["Foo"]\ntype: x');
});
```

- [ ] **Step 2: Uruchom — RED**

Run: `node --test scripts/generate-aliases.test.mjs 2>&1 | tail -10`

Expected: 5 FAIL.

- [ ] **Step 3: Zaimplementuj insertAliasesAfterTitle**

```javascript
export function insertAliasesAfterTitle(yaml, aliasList) {
  const escape = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const flowArray = `[${aliasList.map((a) => `"${escape(a)}"`).join(", ")}]`;
  const re = /^(title:.*)$/m;
  if (!re.test(yaml)) return null;
  return yaml.replace(re, `$1\naliases: ${flowArray}`);
}
```

- [ ] **Step 4: Uruchom — zielono**

Run: `node --test scripts/generate-aliases.test.mjs 2>&1 | tail -5`

Expected: `# pass 31 # fail 0`.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-aliases.mjs scripts/generate-aliases.test.mjs
git commit -m "feat(RPG-91): insertAliasesAfterTitle z escape'em cudzysłowów"
```

---

### Task 8: CLI — `parseArgs` + `main`

**Files:**
- Modify: `scripts/generate-aliases.mjs`

Brak unit testów — CLI integrujemy przez smoke test w Task 9. Zachowujemy konwencję istniejących skryptów (`report-statblocks.mjs`, `backlinks.mjs`): ręczny loop przez argv, console output, exit 0.

- [ ] **Step 1: Zaimplementuj parseArgs i printHelp**

Dopisz w `scripts/generate-aliases.mjs` przed `export async function main()`:

```javascript
// ─── Args ────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = { dir: "vault", file: null, type: null, system: null, apply: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--dir" && i + 1 < args.length) opts.dir = args[++i];
    else if (a === "--file" && i + 1 < args.length) opts.file = args[++i];
    else if (a === "--type" && i + 1 < args.length) opts.type = args[++i];
    else if (a === "--system" && i + 1 < args.length) opts.system = args[++i];
    else if (a === "--apply") opts.apply = true;
    else if (a === "--help" || a === "-h") { printHelp(); process.exit(0); }
    else { console.error(`Nieznany argument: ${a}`); printHelp(); process.exit(1); }
  }
  return opts;
}

function printHelp() {
  console.error(`Użycie: node scripts/generate-aliases.mjs [opcje]

Opcje:
  --dir <path>           Root vault (domyślnie: vault)
  --file <path>          Tylko jeden plik
  --type <type>          Filtr: bohater-gracza | bohater-niezalezny
  --system <id>          Filtr: l5k | wiedzmin | cold-city | ...
  --apply                Zapisz zmiany (bez tego: dry-run)
  --help, -h             Pokaż pomoc

Domyślnie: dry-run — skanuje vault/, wypisuje propozycje, nic nie zapisuje.`);
}
```

- [ ] **Step 2: Zaimplementuj funkcję analizującą pojedynczy plik**

Dopisz:

```javascript
// ─── Analiza pojedynczego pliku ─────────────────────────────────────────────

async function analyzeFile(filePath, relPath) {
  const content = await readFile(filePath, "utf-8");
  const fm = parseFrontmatter(content);
  if (fm.type !== "bohater-gracza" && fm.type !== "bohater-niezalezny") return null;
  if (!fm.title) return null;

  // Policy skip: klucz aliases istnieje w RAW yaml — niezależnie od wartości.
  const rawYaml = extractRawFrontmatter(content);
  const hasAliasesKey = rawYaml !== null && /^aliases:/m.test(rawYaml);
  if (hasAliasesKey) {
    return { path: relPath, status: "skipped-has-aliases", candidates: [] };
  }

  const raw = generateCandidates(String(fm.title));
  const final = filterCandidates(raw, String(fm.title));
  if (final.length === 0) {
    return { path: relPath, status: "no-candidates", candidates: [] };
  }
  return { path: relPath, status: "proposed", candidates: final, rawYaml, content, filePath };
}
```

- [ ] **Step 3: Zaimplementuj funkcję write**

Dopisz:

```javascript
// ─── Zapis ──────────────────────────────────────────────────────────────────

async function applyAliasesToFile(entry) {
  const aliasList = entry.candidates.map((c) => c.alias);
  const newYaml = insertAliasesAfterTitle(entry.rawYaml, aliasList);
  if (newYaml === null) {
    return { ok: false, error: "brak linii title: — pominięto zapis" };
  }
  const newContent = entry.content.replace(
    /^---\r?\n[\s\S]*?\r?\n---/,
    `---\n${newYaml}\n---`
  );
  await writeFile(entry.filePath, newContent, "utf-8");
  return { ok: true };
}
```

- [ ] **Step 4: Zaimplementuj renderReport i main**

Zamień stub `export async function main()`:

```javascript
// ─── Report ──────────────────────────────────────────────────────────────────

function renderEntry(entry) {
  const lines = [`${entry.path}`];
  for (const c of entry.candidates) {
    const pad = c.alias.length < 40 ? " ".repeat(40 - c.alias.length) : " ";
    lines.push(`  + "${c.alias}"${pad}[${c.source}]`);
  }
  if (entry.written === true) lines.push(`  [zapisano]`);
  if (entry.writeError) lines.push(`  [BŁĄD ZAPISU: ${entry.writeError}]`);
  return lines.join("\n");
}

// ─── Main ────────────────────────────────────────────────────────────────────

export async function main() {
  const opts = parseArgs(process.argv);
  const targetDir = resolve(opts.dir);

  let paths;
  if (opts.file) {
    const p = resolve(opts.file);
    try {
      await readFile(p, "utf-8");
    } catch {
      console.error(`Plik nie istnieje: ${opts.file}`);
      process.exit(1);
    }
    paths = [p];
  } else {
    paths = await findMdFiles(targetDir);
  }

  const entries = [];
  for (const p of paths) {
    const rel = relative(targetDir, p).replace(/\\/g, "/");
    if (rel.startsWith("templates/") || rel.toLowerCase().startsWith("templates/")) continue;
    if (p.endsWith(".excalidraw.md")) continue;

    const entry = await analyzeFile(p, rel);
    if (!entry) continue;

    if (opts.type && entry.candidates.length > 0) {
      // Filtr type/system wymaga wczytania fm ponownie — zbuduj dodatkowy check.
      const content = await readFile(p, "utf-8");
      const fm = parseFrontmatter(content);
      if (opts.type && fm.type !== opts.type) continue;
      if (opts.system && fm.system !== opts.system) continue;
    } else if (opts.type || opts.system) {
      // Dla pozostałych statusów (skipped, no-candidates) też chcemy filtrować.
      const content = await readFile(p, "utf-8");
      const fm = parseFrontmatter(content);
      if (opts.type && fm.type !== opts.type) continue;
      if (opts.system && fm.system !== opts.system) continue;
    }

    if (opts.apply && entry.status === "proposed") {
      const res = await applyAliasesToFile(entry);
      entry.written = res.ok;
      if (!res.ok) entry.writeError = res.error;
    }

    entries.push(entry);
  }

  const proposed = entries.filter((e) => e.status === "proposed");
  const noCands = entries.filter((e) => e.status === "no-candidates");
  const skipped = entries.filter((e) => e.status === "skipped-has-aliases");
  const errors = entries.filter((e) => e.writeError);
  const written = entries.filter((e) => e.written === true);

  for (const e of proposed) console.log(renderEntry(e));

  console.log(`\nPodsumowanie:`);
  console.log(`  Przeskanowano postaci:  ${entries.length}`);
  console.log(`  Z propozycjami:         ${proposed.length}${opts.apply ? ` (zapisano: ${written.length})` : ""}`);
  console.log(`  Bez propozycji:         ${noCands.length}`);
  console.log(`  Pominięto (ma aliases): ${skipped.length}`);
  if (errors.length > 0) {
    console.log(`  Błędy zapisu:           ${errors.length}`);
  }
  if (!opts.apply && proposed.length > 0) {
    console.log(`\nTo był dry-run. Dodaj --apply aby zapisać zmiany.`);
  }
}
```

**Uwaga implementacyjna:** Wyżej powielamy odczyt pliku w bloku filtrowania type/system — to jest pragmatyczna cena za proste `analyzeFile` które nie zwraca full fm. Alternatywa (zwracać fm z analyzeFile) jest w praktyce identyczna pod względem LOC, ale rozszerza interfejs. Zostawiamy jak jest — vault ma <400 plików, wydajność nie jest issue.

- [ ] **Step 5: Uruchom testy — nic się nie zepsuło**

Run: `node --test scripts/generate-aliases.test.mjs 2>&1 | tail -5`

Expected: `# pass 31 # fail 0`.

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-aliases.mjs
git commit -m "feat(RPG-91): CLI main + filter per type/system + report"
```

---

### Task 9: Integration smoke test na realnym vault

**Files:** (tylko testy wykonywalne, brak zmian w kodzie)

- [ ] **Step 1: Dry-run na całym vault**

Run: `node scripts/generate-aliases.mjs 2>&1 | tee /tmp/aliases-dryrun.txt`

Expected output shape (konkretne pliki mogą się różnić, ale obecne spodziewane:):

```
Encyklopedia/Bohaterowie Niezalezni/Donatan Z Tulendalu...md
  + "Donatan z Tulendalu h. Niedźwiedź"     [comma-split]
  + "Łowca Elfów"                           [quote-extract]

Encyklopedia/Bohaterowie Graczy/Baron Kamden Wyndon Hawkwood.md
  + "Kamden Wyndon Hawkwood"                [prefix-strip]

Encyklopedia/Bohaterowie Niezalezni/Hebi Taishiro...md
  + "Hebi Taishiro"                         [dash-split]

...

Podsumowanie:
  Przeskanowano postaci:  78
  Z propozycjami:         15-20 (realna liczba)
  Bez propozycji:         55-60
  Pominięto (ma aliases): 1
```

- [ ] **Step 2: Weryfikacja konkretnych heurystyk**

Sprawdź że output zawiera oczekiwane linie:

```bash
grep -c "comma-split" /tmp/aliases-dryrun.txt   # >= 5 (wiedzmin)
grep -c "dash-split" /tmp/aliases-dryrun.txt    # >= 3 (l5k długie)
grep -c "quote-extract" /tmp/aliases-dryrun.txt # >= 1 (Donatan 'Łowca Elfów')
grep -c "prefix-strip" /tmp/aliases-dryrun.txt  # >= 3 (gasnace-slonca)
grep -c "Yojiro.md" /tmp/aliases-dryrun.txt     # 0 (skipped, ma aliases)
```

Expected: wszystkie > 0 (poza ostatnim który = 0).

- [ ] **Step 3: Filtr --system l5k**

Run: `node scripts/generate-aliases.mjs --system l5k 2>&1 | tail -10`

Expected: `Przeskanowano postaci: 31` (wszystkie L5K), `Z propozycjami` tylko te z " - " w tytule.

- [ ] **Step 4: Filtr --file pojedynczy plik**

Znajdź Donatana:

```bash
find vault -name "Donatan*" -type f
```

Run: `node scripts/generate-aliases.mjs --file "<ta ścieżka>"`

Expected: dwa kandydaci (comma-split + quote-extract), `Przeskanowano postaci: 1`.

- [ ] **Step 5: Regresja — --file nieistniejący**

Run: `node scripts/generate-aliases.mjs --file vault/nonexistent.md; echo "exit: $?"`

Expected: `Plik nie istnieje: vault/nonexistent.md` na stderr, `exit: 1`.

---

### Task 10: Apply + idempotence

**Files:** (testy wykonywalne)

- [ ] **Step 1: Apply do tymczasowego snapshotu vault**

Przygotuj kopię vault do testu:

```bash
rm -rf /tmp/vault-alias-test
cp -r vault /tmp/vault-alias-test
```

- [ ] **Step 2: Pierwszy --apply**

Run: `node scripts/generate-aliases.mjs --dir /tmp/vault-alias-test --apply 2>&1 | tail -15`

Expected: raport z propozycjami, `Z propozycjami: N (zapisano: N)`, bez błędów.

- [ ] **Step 3: Zweryfikuj konkretny plik**

```bash
find /tmp/vault-alias-test -name "Donatan*" -exec head -15 {} \;
```

Expected: linia `aliases: ["Donatan z Tulendalu h. Niedźwiedź", "Łowca Elfów"]` bezpośrednio po `title: ...`.

- [ ] **Step 4: Idempotence — drugi --apply**

Run: `node scripts/generate-aliases.mjs --dir /tmp/vault-alias-test --apply 2>&1 | tail -10`

Expected: `Z propozycjami: 0 (zapisano: 0)`, `Pominięto (ma aliases): ${N+1}` gdzie N to liczba zapisanych w kroku 2 (plus oryginalny Yojiro). Drugi run nie powinien wyprodukować żadnych propozycji, bo wszystkie pliki mają teraz `aliases:`.

- [ ] **Step 5: Walidacja — schemat akceptuje nowe aliases**

Run: `node scripts/vault-tools.mjs validate --dir /tmp/vault-alias-test 2>&1 | tail -3`

Expected: identyczne braki jak przed zmianą (`⚠ 23/286 plików ma braki.` lub podobnie — żadnych nowych).

- [ ] **Step 6: Integracja z backlinks (spot check)**

Run: `node scripts/backlinks.mjs --all --root /tmp/vault-alias-test 2>&1 | head -30`

Expected: dry-run backlinks wypisuje sugestie linkowania — dla epizodów zawierających "Łowca Elfów" / "Hebi Taishiro" / "Kamden Wyndon Hawkwood" pojawią się propozycje linkowania do odpowiednich postaci (choć to zależy od treści epizodów).

- [ ] **Step 7: Cleanup**

```bash
rm -rf /tmp/vault-alias-test
```

- [ ] **Step 8: Apply do prawdziwego vault (po pozytywnej weryfikacji)**

Run: `node scripts/generate-aliases.mjs --apply 2>&1 | tee /tmp/aliases-apply.log | tail -15`

Expected: taki sam shape jak w Task 9, ale z `(zapisano: N)`. Sprawdź `git diff vault/` żeby upewnić się że zmiany są tylko w liniach `aliases:` (żadne inne pola frontmatteru / body nie tknięte).

- [ ] **Step 9: Commit zmian w vault**

```bash
git add vault/
git commit -m "data(RPG-91): backfill aliases dla postaci z długimi tytułami"
```

---

### Task 11: Dokumentacja w CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` (sekcja drzewa repo + „Skrypty vault")

- [ ] **Step 1: Dodaj generate-aliases.mjs do drzewa repo**

Zamień linię z `report-statblocks.mjs` (linia ~54) aby dopisać nową pozycję bezpośrednio pod nią:

```
│   ├── report-statblocks.mjs      ← raport kompletności statbloków BG/BN (per system, lista brakujących pól)
│   ├── generate-aliases.mjs       ← heurystyczny generator aliasów dla BG/BN (comma/dash/quote/prefix)
│   ├── sync-systems.mjs           ← synchronizacja systems-data.json z vault
```

- [ ] **Step 2: Dodaj sekcję „Generator aliasów" po sekcji „Raport kompletności statbloków"**

Znajdź koniec sekcji raport-statblocks (kończy się akapitem zaczynającym się od „Skanuje pliki z `type: bohater-gracza`…"). Dopisz bezpośrednio po niej:

```markdown
### Generator aliasów

```bash
node scripts/generate-aliases.mjs                        # dry-run, cały vault
node scripts/generate-aliases.mjs --apply                # zapis zmian
node scripts/generate-aliases.mjs --system l5k           # filtr system
node scripts/generate-aliases.mjs --type bohater-niezalezny  # filtr type
node scripts/generate-aliases.mjs --file vault/path.md   # pojedynczy plik
```

Heurystyczny generator aliasów dla postaci BG/BN. Cztery heurystyki:
- **comma-split** — segment przed pierwszym `,` (wiedzmin: "Donatan…, Rycerz Zakonu, 32 lata" → "Donatan…")
- **dash-split** — segment przed ` - ` / ` — ` ze spacjami (l5k: "Hebi Taishiro - Czarnoksiężnik…" → "Hebi Taishiro")
- **quote-extract** — zawartość `'...'`, `"..."`, `„..."` (np. `'Łowca Elfów'`)
- **prefix-strip** — iteracyjnie zdejmij pierwsze słowo lowercase (gasnace: "baron Kamden…" → "Kamden…")

**Policy**: jeśli plik ma już klucz `aliases:` — pomijamy w całości (hand-curated wartości nigdy nie nadpisywane). Aby wygenerować na nowo, usuń ręcznie linię i uruchom ponownie.

Tryb domyślny to **dry-run** — wypisuje propozycje do stdout. `--apply` zapisuje zmiany: wstawia `aliases: [...]` flow-style array bezpośrednio po linii `title:`. Nie dotyka body notatki. Integracja z `backlinks.mjs`: nowe aliasy trafiają do indeksu matchowalnych fraz przy kolejnym `backlinks --all`.

Testy jednostkowe heurystyk: `node --test scripts/generate-aliases.test.mjs`.

### Git pre-commit hook
```

**Uwaga:** pozostaw istniejący nagłówek `### Git pre-commit hook` nietknięty — dopisujesz sekcję przed nim.

- [ ] **Step 3: Weryfikacja — CLAUDE.md parsuje się**

Run: `head -200 CLAUDE.md | tail -80`

Expected: nowa sekcja widoczna, bez malformed markdown (żadnych nieparowanych ``` lub `#`).

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(RPG-91): generate-aliases.mjs w drzewie i sekcji skryptów"
```

---

## Self-review — kompletność

1. **Spec coverage** (sekcja Zakres w spec):
   - A. Schema: `aliases` w `arrayFields` 6 typów ✓ Task 1
   - B. Script: `generate-aliases.mjs` z 4 heurystykami ✓ Tasks 2-5
   - B. CLI: `--apply`, `--system`, `--type`, `--file`, `--dir` ✓ Task 8
   - B. Skip policy (klucz aliases istnieje → skip) ✓ Task 8 (`analyzeFile`)
   - B. Insert po `title:` ✓ Task 7
   - B. Report format ✓ Task 8 (`renderEntry`)
   - Tests ✓ Tasks 2-7 (node --test)
   - Integration ✓ Task 9
   - Idempotence ✓ Task 10
   - Docs ✓ Task 11

2. **Placeholder scan**: brak TBD/TODO w krokach implementacyjnych (tylko w pierwszych stubach w Task 2, likwidowane w kolejnych tasakch).

3. **Type consistency**: wszędzie `{alias: string, source: "comma-split"|"dash-split"|"quote-extract"|"prefix-strip"}`. `insertAliasesAfterTitle(yaml, aliasList)` gdzie `aliasList: string[]`. `analyzeFile` zwraca `{path, status, candidates, rawYaml?, content?, filePath?}`. Spójne across tasks.

4. **Brak wiszących referencji**: wszystkie funkcje importowane w testach są eksportowane w tasku, w którym są implementowane.
