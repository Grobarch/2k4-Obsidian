# RPG-91 — Aliases jako first-class pole + generator aliasów

## Kontekst

`scripts/backlinks.mjs` już konsumuje pole `aliases` (tablica stringów) z frontmatteru celów
(BG/BN/artefakt/lokacja/kampania/system) — dla każdego aliasu tworzy osobny wpis matchowalny
w ciałach notatek, z najdłuższymi frazami pierwszymi (aby „Baron Kamden" trafiał przed „Kamden").
Bolączka: `scripts/schema.mjs` nie wymusza tego pola, więc w praktyce aliasy pojawiają się tylko
tam, gdzie ktoś ręcznie je dopisał (dziś: 1 plik, `Yojiro.md`).

Efektem jest szereg postaci z długimi tytułami, których tekst epizodów nigdy nie zlinkuje,
bo pełna forma nie występuje w prozie. Przykład z vault (real data, top-20 długości):

- `"Donatan z Tulendalu h. Niedźwiedź, Rycerz Zakonu Białej Róży, 32 lata, znany również jako 'Łowca Elfów'"` (103 znaki)
- `"Hebi Taishiro - Czarnoksiężnik Maho-tsukai z Zielonym Kryształem - Wężowy Czarownik ze Strażnicy…"` (133 znaki)
- `"Książę Cienia Shosuro Kuno - Cichy Skorpion - Sługa Mrocznego boga Fu Lenga"` (75 znaków)
- `"baron Kamden Wyndon Hawkwood"` (28 znaków, prefix małą literą)

78 BG/BN razem, 27 ma tytuł ≥ 25 znaków, 1 ma już `aliases`.

## Cele

1. Uczynić `aliases` first-class polem w schemacie — żeby `vault-tools validate` rozpoznawał
   je jako znaną tablicę (migrował scalar→array podczas `normalize`, walidował typ tablicowy).
   **Nie** dodajemy do `required[]` — pole pozostaje opcjonalne, bo większość postaci go nie
   potrzebuje (proste tytuły typu `"Akodo Monzo"`).

2. Dostarczyć `scripts/generate-aliases.mjs` — heurystyczny generator aliasów dla postaci
   (bohater-gracza + bohater-niezalezny), wzorowany na konwencjach CLI istniejących skryptów
   (`vault-tools.mjs`, `report-statblocks.mjs`, `backlinks.mjs`): dry-run domyślnie, `--apply`
   gate, filtry `--system` / `--type` / `--file`, output markdown-ish do stdout.

## Zakres

### A. `scripts/schema.mjs` — dodanie `aliases` do `arrayFields`

Pole `aliases` deklarujemy jako opcjonalne, ale typowane:

- Dodać `"aliases"` do `arrayFields` w TYPE_SCHEMAS dla **wszystkich sześciu typów celów
  backlinks.mjs**: `bohater-gracza`, `bohater-niezalezny`, `artefakt`, `lokacja`, `kampania`,
  `system`. Dzięki temu `vault-tools normalize` automatycznie zmigruje scalar `aliases: "foo"`
  na tablicę `aliases: ["foo"]` (Pass 1 w `normalize`).
- **Nie** dodajemy do `required[]` — brak aliasów nie jest błędem walidacji.
- **Nie** dodajemy do `computed[]` — generator jest osobnym skryptem, uruchamianym świadomie,
  nie automatem `normalize` (generowanie może produzować fałszywe pozytywy, więc wymaga
  review z dry-run).
- **Nie** dodajemy do `defaults` — brak sensownej domyślnej wartości.

Skoro `aliases` istnieje w schemacie jako `arrayFields`, `vault-tools validate` nie będzie
już raportował go jako „nieznane pole" — spójność z filozofią schema.mjs jako single source
of truth.

### B. `scripts/generate-aliases.mjs` — nowy skrypt

#### Interfejs CLI

```bash
node scripts/generate-aliases.mjs                        # dry-run, scan vault/
node scripts/generate-aliases.mjs --apply                # zapis zmian
node scripts/generate-aliases.mjs --system l5k           # filtr po system
node scripts/generate-aliases.mjs --type bohater-niezalezny  # filtr po type
node scripts/generate-aliases.mjs --file vault/path.md   # pojedynczy plik
node scripts/generate-aliases.mjs --dir vault            # alternatywny root
```

Parsowanie argumentów przez ręczny loop (wzorzec z `report-statblocks.mjs`), nie używamy
zewnętrznej biblioteki parsera.

#### Scope — kogo skanujemy

- Tylko `type: bohater-gracza` oraz `type: bohater-niezalezny`. Ticket mówi
  wprost „Postacie z długimi tytułami", a generowanie aliasów dla lokacji/artefaktów/kampanii
  wymaga innej domeny heurystyk (YAGNI — jeśli kiedyś zajdzie potrzeba, otwórz osobny ticket).
- Pominięcie `templates/` i `*.excalidraw.md` — wzorzec z `report-statblocks.mjs`.

#### Heurystyki (kolejność i kompozycja)

Cztery heurystyki aplikowane **do pola `title` z frontmatteru** (nie do bazowej nazwy pliku).
Każda produkuje zero lub więcej kandydatów na alias. Wszystkie odpalają się niezależnie;
wyniki są zbierane, deduplikowane (case-sensitive dokładny string), filtrowane
(patrz „Filtry kandydatów"), i zapisywane w kolejności generowania (zachowują porządek:
A, B, C, D → po deduplikacji).

**A. Comma split.** Jeśli tytuł zawiera `,`, weź trimowany segment przed pierwszym
przecinkiem; jeśli po trim jest niepusty i < tytuł, dodaj go jako kandydat.
  - Przykład: `"Donatan z Tulendalu h. Niedźwiedź, Rycerz Zakonu Białej Róży, 32 lata, …"`
    → `"Donatan z Tulendalu h. Niedźwiedź"`.

**B. Dash split.** Jeśli tytuł zawiera ` - ` (ASCII hyphen z otaczającymi spacjami) lub
` — ` (em-dash U+2014), weź trimowany segment przed pierwszym wystąpieniem; jeśli niepusty
i < tytuł, dodaj jako kandydat.
  - Kluczowe: wymagamy spacji z obu stron, żeby nie łamać słów złożonych („Maho-tsukai",
    „Tuk-Tuk", „Naku-gadian"). Surowy `-` bez spacji jest ignorowany.
  - Przykład: `"Hebi Taishiro - Czarnoksiężnik Maho-tsukai z Zielonym Kryształem"`
    → `"Hebi Taishiro"`.

**C. Quoted extraction.** Wyciągnij wszystkie substringi w cudzysłowach: `'...'`, `"..."`,
`„...”` (polski curly quote), `‘...’`. Każdy substring (po trim, jeśli niepusty) → kandydat.
  - Przykład: `"…, znany również jako 'Łowca Elfów'"` → dodaje `"Łowca Elfów"`.
  - Uwaga: W praktyce cytaty występują zwykle **wewnątrz** innych heurystyk (część tytułu
    wiedźmińskiego), więc C uzupełnia A/B, nie konkuruje.

**D. Lowercase prefix strip.** Jeśli pierwsze słowo tytułu zaczyna się małą literą (w tym
polskie `ą/ć/ę/ł/ń/ó/ś/ź/ż`), odetnij je wraz z następującym po nim whitespacem. Powtórz
iteracyjnie dopóki pierwsze słowo jest lowercase-initial — złożone prefiksy typu
`"były żołnierz na usługach …"` też zostaną rozbrojone.
  - Przykład: `"baron Kamden Wyndon Hawkwood"` → `"Kamden Wyndon Hawkwood"`.
  - Przykład: `"kawaler Jose Owiedo Alcazar Toledo"` → `"Jose Owiedo Alcazar Toledo"`.
  - Przykład: `"Były żołnierz na usługach Horikoshi Imochiego"` → pierwsze słowo
    wielką literą, heurystyka nie strzela.
  - Przykład: `"gannokański pilot Speedy Tuk-Tuk"` → zdejmuje 2 słowa → `"Speedy Tuk-Tuk"`.

Świadomie pomijamy „first name without clan surname" — ambiwalentne dla L5K (klan jest
pierwszy, imię drugie: `"Akodo Monzo"` — którą połówkę uznać za alias?), a backlinks.mjs
i tak matchuje długimi frazami pierwszymi, więc 2-wyrazowe tytuły BG/BN nie wymagają aliasów.

#### Filtry kandydatów (po wygenerowaniu)

Przed zapisem każdy kandydat przechodzi filtr:

1. **Niepusty** po trim.
2. **Różny od title** (case-sensitive dokładny string).
3. **Długość ≥ 2 znaki** — chroni przed degenerate „I", „—", pojedynczymi cytatami.
4. **Dedup w ramach pliku** — dokładny string, zachowując kolejność A→B→C→D.

Jeśli po filtrach zero kandydatów — plik zostaje pominięty (raportowany jako
„nic do dodania").

#### Polityka wobec istniejącego pola `aliases`

**Skip entirely**: Jeśli plik ma już **klucz** `aliases:` w frontmatterze — niezależnie
od wartości (pusta tablica, pusty scalar, non-empty) — **pomijamy plik w całości**,
nawet w trybie `--apply`. Raportujemy jako „pominięty: ma aliases".

Uzasadnienie: hand-curated aliasy (jak `Yojiro.md` → `["Ronin Yojiro", "ronin Yojiro"]`)
nigdy nie są nadpisywane. Pusta tablica oznacza świadomą decyzję autora („tu nie chcę
aliasów") — skrypt ją szanuje. Jeśli użytkownik chce dogenerować aliasy dla takiego
pliku, może usunąć ręcznie pole i uruchomić skrypt ponownie.

Konsekwencja: inline helper `insertAliasesAfterTitle` nie musi obsługiwać replace —
tylko insert. Skip gate chroni przed duplikatami linii.

#### Zapis do pliku (`--apply`)

Primitive'y YAML manipulation istnieją w `vault-tools.mjs` (`setFieldInYaml`,
`replaceFrontmatterInContent`), ale są **file-local** — nieeksportowane. Ponieważ nasza
polityka Q2=A (skip jeśli `aliases` istnieje) oznacza że **zawsze tylko wstawiamy, nigdy
nie nadpisujemy**, potrzebujemy prostszego helpera niż generyczny `setFieldInYaml`.

Inline helper w `generate-aliases.mjs` (ok. 15 LOC):

```javascript
// Wstawia `aliases: ["a", "b"]` bezpośrednio po linii `title:` w ciele YAML.
// Założenie: aliases jeszcze nie istnieją (gate na poziomie wyżej).
function insertAliasesAfterTitle(yaml, aliasList) {
  const flowArray = `[${aliasList.map(a => `"${a.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(", ")}]`;
  const re = /^(title:.*)$/m;
  if (!re.test(yaml)) return null; // brak title → nie modyfikujemy
  return yaml.replace(re, `$1\naliases: ${flowArray}`);
}
```

Krok po kroku w `--apply`:

1. Parse frontmatter przez `parseFrontmatter()` z `shared.mjs` (tylko do odczytu: type,
   title, aliases).
2. Wyciągnij surowy YAML z `content.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1]`.
3. Zawołaj `insertAliasesAfterTitle(yaml, aliases)`.
4. Zamień w `content` sekcję frontmattera na nową (wzorzec `replaceFrontmatterInContent`
   z vault-tools, ale inline — jedna linia regex.replace).
5. Zapisz plik przez `writeFile(path, newContent, "utf-8")`.

Flow-style YAML array: `aliases: ["foo", "bar"]` z podwójnymi cudzysłowami dla każdego
elementu. Escape `\\` dla backslash, `\"` dla quote. W praktyce polskie tytuły nie
zawierają tych znaków, ale safety net.

Line endings: jeśli pierwotny `content` używa CRLF (heurystyka: czy pierwsze `\r\n`
występuje przed pierwszym samotnym `\n`), zachowujemy CRLF w wygenerowanym pliku
(replace wstawia `\n`, potem pass normalizacji). W praktyce vault jest pisany w LF
(UTF-8, git z `core.autocrlf=input`), więc zachowanie zgodne z resztą.

Ważne: **nie dotykamy body notatki**. Zasada z `backlinks.mjs`.

Świadoma decyzja out-of-scope: nie refaktorujemy `vault-tools.mjs` eksportem helperów —
ten ticket ma 2h budżet, refactor to osobny ticket jeśli kiedyś `setFieldInYaml` będzie
potrzebne z trzeciego miejsca.

#### Output format

Dry-run wypisuje na stdout (markdown-ish, podobnie jak `report-statblocks.mjs` i sekcja
backlinks dry-run):

```
vault/Encyklopedia/Bohaterowie Graczy/Donatan Z Tulendalu H Niedzwiedz.md
  + "Donatan z Tulendalu h. Niedźwiedź"   [comma-split]
  + "Łowca Elfów"                         [quote-extract]

vault/Encyklopedia/Bohaterowie Graczy/Baron Kamden Wyndon Hawkwood.md
  + "Kamden Wyndon Hawkwood"              [prefix-strip]

vault/Encyklopedia/Bohaterowie Graczy/Hebi Taishiro....md
  + "Hebi Taishiro"                       [dash-split]

…

Podsumowanie:
  Przeskanowano: 78 postaci
  Z propozycjami:  18
  Bez propozycji:  59   (heurystyki nic nie wygenerowały)
  Pominięto:        1   (ma już aliases: ...)
```

Przy `--apply` zamiast dry-run produkuje się identyczną listę, plus per-file suffix
`  [zapisano]` i zmieniony licznik. Exit code 0 w obu trybach (generator nie jest gate).

## Architektura

Jeden plik skryptu, ESM, zero npm dependencies (wzorzec całego `scripts/`). Import
z `shared.mjs` (parseFrontmatter, findMdFiles) i `schema.mjs` (SYSTEM_NAMES do filtra).

Struktura funkcji:

```
parseArgs(argv)              → { apply, system, type, file, dir }
main()
  ├─ findMdFiles / readFile + parseFrontmatter
  ├─ filtr: type in {bohater-gracza, bohater-niezalezny}
  ├─ filtr: opts.system / opts.type / opts.file
  ├─ per-file:
  │    ├─ skipIfHasAliases(fm)       → skip + report
  │    ├─ generateCandidates(title)  → heurystyki A/B/C/D, zwraca [{alias, source}]
  │    ├─ filterCandidates(list)     → niepusty + ≠title + ≥2 znaki + dedup
  │    ├─ jeśli apply: writeAliases(path, content, candidates)
  │    └─ pushReport({path, candidates, skipped|written|empty})
  └─ renderReport(reports)     → stdout
```

Każda heurystyka to osobna funkcja (testowalna w izolacji, jeśli kiedyś dopiszemy testy):

```javascript
function heuristicCommaSplit(title) { ... }  // → string | null
function heuristicDashSplit(title)  { ... }
function heuristicQuoteExtract(title){ ... } // → string[] (może być kilka cytatów)
function heuristicPrefixStrip(title){ ... }  // → string | null
```

Ogólna funkcja `generateCandidates(title)` woła wszystkie cztery i zwraca
`Array<{alias: string, source: "comma-split"|"dash-split"|"quote-extract"|"prefix-strip"}>`
w kolejności A→B→C→D.

## Data flow

```
vault/*.md ──(findMdFiles)──► path list
  │
  ├─ readFile + parseFrontmatter ──► {fm, content}
  │                                    │
  │                                    ├─ fm.type ∉ {BG,BN}          → pomiń cicho
  │                                    ├─ fm.aliases non-empty       → report: skipped
  │                                    ├─ fm.title → generateCandidates
  │                                    │    └─ heurystyki A,B,C,D → candidates[]
  │                                    └─ filterCandidates → final[]
  │                                         │
  │                                         ├─ final.length === 0    → report: empty
  │                                         ├─ !apply                → report: proposed
  │                                         └─ apply                 → writeAliases + report: written
  │
  └─ renderReport → stdout
```

## Obsługa błędów

- `--file` wskazuje plik nieistniejący → `console.error` + `process.exit(1)`.
- Plik bez frontmatteru lub bez `title` → pomijamy cicho (nie jest postacią z alias-able
  tytułem).
- Pisanie do read-only pliku / brak uprawnień → `console.error(path + err.message)` i
  kontynuuj inne pliki (nie przerywamy całego batcha). Exit code 0, ale licznik "błędów"
  w podsumowaniu, jeśli > 0.
- Malformed frontmatter (nie da się sparsować) → pomijamy cicho (wzorzec istniejących
  skryptów, które bazują na `parseFrontmatter` best-effort).

## Test manualny (weryfikacja)

1. **Dry-run smoke**: `node scripts/generate-aliases.mjs` — sprawdzić, czy:
   - Donatan → 2 aliasy (comma-split + quote-extract).
   - Hebi Taishiro → 1 alias (dash-split).
   - baron Kamden → 1 alias (prefix-strip).
   - Yojiro.md → pominięty.
   - Akodo Monzo (2-wyrazowy L5K) → bez propozycji.

2. **Filtr system**: `--system l5k` — tylko L5K (≈31 postaci, z których ~6 dostanie
   aliasy via dash-split).

3. **Filtr file**: `--file "vault/Encyklopedia/Bohaterowie Niezalezni/Donatan...md"` —
   dokładnie jeden plik, dwie propozycje.

4. **Apply + re-run idempotence**: po `--apply` zmienione pliki; drugi `--apply` nie
   produkuje żadnych zmian (bo `aliases` już istnieje → skip). Sprawdzić `git diff` że
   żadne inne linie frontmatteru nie zostały poruszone (tylko wstawienie `aliases:` po
   `title:`).

5. **Integracja z backlinks**: po `--apply`, `node scripts/backlinks.mjs --all` powinien
   znajdować nowe dopasowania (np. w epizodach pojawią się linki do „Donatan z Tulendalu
   h. Niedźwiedź" tam gdzie wcześniej były tylko do pełnego długiego tytułu).

6. **Validate**: `node scripts/vault-tools.mjs validate --dir vault` — zero nowych
   błędów, `aliases` jest znany jako `arrayFields`.

## Poza zakresem

- Generowanie aliasów dla `artefakt`, `lokacja`, `kampania`, `system` — inne domeny
  heurystyk (np. lokacje lepiej obsłużyłby pattern „Winiarnia pod Srebrnym Węgorzem"
  → „Srebrny Węgorz", co jest inny kontrakt niż dzielenie tytułu postaci).
- Interaktywny review (prompt accept/skip/edit per plik) — overkill dla 2h ticketu;
  dry-run + edycja ręczna po apply wystarczy.
- Automatyczne uruchamianie w pre-commit / CI — generator nie jest idempotentny pod
  wpływem zmian heurystyk, więc pozostaje manualnym narzędziem.
- Modyfikowanie istniejących `aliases` (merge / replace) — Q2=A, skip. Jeśli kiedyś
  zajdzie potrzeba, flaga `--merge-existing` w osobnym tickecie.

## Pliki do modyfikacji / utworzenia

- **Modyfikacja**: `scripts/schema.mjs` — `"aliases"` w `arrayFields` dla 6 typów.
- **Nowy**: `scripts/generate-aliases.mjs` — ok. 250–300 LOC.
- **Modyfikacja**: `CLAUDE.md` — dopisać skrypt w drzewie repo + sekcja użycia obok
  „Wstawianie backlinków" i „Raport kompletności statbloków".

## Estymacja

2h (zgodnie z ticketem). Heurystyki są proste regex-based, największa złożoność jest
po stronie zapisu frontmatteru (ale `shared.mjs` i `vault-tools.mjs` dają już prawie
wszystko, czego potrzebujemy).
