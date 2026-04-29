# Spec — `statblock_status` jako computed field + widget "BG/BN do statowania"

**Linear ticket:** brak (zadanie spoza Linear, prefix commitów: `statblock-status`)
**Data:** 2026-04-26
**Status:** ✅ Zaimplementowane (merge `118c517` na `main`, 2026-04-26). Plan: `docs/superpowers/plans/2026-04-26-statblock-status.md`.
**Powiązane:** RPG-89 (dashboard placeholder), RPG-90 (raport statblocks heurystyka), RPG-91 (precedens computed array — `aliases`)

## Problem

`vault/index.md` ma sekcję "BN do statowania" wpisaną w RPG-89 jako placeholder:

> Sekcja zostanie włączona po wdrożeniu raportu kompletności (osobny ticket: "Lista konkretnych postaci z brakującymi polami"). Do tego czasu placeholder — lista wszystkich BN dostępna w Encyklopedii.

Raport został zaimplementowany w RPG-90 (`scripts/report-statblocks.mjs`), ale dashboard nadal pokazuje placeholder — bo dane raportu są obliczane on-demand z body notatek, a nie zapisane w frontmatterze, więc Obsidian Bases nie może po nich filtrować.

**Cel:** zamienić placeholder na działające dynamiczne widget'y (po jednym dla BG i BN), zasilane polem frontmatteru, które samo synchronizuje się z body notatki.

## Decyzje projektowe (z brainstormu)

1. **Scope:** pole `statblock_status` na obu typach (`bohater-gracza` + `bohater-niezalezny`); dwa osobne widget'y w `index.md`. **BG wyżej** w dashboardzie, bo ważniejsze.
2. **Enum (polski ASCII):** `pelny | niepelny | brak-statblocka`.
3. **Strict recompute:** `vault-tools.mjs normalize` zawsze przelicza pole z body, nadpisuje istniejącą wartość. Pole synchronizuje się z body przy każdym normalize (m.in. w pre-commit hooku).

## Architektura

```
scripts/
├── schema.mjs                  ← + "statblock_status" w computed[] dla BG/BN
├── statblock-detect.mjs        ← NEW: pure heurystyki (extractBody, hasStatblock, findMissingFields, computeStatblockStatus)
├── statblock-detect.test.mjs   ← NEW: node --test
├── report-statblocks.mjs       ← refactor: import 3 funkcji z statblock-detect
└── vault-tools.mjs             ← cmdNormalize Pass 2e: recompute statblock_status

vault/
└── index.md                    ← placeholder → 2 widget'y `base` (BG, BN)
```

**Single source of truth:** heurystyka detekcji żyje w `statblock-detect.mjs`. Dwóch konsumentów:
- `report-statblocks.mjs` — generuje raport markdown (potrzebuje też listy brakujących pól per plik)
- `vault-tools.mjs normalize` — recompute pola we frontmatterze (potrzebuje tylko 3-stanu enum)

## Komponenty

### 1. `scripts/schema.mjs` — schema change

W `TYPE_SCHEMAS` dla `bohater-gracza` i `bohater-niezalezny`:

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

**Konsekwencje:**
- Pole **opcjonalne** — nie w `required[]`, więc `validate` nie zgłosi nowych ostrzeżeń przed backfillem
- **Nie tablica** — pojedynczy enum, nie w `arrayFields[]`
- **Nie default** — wartość zależy od body, recompute robi normalize Pass 2e
- **Tylko BG/BN** — pozostałe typy (kampania, system, scenariusz, epizod, lokacja, artefakt, index) nie mają statbloków

### 2. `scripts/statblock-detect.mjs` — pure heurystyki

**Cztery publiczne eksporty.** Wszystkie pure (bez I/O, bez side-effects). Operują na stringach.

```javascript
/** Wyciąga ciało notatki (po frontmatterze). */
export function extractBody(content) {
  const m = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
  return m ? m[1] : content;
}

/**
 * Znajduje wszystkie inline-pola z em-dash placeholderem. Akceptuje formy:
 *   **Label:** —      (kanoniczna z templatów)
 *   **Label**: —      (legacy)
 * Opcjonalnie z frazą w nawiasach: **Label (Opis):** — / **Label (Opis)**: —.
 * Pomija wystąpienia wewnątrz bloków kodu (``` ... ```).
 * Zwraca uporządkowaną listę unikalnych nazw pól (zachowuje kolejność wystąpień).
 */
export function findMissingFields(body) {
  const stripped = body.replace(/```[\s\S]*?```/g, "");
  const missing = [];
  const seen = new Set();
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

/** Czy body zawiera tabelę markdown LUB marker <!-- SYSTEM: --> ? */
export function hasStatblock(body) {
  const stripped = body.replace(/```[\s\S]*?```/g, "");
  if (/<!--\s*SYSTEM:/i.test(stripped)) return true;
  return /^\s*\|.*\|\s*$/m.test(stripped);
}

/**
 * Wysokopoziomowy compute. Zwraca jeden z trzech statusów (polski ASCII):
 *   "pelny"           — body ma statblock + zero pól z em-dash placeholderem
 *   "niepelny"        — body ma statblock + ≥1 pole z em-dash placeholderem
 *   "brak-statblocka" — body nie ma statblocka
 */
export function computeStatblockStatus(content) {
  const body = extractBody(content);
  if (!hasStatblock(body)) return "brak-statblocka";
  if (findMissingFields(body).length === 0) return "pelny";
  return "niepelny";
}
```

**Decyzje:**
- Heurystyki przeniesione 1:1 z `report-statblocks.mjs` (RPG-90 baseline) — żadnej zmiany behavior'u
- Em-dash to konkretnie U+2014 (jak w obecnej implementacji)
- Code blocks ` ```...``` ` strippowane — uniknięcie fałszywych pozytywów (np. base block z pipe'ami)

### 3. `scripts/statblock-detect.test.mjs` — testy unit

Pokrycie pure functions:

```
extractBody:
- z FM (---\n...\n---\nbody)
- bez FM (cały content to body)
- z CRLF (\r\n line endings)
- z trailing newline / bez

findMissingFields:
- kanoniczna forma "**Label:** —"
- legacy forma "**Label**: —"
- z frazą w nawiasach "**Label (Opis):** —"
- w bloku kodu (pomijane)
- dedup (te same pole 2× → 1× w wyniku)
- pusty body → []

hasStatblock:
- tabela markdown (true)
- marker <!-- SYSTEM: l5k --> (true)
- brak (false)
- tabela tylko w bloku kodu (false — strip code first)
- pusty body (false)

computeStatblockStatus:
- complete-path: ma statblock + zero missing → "pelny"
- incomplete-path: ma statblock + ≥1 missing → "niepelny"
- no-statblock-path: brak → "brak-statblocka"
```

Pozioma odporność: jeśli ktoś w przyszłości zmieni heurystykę, testy złapią regresję natychmiast (raport-statblocks i normalize używają tej samej funkcji).

### 4. `scripts/report-statblocks.mjs` — refactor

**Scope:** zamiana lokalnych implementacji na importy. Zero zmian w behavior.

```diff
- import { findMdFiles, parseFrontmatter } from "./shared.mjs";
+ import { findMdFiles, parseFrontmatter } from "./shared.mjs";
+ import { extractBody, findMissingFields, hasStatblock } from "./statblock-detect.mjs";
  import { SYSTEM_NAMES } from "./schema.mjs";

- function extractBody(content) { ... }
- function findMissingFields(body) { ... }
- function hasStatblock(body) { ... }
```

`analyzeFile` zostaje niezmienione — używa zaimportowanych funkcji o identycznych sygnaturach. Po refaktorze: `node scripts/report-statblocks.mjs` produkuje **bit-identyczny** output (zero diff w stdout).

### 5. `scripts/vault-tools.mjs` — Pass 2e w `cmdNormalize`

Po Pass 2d (kampania), przed Pass 3 (defaults):

```javascript
// 2e: statblock_status — recompute z body (zawsze, nie tylko gdy brak)
if (schema.computed.includes("statblock_status")) {
  const newStatus = computeStatblockStatus(f.content);
  const oldStatus = fm.statblock_status || "(brak)";
  if (oldStatus !== newStatus) {
    yaml = setFieldInYaml(yaml, "statblock_status", newStatus);
    mutations.push(`  statblock_status: ${oldStatus} → "${newStatus}"  [computed]`);
  }
}
```

**Import:** `import { computeStatblockStatus } from "./statblock-detect.mjs"` na początku pliku.

**Różnica vs. Pass 2a-2d:**
- 2a-2d: `if (!fm.field)` — tylko gdy brak (lazy)
- 2e: zawsze recompute, mutate jeśli się różni od starej (strict)

**Idempotence:** drugi run normalize bez zmian w body → 0 mutacji per plik (compute zwraca to samo, `oldStatus === newStatus`).

**Performance:** vault ma ~80 BG/BN. Compute dla każdego: 3 regex'y na body (~10-50KB). <1ms/plik. Cały vault <100ms na pass 2e. Acceptable.

**Filtrowanie:** vault-tools normalize i tak iteruje tylko po typach mających entry w `TYPE_SCHEMAS`. Pass 2e wykonuje się tylko gdy `schema.computed.includes("statblock_status")` — czyli tylko BG/BN. Inne typy nietknięte.

### 6. `vault/index.md` — dwa widget'y zamiast placeholderu

Sekcja "BN do statowania" placeholder (linie po `## 🎭 BN do statowania`) zostaje zastąpiona dwoma sekcjami. **BG wyżej** (priorytet — gracze).

```markdown
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
```

**Decyzje (z brainstormu):**
- **Limit 20** per widget — pokrywa obecne 19 niepełnych BN; BG nieznane ale podobny rząd. Limit zapobiega zaśmiecaniu strony przy degradacji statbloków.
- **Type `list`** — kompaktowy, długi alfabetyczny rejestr; alternatywy `cards` (zajmie za dużo miejsca) i `table` (gorsza czytelność per row) odrzucone.
- **Sort `title` ASC** — deterministyczny; alternatywa "po system" niefaisable (grupy systemów się przesuwają jak coś dodajesz).
- **Filter array equality** — `statblock_status == ["niepelny", "brak-statblocka"]` (kompozytowy). Build-bases.mjs wspiera `==[…]` jako "in list" (RPG-89 sprawdzone).
- **`statblock_status` jako kolumna** — żeby od razu odróżnić "niepelny" (jest co dopracować) od "brak-statblocka" (trzeba zacząć od zera).

**Kolejność dashboardu po zmianie:**
1. Główne działy (bez zmian)
2. Ostatnio edytowane (bez zmian)
3. Aktywne kampanie (bez zmian)
4. **🎲 BG do statowania** — nowe
5. **🎭 BN do statowania** — nowe (zamiast placeholder)
6. Rozegrane kampanie (bez zmian)

## Backfill

Jednorazowe po deploy schema + Pass 2e:

```bash
node scripts/vault-tools.mjs normalize --apply
```

Ekspektowane mutacje: ~80 plików BG/BN dostanie pole `statblock_status`. Mix wartości:
- Wszystkie 19 obecnie niepełnych BN → `niepelny`
- Reszta zależy od stanu body — `pelny` jeśli body ma statblock i zero em-dashy; `brak-statblocka` jeśli body puste

Single commit: `data(statblock-status): backfill statblock_status dla BG/BN`.

## Testy

### Unit (`statblock-detect.test.mjs`)
- 4 funkcje, ~15-20 test cases (zob. sekcja 3)
- Run: `node --test scripts/statblock-detect.test.mjs`
- Expected: wszystkie zielone (single source heurystyk)

### Regression (`report-statblocks.mjs`)
- Pre-refactor: zapisz output `node scripts/report-statblocks.mjs > /tmp/before.txt`
- Post-refactor: `node scripts/report-statblocks.mjs > /tmp/after.txt`
- `diff /tmp/before.txt /tmp/after.txt` — expected: zero diff

### Integration (`vault-tools normalize`)
- Pre-backfill: `node scripts/vault-tools.mjs normalize --dir vault 2>&1 | grep statblock_status | wc -l` → ~80 (mutacje na każdym BG/BN)
- Post-backfill (`--apply`): drugi run powinien dać 0 mutacji statblock_status (idempotence)
- Spot check: `grep -A1 "statblock_status:" vault/Encyklopedia/Bohaterowie\ Niezalezni/Akodo\ Monzo.md` → `niepelny`

### Visual (Obsidian + lokalny build)
- Otwórz `vault/index.md` w Obsidian → 2 nowe sekcje renderują się natywnie z listami
- `bash scripts/local-build.sh` → otwórz `localhost:8080/` → BG i BN sekcje pokazują listy z metadanymi

## Walidacja

- `node scripts/vault-tools.mjs validate --dir vault` — zero nowych warningów (pole opcjonalne)
- Pre-commit hook po backfillu — normalize 0 mutacji per commit (jeśli body BG/BN nietknięte)

## Poza zakresem

- Widget per system (np. tylko BG l5k) — można dodać później parametryzując filter; aktualne dwa widgety wystarczają
- Liczba brakujących pól jako kolumna w widget — wymagałoby drugiego computed field `statblock_missing_count`. YAGNI: jeśli ktoś chce listę pól, otwiera plik
- Trigger raportu przy `pelny` per system "100% complete" — nie potrzebne, dashboard wystarcza jako overview
- Escape hatch (`statblock_status_locked: true`) — nie potrzebne. Strict recompute jest "feature, not bug"; jeśli okaże się problemem, dodamy później

## Kompatybilność

- **`report-statblocks.mjs`**: zero behavior change po refaktorze. Optymalizacja "czytaj statblock_status z FM zamiast skanować body" — celowo poza zakresem (vault mały, FM-as-cache to nadbudowa)
- **Pre-commit hook**: niezmieniony. Po backfillu, każde dotknięcie body BG/BN skutkuje synchronizacją pola w tym samym commicie — bez ręcznych kroków
- **CI/CD**: niezmienione. Workflow `.github/workflows/deploy.yml` wywołuje `normalize` na clean checkout → produkuje deterministyczne pole `statblock_status`. Bez wpływu na build artifacts
