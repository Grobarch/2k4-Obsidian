# `statblock_status` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** ✅ Wszystkie 10 tasków zakończone, zmerge'owane do `main` (`118c517`, 2026-04-26).

| Task | Commit | Opis |
|------|--------|------|
| 1 | `54ff985` | schema.mjs: statblock_status w computed[] |
| 2 | `a8c8256` | statblock-detect szkielet + extractBody |
| 3 | `fc3dd48` | findMissingFields heurystyka |
| 4 | `6a367dd` | hasStatblock heurystyka |
| 5 | `89d58ec` | computeStatblockStatus (kompozycja) |
| 6 | `8fdd7a5` | refactor report-statblocks |
| 7 | `d475338` | vault-tools Pass 2e |
| 8 | `5cf7660` | backfill 78 plików BG/BN |
| 9 | `13d072b` | index.md widget'y BG + BN |
| 10 | `5d32ebb` | docs CLAUDE.md |

**Known follow-up:** top-level `limit:` w `build-bases.mjs` nie jest respektowany (widget BG pokazuje 39 wierszy mimo `limit: 20`) — zaspawnowane jako osobny task chip.

**Goal:** Dodać computed field `statblock_status` (`pelny | niepelny | brak-statblocka`) do typów `bohater-gracza` i `bohater-niezalezny`, zsynchronizować pole z body przez `vault-tools.mjs normalize` (strict recompute), i zastąpić placeholder w `vault/index.md` dwoma widget'ami `base` (BG + BN).

**Architecture:** Single source of truth heurystyk w nowym module `scripts/statblock-detect.mjs` (4 pure funkcje, eksportowane). Refaktor `report-statblocks.mjs` żeby reużywał heurystyki zamiast lokalnych kopii. Dodanie Pass 2e w `cmdNormalize` dla strict recompute. Dwa widget'y `base` w `index.md` (BG wyżej, BN niżej).

**Tech Stack:** Node.js >=18 ESM, `node:test` + `node:assert/strict`, `shared.mjs` (parseFrontmatter, findMdFiles, extractRawFrontmatter), `schema.mjs`, Obsidian Bases (filtrowanie po frontmatterze).

---

## Struktura plików

**Nowe:**
- `scripts/statblock-detect.mjs` — pure heurystyki: `extractBody`, `findMissingFields`, `hasStatblock`, `computeStatblockStatus`
- `scripts/statblock-detect.test.mjs` — testy unit (`node --test`)

**Modyfikowane:**
- `scripts/schema.mjs:41-48,50-55` — dodanie `"statblock_status"` do `computed[]` dla BG i BN
- `scripts/report-statblocks.mjs:32-93` — usunięcie lokalnych `extractBody`, `findMissingFields`, `hasStatblock`; import z `statblock-detect.mjs`
- `scripts/vault-tools.mjs:29-30,409-411` — import `computeStatblockStatus`; dodanie Pass 2e w `cmdNormalize`
- `vault/index.md:62-66` — usunięcie placeholderu BN; wstawienie 2 widget'ów `base`
- `CLAUDE.md` — dokumentacja: nowy plik w drzewie + opis pola w sekcji formatu

---

### Task 1: Dodanie `statblock_status` do `TYPE_SCHEMAS`

**Files:**
- Modify: `scripts/schema.mjs:41-55`

- [x] **Step 1: Zmodyfikuj `computed` dla `bohater-gracza` i `bohater-niezalezny`**

W pliku `scripts/schema.mjs`, w `TYPE_SCHEMAS`, zamień dwa wpisy:

```diff
   "bohater-gracza": {
     required:    ["title", "type", "system", "system_pelna", "tags"],
     arrayFields: ["tags", "kampania", "kampania_link", "aliases"],
-    computed:    ["system_pelna", "tags"],
+    computed:    ["system_pelna", "tags", "statblock_status"],
     defaults:    {},
   },
   "bohater-niezalezny": {
     required:    ["title", "type", "system", "system_pelna", "tags"],
     arrayFields: ["tags", "kampania", "kampania_link", "aliases"],
-    computed:    ["system_pelna", "tags"],
+    computed:    ["system_pelna", "tags", "statblock_status"],
     defaults:    {},
   },
```

Pozostałe typy (epizod, kampania, system, lokacja, artefakt, scenariusz, index) — bez zmian.

- [x] **Step 2: Weryfikacja — validate nadal działa, brak nowych błędów**

Run: `node scripts/vault-tools.mjs validate --dir vault 2>&1 | tail -3`

Expected: identyczna liczba ostrzeżeń jak baseline (`⚠ 23/286 plików ma braki.`). Pole nie jest w `required[]`, więc validate go nie sprawdza.

- [x] **Step 3: Commit**

```bash
git add scripts/schema.mjs
git commit -m "feat(statblock-status): statblock_status w computed[] dla BG/BN"
```

---

### Task 2: Szkielet `statblock-detect.mjs` + `extractBody` (TDD)

**Files:**
- Create: `scripts/statblock-detect.mjs`
- Create: `scripts/statblock-detect.test.mjs`

- [x] **Step 1: Utwórz plik testowy z testami dla `extractBody`**

```javascript
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
  // Regex wymaga \n po ---; gdy go brak, traktujemy całość jako body (fallback)
  // Ale w realnym vault każdy plik ma \n po ---. Test sprawdza fallback.
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
```

- [x] **Step 2: Uruchom test — RED (moduł nie istnieje)**

Run: `node --test scripts/statblock-detect.test.mjs 2>&1 | head -10`

Expected: FAIL z `Cannot find module './statblock-detect.mjs'` lub podobne.

- [x] **Step 3: Utwórz `scripts/statblock-detect.mjs` ze szkieletem 4 funkcji**

```javascript
#!/usr/bin/env node
/**
 * statblock-detect.mjs — Heurystyki detekcji kompletności statbloka
 *
 * Single source of truth dla report-statblocks.mjs i vault-tools.mjs normalize.
 * Wszystkie funkcje pure — pracują na stringach, bez I/O.
 *
 * Heurystyki przeniesione 1:1 z report-statblocks.mjs (RPG-90 baseline):
 *   1. "Brakujące pole" — wzorzec **Label:** —  lub  **Label**: —
 *      (em-dash U+2014 po polu w pogrubieniu). Pomijamy bloki kodu.
 *   2. "Bez statblocka" — brak tabeli markdown ORAZ brak markera <!-- SYSTEM: -->.
 *   3. Pojedyncze komórki | — | i puste komórki w tabelach świadomie pomijamy
 *      (false positive w L5K — em-dash to celowa wartość modyfikatora).
 */

/** Wyciąga ciało notatki (po frontmatterze). */
export function extractBody(content) {
  const m = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
  return m ? m[1] : content;
}

/**
 * Znajduje wszystkie inline-pola z em-dash placeholderem. Akceptuje formy:
 *   **Label:** —      (kanoniczna z templatów)
 *   **Label**: —      (legacy)
 * Opcjonalnie z frazą w nawiasach: **Label (Opis):** —.
 * Pomija wystąpienia wewnątrz bloków kodu (``` ... ```).
 * Zwraca uporządkowaną listę unikalnych nazw pól (zachowuje kolejność).
 */
export function findMissingFields(body) {
  return []; // TODO task 3
}

/** Czy body zawiera tabelę markdown LUB marker <!-- SYSTEM: --> ? */
export function hasStatblock(body) {
  return false; // TODO task 4
}

/**
 * Wysokopoziomowy compute. Zwraca jeden z trzech statusów (polski ASCII):
 *   "pelny"           — body ma statblock + zero pól z em-dash placeholderem
 *   "niepelny"        — body ma statblock + ≥1 pole z em-dash placeholderem
 *   "brak-statblocka" — body nie ma statblocka
 */
export function computeStatblockStatus(content) {
  return "brak-statblocka"; // TODO task 5
}
```

- [x] **Step 4: Uruchom testy — GREEN dla extractBody**

Run: `node --test scripts/statblock-detect.test.mjs 2>&1 | tail -5`

Expected: `# pass 5 # fail 0` (5 testów `extractBody` przechodzi; stuby pozostałych funkcji nie są testowane jeszcze).

- [x] **Step 5: Commit**

```bash
git add scripts/statblock-detect.mjs scripts/statblock-detect.test.mjs
git commit -m "feat(statblock-status): szkielet statblock-detect + extractBody"
```

---

### Task 3: `findMissingFields` (TDD)

**Files:**
- Modify: `scripts/statblock-detect.mjs` (funkcja `findMissingFields`)
- Modify: `scripts/statblock-detect.test.mjs` (dodaj testy)

- [x] **Step 1: Dopisz testy na końcu `statblock-detect.test.mjs`**

```javascript
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
```

- [x] **Step 2: Uruchom — RED (stub zwraca [])**

Run: `node --test scripts/statblock-detect.test.mjs 2>&1 | tail -10`

Expected: 6 nowych testów FAIL (te które oczekują nie-pustej tablicy); 1 test (pusty body) PASS przypadkiem.

- [x] **Step 3: Zaimplementuj `findMissingFields`**

Zamień body funkcji w `scripts/statblock-detect.mjs`:

```javascript
export function findMissingFields(body) {
  const stripped = body.replace(/```[\s\S]*?```/g, "");
  const missing = [];
  const seen = new Set();
  // Regex dopuszcza `:` przed LUB po zamykającym `**` (obie konwencje w vault).
  const re = /\*\*\s*([^*\n:]+?)(?:\s*\([^)\n]*\))?\s*:?\s*\*\*\s*:?\s*—/g;
  let m;
  while ((m = re.exec(stripped)) !== null) {
    const name = m[1].trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      missing.push(name);
    }
  }
  return missing;
}
```

- [x] **Step 4: Uruchom — GREEN**

Run: `node --test scripts/statblock-detect.test.mjs 2>&1 | tail -5`

Expected: `# pass 12 # fail 0`.

- [x] **Step 5: Commit**

```bash
git add scripts/statblock-detect.mjs scripts/statblock-detect.test.mjs
git commit -m "feat(statblock-status): findMissingFields heurystyka"
```

---

### Task 4: `hasStatblock` (TDD)

**Files:**
- Modify: `scripts/statblock-detect.mjs` (funkcja `hasStatblock`)
- Modify: `scripts/statblock-detect.test.mjs`

- [x] **Step 1: Dopisz testy**

```javascript
import { hasStatblock } from "./statblock-detect.mjs";

test("hasStatblock: tabela markdown — true", () => {
  const body = "| Atrybut | Wartość |\n|---------|--------|\n| Honor | 3 |";
  assert.equal(hasStatblock(body), true);
});

test("hasStatblock: marker <!-- SYSTEM: l5k --> — true", () => {
  const body = "<!-- SYSTEM: l5k -->\n**Honor:** 3";
  assert.equal(hasStatblock(body), true);
});

test("hasStatblock: marker case-insensitive", () => {
  const body = "<!-- system: l5k -->\n";
  assert.equal(hasStatblock(body), true);
});

test("hasStatblock: tabela tylko w bloku kodu — false", () => {
  const body = "```\n| A | B |\n|---|---|\n| 1 | 2 |\n```";
  assert.equal(hasStatblock(body), false);
});

test("hasStatblock: brak tabeli i markera — false", () => {
  const body = "Just plain prose without any table.";
  assert.equal(hasStatblock(body), false);
});

test("hasStatblock: pusty body — false", () => {
  assert.equal(hasStatblock(""), false);
});
```

- [x] **Step 2: Uruchom — RED (stub zwraca false)**

Run: `node --test scripts/statblock-detect.test.mjs 2>&1 | tail -10`

Expected: 3 nowe FAIL (3 testów oczekujących `true`).

- [x] **Step 3: Zaimplementuj `hasStatblock`**

```javascript
export function hasStatblock(body) {
  const stripped = body.replace(/```[\s\S]*?```/g, "");
  if (/<!--\s*SYSTEM:/i.test(stripped)) return true;
  return /^\s*\|.*\|\s*$/m.test(stripped);
}
```

- [x] **Step 4: Uruchom — GREEN**

Run: `node --test scripts/statblock-detect.test.mjs 2>&1 | tail -5`

Expected: `# pass 18 # fail 0`.

- [x] **Step 5: Commit**

```bash
git add scripts/statblock-detect.mjs scripts/statblock-detect.test.mjs
git commit -m "feat(statblock-status): hasStatblock heurystyka"
```

---

### Task 5: `computeStatblockStatus` (kompozycja + TDD)

**Files:**
- Modify: `scripts/statblock-detect.mjs` (funkcja `computeStatblockStatus`)
- Modify: `scripts/statblock-detect.test.mjs`

- [x] **Step 1: Dopisz testy**

```javascript
import { computeStatblockStatus } from "./statblock-detect.mjs";

test("computeStatblockStatus: pełny statblock → 'pelny'", () => {
  const content = "---\ntitle: Foo\n---\n<!-- SYSTEM: l5k -->\n**Honor:** 3\n**Chwała:** 1.5\n";
  assert.equal(computeStatblockStatus(content), "pelny");
});

test("computeStatblockStatus: niepełny (em-dash) → 'niepelny'", () => {
  const content = "---\ntitle: Foo\n---\n<!-- SYSTEM: l5k -->\n**Honor:** 3\n**Chwała:** —\n";
  assert.equal(computeStatblockStatus(content), "niepelny");
});

test("computeStatblockStatus: brak statblocka → 'brak-statblocka'", () => {
  const content = "---\ntitle: Foo\n---\nJust prose, no statblock.\n";
  assert.equal(computeStatblockStatus(content), "brak-statblocka");
});

test("computeStatblockStatus: tabela bez em-dashy → 'pelny'", () => {
  const content = "---\ntitle: Foo\n---\n| A | B |\n|---|---|\n| 1 | 2 |";
  assert.equal(computeStatblockStatus(content), "pelny");
});

test("computeStatblockStatus: tabela z em-dashem w komórce → 'pelny' (świadomie pomijamy puste komórki)", () => {
  // | — | w tabeli to nie jest placeholder pola — to celowa wartość (l5k modyfikatory)
  const content = "---\ntitle: Foo\n---\n| A | B |\n|---|---|\n| Martwy | — |";
  assert.equal(computeStatblockStatus(content), "pelny");
});
```

- [x] **Step 2: Uruchom — RED**

Run: `node --test scripts/statblock-detect.test.mjs 2>&1 | tail -10`

Expected: 4 FAIL (stub zwraca `"brak-statblocka"` zawsze; 1 test od razu PASS przypadkiem).

- [x] **Step 3: Zaimplementuj `computeStatblockStatus` jako kompozycję**

```javascript
export function computeStatblockStatus(content) {
  const body = extractBody(content);
  if (!hasStatblock(body)) return "brak-statblocka";
  if (findMissingFields(body).length === 0) return "pelny";
  return "niepelny";
}
```

- [x] **Step 4: Uruchom — GREEN**

Run: `node --test scripts/statblock-detect.test.mjs 2>&1 | tail -5`

Expected: `# pass 23 # fail 0`.

- [x] **Step 5: Commit**

```bash
git add scripts/statblock-detect.mjs scripts/statblock-detect.test.mjs
git commit -m "feat(statblock-status): computeStatblockStatus (kompozycja 3 heurystyk)"
```

---

### Task 6: Refactor `report-statblocks.mjs` — reuse `statblock-detect.mjs`

**Files:**
- Modify: `scripts/report-statblocks.mjs:32-93`

**Cel refaktoru:** zero zmian behavior'u (raport markdown identyczny), tylko delete dupli i import.

- [x] **Step 1: Zapisz baseline output PRZED refaktorem**

Run:
```bash
node scripts/report-statblocks.mjs > /tmp/report-before.txt 2>&1
wc -l /tmp/report-before.txt
```

Expected: ~50-100 linii (zależy od stanu vault). Zapamiętaj liczbę.

- [x] **Step 2: Zaimportuj funkcje z `statblock-detect.mjs`**

W `scripts/report-statblocks.mjs` zamień blok importów (linie 32-35):

```diff
 import { readFile, writeFile } from "node:fs/promises";
 import { relative, resolve } from "node:path";
 import { findMdFiles, parseFrontmatter } from "./shared.mjs";
+import { extractBody, findMissingFields, hasStatblock } from "./statblock-detect.mjs";
 import { SYSTEM_NAMES } from "./schema.mjs";
```

- [x] **Step 3: Usuń lokalne implementacje 3 funkcji**

W `scripts/report-statblocks.mjs` usuń całe definicje (linie ~52-93):
- `function extractBody(content) { ... }`
- `function findMissingFields(body) { ... }`
- `function hasStatblock(body) { ... }`

Wraz z ich komentarzami JSDoc i sekcji `// ─── Detekcja ───`.

`analyzeFile` (linia ~95) zostaje **niezmienione** — używa już teraz importowanych funkcji.

- [x] **Step 4: Weryfikacja — output identyczny po refaktorze**

Run:
```bash
node scripts/report-statblocks.mjs > /tmp/report-after.txt 2>&1
diff /tmp/report-before.txt /tmp/report-after.txt; echo "exit: $?"
```

Expected: `exit: 0` (zero diff, output bit-identyczny).

- [x] **Step 5: Weryfikacja — testy nadal zielone**

Run: `node --test scripts/statblock-detect.test.mjs 2>&1 | tail -3`

Expected: `# pass 23 # fail 0`.

- [x] **Step 6: Commit**

```bash
git add scripts/report-statblocks.mjs
git commit -m "refactor(statblock-status): report-statblocks używa statblock-detect"
```

---

### Task 7: `vault-tools.mjs` — Pass 2e w `cmdNormalize`

**Files:**
- Modify: `scripts/vault-tools.mjs:29-30,409-411`

- [x] **Step 1: Dodaj import `computeStatblockStatus`**

W `scripts/vault-tools.mjs` zamień import shared (linia ~29):

```diff
 import { findMdFiles, parseFrontmatter, extractRawFrontmatter, slugify, setFieldIfAbsentInYaml } from "./shared.mjs";
 import { TYPE_SCHEMAS, SYSTEM_NAMES } from "./schema.mjs";
+import { computeStatblockStatus } from "./statblock-detect.mjs";
```

- [x] **Step 2: Wstaw Pass 2e w `cmdNormalize` po Pass 2d**

W `scripts/vault-tools.mjs` znajdź koniec Pass 2d (linia ~409, zaraz przed komentarzem `// ── Pass 3: Fill defaults`). Dodaj nowy blok:

```javascript
    // 2e: statblock_status — strict recompute z body (zawsze, nie tylko gdy brak)
    if (schema.computed.includes("statblock_status")) {
      const newStatus = computeStatblockStatus(f.content);
      const oldStatus = fm.statblock_status || "(brak)";
      if (oldStatus !== newStatus) {
        yaml = setFieldInYaml(yaml, "statblock_status", newStatus);
        mutations.push(`  statblock_status: ${oldStatus} → "${newStatus}"  [computed]`);
      }
    }

```

Wstaw bezpośrednio przed `// ── Pass 3: Fill defaults for missing fields ──`.

- [x] **Step 3: Smoke dry-run — sprawdź co normalize zaproponuje**

Run: `node scripts/vault-tools.mjs normalize --dir vault 2>&1 | grep statblock_status | head -10`

Expected: kilka linii typu:
```
  statblock_status: (brak) → "niepelny"  [computed]
  statblock_status: (brak) → "pelny"  [computed]
  statblock_status: (brak) → "brak-statblocka"  [computed]
```

Łącznie ~80 mutacji (BG + BN). Wszystkie w trybie dry-run.

- [x] **Step 4: Pełny licznik — ile postaci dostanie pole?**

Run: `node scripts/vault-tools.mjs normalize --dir vault 2>&1 | grep -c "statblock_status:"`

Expected: ~80 (mniej więcej liczba BG + BN w vault).

- [x] **Step 5: Sanity — wartości rozłożone sensownie**

Run:
```bash
node scripts/vault-tools.mjs normalize --dir vault 2>&1 | grep statblock_status | awk -F'"' '{print $2}' | sort | uniq -c
```

Expected: 3 wartości (`pelny`, `niepelny`, `brak-statblocka`) z rozsądnymi liczbami:
- `niepelny`: ≥19 (wszystkie z raportu RPG-90)
- `pelny`: większość (BG + reszta BN)
- `brak-statblocka`: kilka edge cases

- [x] **Step 6: Commit (sam Pass 2e, bez backfillu)**

```bash
git add scripts/vault-tools.mjs
git commit -m "feat(statblock-status): vault-tools normalize Pass 2e (strict recompute statblock_status)"
```

---

### Task 8: Backfill całego vault + idempotence verify

**Files:** (operacje wykonywalne, brak zmian w kodzie)

- [x] **Step 1: Backfill na tymczasowej kopii vault (sandbox)**

```bash
rm -rf /tmp/vault-statblock-test
cp -r vault /tmp/vault-statblock-test
node scripts/vault-tools.mjs normalize --dir /tmp/vault-statblock-test --apply 2>&1 | tail -10
```

Expected: `[ZAPISANO] normalize: ~80/286 plików zmodyfikowano.` (lub podobnie — istotne że >0).

- [x] **Step 2: Spot check — Akodo Monzo (znany niepełny BN)**

```bash
head -10 "/tmp/vault-statblock-test/Encyklopedia/Bohaterowie Niezalezni/Akodo Monzo.md"
```

Expected: linia `statblock_status: "niepelny"` we frontmatterze.

- [x] **Step 3: Idempotence — drugi run normalize → 0 mutacji**

```bash
node scripts/vault-tools.mjs normalize --dir /tmp/vault-statblock-test --apply 2>&1 | grep statblock_status
echo "exit: $?"
```

Expected: zero linii ze `statblock_status:` (compute zwraca to samo, oldStatus === newStatus, no mutation). Exit 1 z grep'a (no matches) jest OK.

- [x] **Step 4: Validate — zero nowych warningów**

Run: `node scripts/vault-tools.mjs validate --dir /tmp/vault-statblock-test 2>&1 | tail -3`

Expected: identyczna liczba warningów jak baseline (~23).

- [x] **Step 5: Cleanup sandbox**

```bash
rm -rf /tmp/vault-statblock-test
```

- [x] **Step 6: Backfill na prawdziwym vault**

```bash
node scripts/vault-tools.mjs normalize --dir vault --apply 2>&1 | tail -5
```

Expected: identyczna liczba zmodyfikowanych plików jak w kroku 1 (sandbox był kopią).

- [x] **Step 7: Sanity git diff — zmiany tylko w polu statblock_status**

```bash
git diff vault/ --stat | tail -5
git diff vault/ | grep "^+" | grep -v "^+++" | grep -v "statblock_status:" | head -5
```

Expected:
- Stat pokazuje ~80 plików modified, każdy +1 line
- Grep "+wiersze ≠ statblock_status" — pusty (zero linii)

Jeśli widzisz inne zmiany — STOP, zgłoś jako concern.

- [x] **Step 8: Commit backfill**

```bash
git add vault/
git commit -m "data(statblock-status): backfill statblock_status dla BG/BN"
```

---

### Task 9: `vault/index.md` — dwa widget'y zamiast placeholderu

**Files:**
- Modify: `vault/index.md:62-66`

- [x] **Step 1: Zamień sekcję "BN do statowania" placeholder na dwa widget'y**

W `vault/index.md` znajdź sekcję `## 🎭 BN do statowania` z callout'em `> [!todo]` (linie ~62-66) oraz separator `***` po niej. Zamień blok:

```markdown
## 🎭 BN do statowania

> [!todo] Raport kompletności statblocków
> Sekcja zostanie włączona po wdrożeniu raportu kompletności (osobny ticket: lista konkretnych postaci z brakującymi polami statblocka). Do tego czasu: przeglądaj wszystkich BN w [Encyklopedii → Bohaterowie Niezależni](/encyklopedia/bohaterowie-niezalezni/bohaterowie-niezalezni).

***
```

na:

````markdown
## 🎲 BG do statowania

```base
filters:
  and:
    - type == "bohater-gracza"
    - statblock_status == ["niepelny", "brak-statblocka"]
limit: 20
views:
  - type: list
    name: BG do statowania
    order:
      - file.name
      - system_pelna
      - statblock_status
      - kampania
    sort:
      - property: title
        direction: ASC
```

## 🎭 BN do statowania

```base
filters:
  and:
    - type == "bohater-niezalezny"
    - statblock_status == ["niepelny", "brak-statblocka"]
limit: 20
views:
  - type: list
    name: BN do statowania
    order:
      - file.name
      - system_pelna
      - statblock_status
      - kampania
    sort:
      - property: title
        direction: ASC
```

***
````

**Uwaga**: kolejność sekcji po zmianie:
1. Główne działy
2. Aktywne kampanie
3. Ostatnio edytowane
4. **🎲 BG do statowania** ⬅️ nowe
5. **🎭 BN do statowania** ⬅️ nowe (zamiast placeholder)
6. Rozegrane kampanie

- [x] **Step 2: Smoke build-bases — czy konwersja działa?**

```bash
node scripts/build-bases.mjs vault 2>&1 | grep -E "(SKIP|ERROR|index\.md)" | head -10
```

Expected: brak linii `SKIP: nieobsługiwane wyrażenie` ani `ERROR` dla `index.md`. Jeśli widzisz `SKIP` w nowych blokach — heurystyka filtru `==[...]` w `build-bases.mjs` może wymagać adresacji (sprawdź `vault/Systemy/.../*.md` — mają `==[...]` precedens, więc powinno działać).

- [x] **Step 3: Commit**

```bash
git add vault/index.md
git commit -m "feat(statblock-status): widget BG/BN do statowania w index.md"
```

---

### Task 10: Visual verify + dokumentacja CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` (sekcja drzewa repo + sekcja "Format plików vault")

- [x] **Step 1: Lokalny build + visual sanity**

```bash
bash scripts/local-build.sh --build 2>&1 | tail -10
```

Expected: build zakończony sukcesem (`bash scripts/local-build.sh --build` buduje bez `serve`).

- [x] **Step 2: Otwórz Obsidian i sprawdź index.md**

Manualne: otwórz `vault/index.md` w Obsidian. Sprawdź:
- Sekcja "🎲 BG do statowania" — renderuje się jako list z file.name (klikalny), system_pelna, statblock_status, kampania
- Sekcja "🎭 BN do statowania" — analogicznie, lista 19 niepełnych BN
- Brak "BN do statowania" placeholderu

Jeśli widzisz problemy renderowania — wróć do Task 9 i sprawdź syntax bloku base.

- [x] **Step 3: Dodaj `statblock-detect.mjs` do drzewa repo w CLAUDE.md**

W CLAUDE.md, w sekcji `scripts/`, znajdź linię z `report-statblocks.mjs`. **Bezpośrednio po niej** dodaj:

```
│   ├── statblock-detect.mjs       ← pure heurystyki kompletności statblocka (single source of truth)
```

- [x] **Step 4: Dodaj wzmiankę o `statblock_status` w sekcji "Format plików vault"**

W CLAUDE.md, w sekcji `## Format plików vault`, znajdź akapit:

```markdown
Każdy plik ma YAML frontmatter. Kanoniczne definicje pól → `scripts/schema.mjs` (`TYPE_SCHEMAS`, `SYSTEM_NAMES`).
```

**Bezpośrednio po nim** (przed listą "Przykłady rzeczywistych plików") wstaw:

```markdown
**Computed fields** (wypełniane przez `vault-tools.mjs normalize`):
- `system_pelna` — pełna nazwa systemu (mapping z `SYSTEM_NAMES` w `schema.mjs`)
- `tags` — `[type, system]` dodawane jeśli brak
- `kampania_link` / `kampania` — ścieżka i nazwa folderu nadrzędnego (epizod)
- `statblock_status` (BG/BN) — `pelny | niepelny | brak-statblocka`, **strict recompute** z body przy każdym normalize. Używane przez widget BG/BN w `index.md`.

```

- [x] **Step 5: Weryfikacja — CLAUDE.md parsuje się**

```bash
head -250 CLAUDE.md | tail -100
```

Expected: nowa zawartość widoczna; brak nieparowanych ``` ani `#`.

- [x] **Step 6: Commit dokumentacji**

```bash
git add CLAUDE.md
git commit -m "docs(statblock-status): statblock-detect + computed statblock_status w CLAUDE.md"
```

- [x] **Step 7: Final verification — wszystkie testy zielone**

```bash
node --test scripts/generate-aliases.test.mjs 2>&1 | tail -3
node --test scripts/statblock-detect.test.mjs 2>&1 | tail -3
node scripts/vault-tools.mjs validate --dir vault 2>&1 | tail -3
```

Expected:
- generate-aliases: `# pass 31 # fail 0` (RPG-91 baseline nietknięty)
- statblock-detect: `# pass 23 # fail 0`
- validate: identyczna liczba warningów jak baseline (~23)

---

## Self-review — kompletność

1. **Spec coverage:**
   - Schema change ✓ Task 1
   - statblock-detect.mjs (4 funkcje) ✓ Tasks 2-5
   - statblock-detect.test.mjs (testy) ✓ Tasks 2-5
   - report-statblocks.mjs refactor ✓ Task 6
   - vault-tools.mjs Pass 2e ✓ Task 7
   - Backfill ✓ Task 8
   - index.md widget'y ✓ Task 9
   - CLAUDE.md docs ✓ Task 10

2. **Placeholder scan:** Wszystkie kroki mają konkretny kod / komendy. Stuby w Task 2 (`return []`, `return false`, `return "brak-statblocka"`) są celowe — likwidowane w Tasks 3, 4, 5 odpowiednio.

3. **Type consistency:**
   - `extractBody(content) → string` — używane w Task 5, 6, 7
   - `findMissingFields(body) → string[]` — używane w Task 5, 6
   - `hasStatblock(body) → boolean` — używane w Task 5, 6
   - `computeStatblockStatus(content) → "pelny" | "niepelny" | "brak-statblocka"` — używane w Task 7
   - Wszystkie sygnatury spójne across tasków.

4. **Brak wiszących referencji:** wszystkie funkcje importowane w testach są eksportowane w odpowiednich taskach przed użyciem.

5. **Idempotence:** Task 8 sprawdza explicite (krok 3). Strict recompute zwraca tę samą wartość przy braku zmian w body, więc no-op.
