# CLAUDE.md — Wiki RPG

## Projekt

Publiczna wiki dokumentująca kampanie TTRPG Arkadiusza Rygla.
Blog źródłowy: arkadiusz-rygiel.blogspot.com

**Stack:** Obsidian (edycja lokalna) + Quartz (generator) + GitHub Pages (hosting)

## Struktura repo

```
2k4-Obsidian/               ← root repo
├── vault/                  ← Obsidian vault (root dla Obsidian — .obsidian/ jest tu)
│   ├── index.md            ← strona główna wiki
│   ├── Encyklopedia/
│   │   ├── Encyklopedia.md     ← folder note (z przyciskiem tworzenia postaci + tabelą base)
│   │   ├── Bohaterowie Graczy/
│   │   │   └── Bohaterowie Graczy.md   ← folder note
│   │   ├── Bohaterowie Niezalezni/
│   │   │   └── Bohaterowie Niezalezni.md ← folder note
│   │   ├── Lokacje/
│   │   │   └── Lokacje.md      ← folder note
│   │   └── Artefakty/
│   │       └── Artefakty.md    ← folder note
│   ├── Artykuły/
│   │   └── Artykuły.md        ← folder note (tabela base: type == "artykul")
│   ├── Systemy/            ← systemy RPG + kampanie + epizody + scenariusze
│   │   └── Cold City/          ← folder systemu
│   │       ├── Cold City.md    ← folder note systemu (z blokami base)
│   │       ├── Cold Tales/         ← folder kampanii
│   │       │   ├── Cold Tales.md   ← folder note kampanii (z blokami base)
│   │       │   └── Epizod 01.md
│   │       └── Scenariusze/        ← scenariusze systemu
│   │           ├── Scenariusze.md  ← folder note (base: file.inFolder)
│   │           └── Scenariusz.md
│   ├── templates/          ← szablony Obsidian (ignorowane przez Quartz)
│   │   ├── Utwórz Postać.md    ← formularz tworzenia postaci
│   │   ├── Utwórz Artefakt.md  ← formularz tworzenia artefaktu
│   │   ├── Utwórz Lokację.md   ← formularz tworzenia lokacji
│   │   ├── Utwórz Kampanię.md  ← formularz tworzenia kampanii (z blokami base)
│   │   ├── Utwórz System.md    ← formularz tworzenia systemu (z blokami base)
│   │   ├── Utwórz Epizod.md    ← formularz tworzenia epizodu
│   │   ├── Utwórz Scenariusz.md ← formularz tworzenia scenariusza
│   │   ├── systems-data.json    ← dane systemów i kampanii (single source for templates)
│   │   └── statblocks/         ← statbloki per system (l5k, wfrp, cold-city, ...)
├── scripts/
│   ├── schema.mjs                 ← kanoniczny schemat frontmatter (single source of truth)
│   ├── shared.mjs                 ← wspólne utility (parseFrontmatter, slugify, findMdFiles)
│   ├── vault-tools.mjs            ← CLI do masowych operacji na vault (normalize, validate, set-field...)
│   ├── validate-frontmatter.mjs   ← walidator frontmatter (CI gate)
│   ├── strip-h1.mjs              ← usuwanie duplikatów H1 (Quartz renderuje title z frontmatter)
│   ├── build-bases.mjs            ← konwersja Obsidian Bases → statyczne tabele/listy/karty
│   ├── restore-bases.mjs          ← odtwarzanie bloków base w folder notes (odwrotność build-bases)
│   ├── sync-systems.mjs           ← synchronizacja systems-data.json z vault
│   ├── fix-infolder-paths.mjs     ← naprawa ścieżek file.inFolder w blokach base
│   ├── migrate-scenarios.mjs      ← jednorazowa migracja: Scenariusze/→Systemy/[Sys]/Scenariusze/
│   ├── local-build.sh             ← lokalny build pipeline (symulacja CI)
│   └── pre-commit                 ← git hook: normalize + validate przed commitem
├── quartz/                 ← Quartz 4.5.2 (statyczny generator stron)
│   └── quartz.config.ts    ← konfiguracja (baseUrl, locale pl-PL)
├── .github/
│   └── workflows/
│       └── deploy.yml      ← GitHub Actions: buduje i deployuje na Pages
├── .gitignore
└── CLAUDE.md               ← ten plik

# Uwaga: .obsidian/ znajduje się wewnątrz vault/ (vault jest rootem Obsidian)
# vault/.obsidian/snippets/obsidian-only.css — CSS snippet: pokazuje przyciski lokalnie
```

## Folder Notes

Każdy folder w vault ma folder note — plik .md o tej samej nazwie co folder.
Plugin Folder Notes w Obsidian otwiera tę notatkę po kliknięciu folderu.

Nazwy folderów i plików używają Title Case ze spacjami (np. `Cold City/Cold City.md`).
Quartz automatycznie slugifikuje je do lowercase z myślnikami (np. `cold-city/cold-city`).

Hierarchia: `Systemy/ → System/ → Kampania/ → Epizod XX.md`
           `Systemy/ → System/ → Scenariusze/ → Scenariusz.md`

### Widoczność folder notes

Folder notes kampanii i systemów mają `draft: "false"` — Quartz je renderuje, bo zawierają
bloki `base` konwertowane na statyczne tabele podczas buildu.

Folder notes podfolderów encyklopedii i podfoldera `Scenariusze/` w systemach mają `draft: "true"` — Quartz ich
nie renderuje.

### Dwa rodzaje ścieżek — ważne rozróżnienie

1. **Ścieżki systemowe (folder paths)** — używane w `file.inFolder()`, szablonach Templater,
   skryptach Node.js. Muszą odpowiadać **nazwie folderu na dysku** (Title Case):
   `Systemy/Cold City/Cold Tales`, `Encyklopedia/Bohaterowie Graczy`, `Systemy/Deadlands/Scenariusze`

2. **Ścieżki URL (slugi Quartz)** — używane w linkach `[tekst](/ścieżka)`, `kampania_link`,
   wewnątrz frontmatter. Quartz automatycznie slugifikuje do **lowercase z myślnikami**:
   `/systemy/cold-city/cold-tales`, `/encyklopedia/bohaterowie-graczy/bayushi-tokuno`

**Zasada:** `vault/` jest rootem Obsidian — ścieżki w `file.inFolder()` pomijają `vault/` prefix.
Np. `file.inFolder("Systemy/Cold City/Cold Tales")` — NIE `file.inFolder("vault/Systemy/...")`.

### Obsidian Bases (dynamiczne widoki)

Folder notes używają bloków **Obsidian Bases** (od Obsidian v1.8.0) do wyświetlania
dynamicznych tabel, list i kart. Format:

````markdown
## Spis epizodów

```base
filters:
  and:
    - type == "epizod"
views:
  - type: table
    name: Epizody
    filters:
      and:
        - file.inFolder("Systemy/Cold City/Cold Tales")
    order:
      - file.name
      - data
    sort:
      - property: data
        direction: ASC
```
````

**Uwaga o `file.name` vs `title`:**
- `file.name` w `order[]` → renderuje jako **klikalny link** do notatki (w Obsidian i po konwersji build-bases)
- `title` w `order[]` → renderuje jako **zwykły tekst** (nieklikalny)
- Preferuj `file.name` w tabelach i listach dla lepszej nawigacji

**Jak to działa:**
- **Obsidian**: renderuje bloki `base` jako interaktywne widoki (tabele, karty, listy)
- **Quartz (web)**: skrypt `build-bases.mjs` konwertuje bloki na statyczny markdown/HTML

**Typy widoków:**
- `table` — tabela markdown z kolumnami z `order[]`
- `list` — lista punktowana z metadanymi (`- [Tytuł](/url) — Meta: val`)
- `cards` — HTML grid (`<div class="base-cards">`) ze stylami w `custom.scss`

**Obsługiwane filtry:**
- `field == "value"` / `field == ["val1", "val2"]` — równość (scalar/array)
- `field != "value"` — nierówność
- `field > "value"` / `field >= "value"` / `field < "value"` / `field <= "value"` — porównania (daty YYYY-MM-DD lub stringi)
- `file.inFolder("path")` — pliki w podanym folderze (ścieżka Title Case, bez `vault/` prefix)
- `file.name == "plik.md"` — nazwa pliku z rozszerzeniem
- `file.basename == "plik"` — nazwa pliku bez rozszerzenia
- `file.folder == "Systemy/Cold City"` — folder nadrzędny pliku

**Obsługiwane kolumny w `order[]`:**
- `file.name` — klikalny link do notatki (preferowane)
- `file.folder` — folder nadrzędny pliku (nagłówek: "Folder")
- `title`, `data`, `system`, `kampania`, `gracz`, `archetyp`, `gatunek`, `wydawca`, `zrodlo` — pola frontmatter

**Dwa sposoby osadzania:**
1. Inline code block: ` ```base ... ``` ` — YAML w treści notatki
2. Wikilink embed: `![[NazwaBazy.base]]` — plik `.base` z YAML

Skrypt `build-bases.mjs` obsługuje oba wzorce.

## Skrypty vault

Wszystkie skrypty w `scripts/` działają bez zależności npm (czysty Node.js ESM).

### Schema (`scripts/schema.mjs`)

Single source of truth dla schematów frontmatter. Eksportuje:
- `SYSTEM_NAMES` — mapa `system_id → system_pelna`
- `TYPE_SCHEMAS` — per-type definicje: `required[]`, `arrayFields[]`, `computed[]`, `defaults{}`

### vault-tools.mjs — CLI do masowych operacji

```bash
node scripts/vault-tools.mjs <komenda> [argumenty] [opcje]
```

Komendy:
- `normalize` — napraw frontmatter do kanonicznego formatu (migracje, computed values, defaults)
- `validate` — raport brakujących pól
- `list` — listuj pliki i ich frontmatter
- `rename-field <stare> <nowe>` — zmień nazwę pola YAML
- `set-field <pole> <wartość>` — ustaw pole na wartość
- `delete-field <pole>` — usuń pole z frontmatter
- `migrate-to-array <pole>` — konwertuj skalarne pole na tablicę

Opcje: `--where "pole=wartość"`, `--type <typ>`, `--dir <ścieżka>`, `--dry-run` (domyślne), `--apply`

### build-bases.mjs — konwersja Obsidian Bases

```bash
node scripts/build-bases.mjs [dir]   # domyślnie: vault
```

Skanuje `.md` w podanym katalogu i zastępuje bloki `base` (inline i `![[*.base]]`)
statycznymi tabelami/listami/kartami. Używany w CI (na `quartz/content/`)
i opcjonalnie lokalnie.

### restore-bases.mjs — odtwarzanie bloków base

```bash
node scripts/restore-bases.mjs [dir] [--apply]
```

Odwrotność `build-bases.mjs` — odtwarza bloki `base` w folder notes, które zostały
skonwertowane na statyczne tabele (np. po przypadkowym uruchomieniu build-bases na vault).
Rozpoznaje typy folder notes: system, kampania, scenariusz, encyklopedia.
Domyślnie dry-run.

### sync-systems.mjs — synchronizacja danych systemów

```bash
node scripts/sync-systems.mjs [--apply]
```

Skanuje vault i generuje `vault/templates/systems-data.json` — single source of truth
dla danych systemów i kampanii używanych przez szablony Templater.

### fix-infolder-paths.mjs — naprawa ścieżek file.inFolder

```bash
node scripts/fix-infolder-paths.mjs [--apply]
```

Skanuje vault i naprawia ścieżki `file.inFolder()` w blokach base (np. usuwanie
prefixu `vault/`). Domyślnie dry-run.

### strip-h1.mjs — usuwanie duplikatów H1

```bash
node scripts/strip-h1.mjs [dir]           # dry-run (domyślnie vault)
node scripts/strip-h1.mjs [dir] --apply   # zapisz zmiany
```

Quartz renderuje tytuł z frontmatter (`ArticleTitle`), więc H1 w treści powoduje duplikat.
Skrypt usuwa pierwszy H1 z notatek i — jeśli różni się od `title` — aktualizuje frontmatter.
Używany w CI (po normalize, przed build-bases) i w local-build.

### Workflow normalizacji

```bash
# 1. Podgląd co trzeba naprawić
node scripts/vault-tools.mjs normalize --dir vault

# 2. Zastosuj poprawki
node scripts/vault-tools.mjs normalize --dir vault --apply

# 3. Walidacja
node scripts/vault-tools.mjs validate --dir vault
```

Komenda `normalize` wykonuje 4 przejścia:
1. **Migracja scalar → array** — pola z `arrayFields` (np. `kampania`, `kampania_link` dla bohaterów)
2. **Computed values** — `system_pelna` z `SYSTEM_NAMES`, `tags` z `[type, system]`, `kampania_link`/`kampania` z path (epizody)
3. **Defaults** — `draft: "false"` dla kampanii/systemów, `mg` dla epizodów
4. **Ostrzeżenia** — brakujące required bez default

### Git pre-commit hook

Hook automatycznie uruchamia `normalize --apply` i `validate` przed każdym commitem
dotyczącym `vault/` lub `scripts/`. Blokuje commit jeśli walidacja nie przejdzie.

Instalacja (jednorazowo po klonie):
```bash
cp scripts/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
```

### Lokalny build

```bash
bash scripts/local-build.sh          # build + serve na localhost:8080
bash scripts/local-build.sh --build  # tylko build, bez serve
```

Symuluje pipeline CI: copy vault → normalize → strip-h1 → build-bases → quartz build.

## Widoki sekcji (Quartz)

Strony folderów mają własne widoki z metadanymi frontmatter.
Implementacja w `quartz/quartz/components/pages/FolderContent.tsx` +
`quartz/quartz/components/PageList.tsx`.

Metadane wyświetlane per sekcja (badge'y pod tytułem):
- `Encyklopedia/*` (slug: `encyklopedia/*`) → `type`, `system_pelna`, `kampania`, `gracz`
- `Systemy/*` (slug: `systemy/*`) → `gatunek`, `wydawca`
- `Systemy/*/Scenariusze/*` (slug: `systemy/[system]/scenariusze/*`) → `system`, `data`

Quartz FolderContent porównuje **slugi** (zawsze lowercase) — nie zmieniać na Title Case w kodzie Quartz.

## GitHub Pages

- URL: https://grobarch.github.io/2k4-Obsidian
- Repo: https://github.com/Grobarch/2k4-Obsidian
- Deploy: automatyczny (push na main, ścieżki: `vault/**`, `scripts/**`, `quartz/**`, `.github/workflows/**`) lub ręczny (workflow_dispatch)

## Workflow deploy (GitHub Actions)

1. Checkout repo
2. `npm ci` w `quartz/`
3. Kopiuje `vault/*` → `quartz/content/`
4. `node scripts/vault-tools.mjs normalize --dir quartz/content --apply` ← normalizuje frontmatter
5. `node scripts/strip-h1.mjs quartz/content --apply` ← usuwa duplikaty H1
6. `node scripts/build-bases.mjs quartz/content` ← **konwertuje bloki base → statyczne tabele**
7. `node scripts/validate-frontmatter.mjs quartz/content` ← walidacja (CI gate)
8. `node ./quartz/bootstrap-cli.mjs build` → `quartz/public/`
9. Deploy `quartz/public/` na GitHub Pages

`quartz/content/` jest pusta w repo — wypełniana tylko w CI.

## Format plików vault

Każdy plik ma YAML frontmatter. Kluczowe pola:

```yaml
title: Tytuł strony
type: bohater-gracza | bohater-niezalezny | lokacja | artefakt | epizod | kampania | system | scenariusz | artykul
system: l5k | deadlands | wfrp | cold-city | wiedzmin | 7th-sea | ...
tags: [tag1, tag2]
```

Epizody mają dodatkowe pola:
```yaml
kampania_link: /systemy/cold-city/cold-tales
kampania: cold-tales
data: 2010-10-29
```

Scenariusze mają dodatkowe pola:
```yaml
type: scenariusz
zrodlo: "https://arkadiusz-rygiel.blogspot.com/..."
data: 2011-02-27
```

## Linki wewnętrzne

Format absolutny: `[tekst](/ścieżka/do/strony)`

Ścieżki używają lowercase z myślnikami (slugi Quartz), nie Title Case:
- `[Bayushi Tokuno](/encyklopedia/bohaterowie-graczy/bayushi-tokuno)`
- `[Deadlands](/systemy/deadlands/deadlands)` ← folder note systemu
- `[Cold Tales](/systemy/cold-city/cold-tales/cold-tales)` ← folder note kampanii
- `[Epizod 1](/systemy/cold-city/cold-tales/epizod-01)` ← epizod
- `/tags/l5k` — strona tagu

Quartz skonfigurowany z `markdownLinkResolution: "absolute"` — nie zmieniać.

## Proces aktualizacji wiki

1. Edytuj pliki w `vault/` (Obsidian renderuje bloki `base` interaktywnie)
2. `git add` + `git commit` + `git push`
3. Uruchom workflow ręcznie w GitHub Actions
4. Opcjonalnie: `bash scripts/local-build.sh` (podgląd lokalny przed push)

## Dodawanie nowego epizodu

1. Utwórz plik `Epizod XX.md` w folderze kampanii (lub użyj przycisku `+ Nowy epizod` w Obsidian)
2. Dodaj frontmatter z `type: epizod`, `data:`, `kampania_link:`, `title:`
3. Blok `base` w folder note kampanii automatycznie pokaże nowy epizod (Obsidian: natychmiast, web: po deploy)

## Dodawanie nowego scenariusza

1. Utwórz plik scenariusza w `vault/Systemy/[System]/Scenariusze/[Tytuł].md`
   - Jeśli podfolder `Scenariusze/` nie istnieje — utwórz go wraz z `Scenariusze.md` (folder note)
2. Dodaj frontmatter:
   ```yaml
   ---
   title: "Tytuł scenariusza"
   type: scenariusz
   system: slug-systemu
   zrodlo: "https://arkadiusz-rygiel.blogspot.com/..."
   data: YYYY-MM-DD
   tags: [scenariusz, slug-systemu]
   ---
   ```
3. Blok `base` w folder note systemu (`Scenariusze samodzielne`) automatycznie pokaże nowy scenariusz (filtr `system == "slug"`)
4. Blok `base` w `Scenariusze.md` podfoldera (filtr `file.inFolder("Systemy/[System]/Scenariusze")`) też go pokaże

## Templater — formularze tworzenia treści (Obsidian)

Formularze uruchamiane przyciskami w folder notes.
Wymaga pluginów: **Templater** + **Meta Bind**.

### Dostępne szablony

| Szablon | Uruchamiany z | Tworzy |
|---------|---------------|--------|
| `Utwórz System.md` | strona Systemy | folder note systemu z blokami `base` |
| `Utwórz Kampanię.md` | folder note systemu | folder note kampanii z blokami `base` |
| `Utwórz Epizod.md` | folder note kampanii | notatkę epizodu w folderze kampanii |
| `Utwórz Scenariusz.md` | folder note systemu | notatkę scenariusza w `Systemy/[System]/Scenariusze/` |
| `Utwórz Postać.md` | kampania / encyklopedia | notatkę postaci w encyklopedii |
| `Utwórz Artefakt.md` | kampania / encyklopedia | notatkę artefaktu w `Encyklopedia/Artefakty/` |
| `Utwórz Lokację.md` | kampania / encyklopedia | notatkę lokacji w `Encyklopedia/Lokacje/` |

### Tworzenie postaci

### Konfiguracja (jednorazowo)

1. Zainstaluj pluginy **Templater** i **Meta Bind** w Obsidian
2. W Templater: ustaw "Template folder location" → `templates`
3. W Obsidian Settings → Appearance → CSS snippets: włącz `obsidian-only`

### Działanie

Przycisk `+ Nowa postać` / `+ Nowy BG` / `+ Nowy BN` w folder note kampanii, `vault/Encyklopedia/Encyklopedia.md`, lub folder note podsekcji encyklopedii (`Bohaterowie Graczy.md`, `Bohaterowie Niezalezni.md`)
uruchamia `templates/Utwórz Postać.md`. Formularz pyta kolejno o:
- Imię (wymagane)
- Typ: Bohater Gracza / Bohater Niezależny (wymagane)
- System (wymagane)
- Kampania (opcjonalna — lista filtrowana po systemie)
- Gracz (opcjonalne, tylko BG)
- Archetyp (opcjonalne)

Notatka tworzona w `Encyklopedia/Bohaterowie Graczy/` lub `Encyklopedia/Bohaterowie Niezalezni/`.

### Format notatki postaci

```markdown
---
title: "Imię Postaci"
type: bohater-gracza          # lub bohater-niezalezny
system: l5k
system_pelna: "Legenda Pięciu Kręgów 1ed"
kampania_link: /systemy/l5k/miecze-cnot-i-grzechow
kampania: miecze-cnot-i-grzechow
gracz: Jan Kowalski           # tylko BG
archetyp: bushi z Klanu Lwa
tags: [bohater-gracza, l5k]
---

# Imię Postaci

![Portret Imię Postaci](placeholder.jpg)

## Statystyki

<!-- SYSTEM: l5k -->
← zawartość z templates/statblocks/l5k.md

## Opis

*Opis do uzupełnienia.*

## Wystąpienia

## Kampanie

- [Miecze cnót i grzechów](/systemy/l5k/miecze-cnot-i-grzechow/miecze-cnot-i-grzechow)
```

### Statbloki systemów

Pliki w `vault/templates/statblocks/` — jeden na system. Dodawanie nowego statbloku:
1. Utwórz `vault/templates/statblocks/{system-id}.md`
2. Wpisz czysty markdown (bez frontmatter) — tabela atrybutów, pola tekstowe
3. Skrypt Templater wczyta plik przez `app.vault.read()` i wklei go do notatki

Dostępne: `7th-sea`, `cold-city`, `deadlands`, `gasnace-slonca`, `generic` (fallback),
`honor-i-krew`, `l5k`, `mafia-ggf`, `wampir`, `wfrp`, `wfrp2`, `wfrp4`,
`wideo-rpg`, `wiedzmin`, `wolsung`.

### Ukrywanie przycisków w widoku web

Przyciski są owinięte w `<div class="obsidian-only">`.
- **Obsidian**: CSS snippet `obsidian-only.css` → `display: block`
- **Quartz**: `quartz/quartz/styles/custom.scss` → `display: none`

## Ignorowane w .gitignore

- `quartz/node_modules/`
- `quartz/.quartz-cache/`
- `quartz/public/`
- `quartz/content/`
- `vault/.obsidian/workspace.json`
- `vault/.obsidian/workspace-mobile.json`
- `vault/.obsidian/plugins/*/main.js`
- `vault/.obsidian/plugins/*/styles.css`
- `vault/*.base`
- `.claude/`
- `.vscode/`
