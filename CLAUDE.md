# CLAUDE.md — Wiki RPG

## Projekt

Publiczna wiki dokumentująca kampanie TTRPG Arkadiusza Rygla.
Blog źródłowy: arkadiusz-rygiel.blogspot.com

**Stack:** Obsidian (edycja lokalna) + Quartz (generator) + GitHub Pages (hosting)

## Struktura repo

```
2k4-Obsidian/               ← root repo (F:\RPG\RPG_repo\2k4-Obsidian)
├── vault/                  ← Obsidian vault
│   ├── index.md            ← strona główna wiki
│   ├── encyklopedia/
│   │   ├── Encyklopedia.md     ← folder note (z przyciskiem tworzenia postaci)
│   │   ├── bohaterowie-graczy/
│   │   │   └── bohaterowie-graczy.md   ← folder note (draft:true)
│   │   ├── bohaterowie-niezalezni/
│   │   │   └── bohaterowie-niezalezni.md ← folder note (draft:true)
│   │   ├── lokacje/
│   │   │   └── lokacje.md      ← folder note (draft:true)
│   │   └── artefakty/
│   │       └── artefakty.md    ← folder note (draft:true)
│   ├── scenariusze/        ← gotowe scenariusze i przygody per system
│   │   ├── Scenariusze.md      ← folder note (indeks systemów)
│   │   ├── A Penny For My Thoughts/
│   │   ├── Apokalipsa Spelniona/
│   │   ├── Cyberpunk 2020/
│   │   ├── Dead Of Night/
│   │   ├── Deadlands/
│   │   ├── Deathwatch/
│   │   ├── Dwory Konca Swiata/
│   │   ├── Dzikie Pola/
│   │   ├── Hell 4 Leather/
│   │   ├── In Between/
│   │   ├── L5K1ed/
│   │   ├── The Shadow Of Yesterday/
│   │   ├── Wfrp 1ed/
│   │   ├── Wfrp 4ed/
│   │   ├── Wolsung/
│   │   └── Zew Cthulhu/
│   ├── templates/          ← szablony Obsidian (ignorowane przez Quartz)
│   │   ├── Utwórz Postać.md    ← skrypt Templater: formularz tworzenia postaci
│   │   └── statblocks/         ← statbloki per system
│   │       ├── generic.md
│   │       ├── l5k.md
│   │       ├── cold-city.md
│   │       ├── deadlands.md
│   │       ├── wolsung.md
│   │       ├── wiedzmin.md
│   │       ├── wfrp.md
│   │       ├── gasnace-slonca.md
│   │       ├── 7th-sea.md
│   │       ├── wampir.md
│   │       ├── mafia-ggf.md
│   │       └── honor-i-krew.md
│   └── systemy/            ← systemy RPG + kampanie + epizody
│       └── Cold City/          ← folder systemu
│           ├── Cold City.md    ← folder note systemu
│           └── Cold Tales/         ← folder kampanii
│               ├── Cold Tales.md   ← folder note kampanii (z przyciskiem + tabelkami)
│               ├── Epizod 01.md
│               └── ...
├── scripts/
│   ├── schema.mjs                 ← kanoniczny schemat frontmatter (single source of truth)
│   ├── shared.mjs                 ← wspólne utility (parseFrontmatter, slugify, findMdFiles)
│   ├── vault-tools.mjs            ← CLI do masowych operacji na vault (normalize, validate, set-field...)
│   ├── validate-frontmatter.mjs   ← walidator frontmatter (CI gate)
│   ├── update-tables.mjs  ← skrypt pre-build: aktualizuje tabelki epizodów
│   ├── watch-tables.mjs   ← tryb watch: auto-aktualizacja tabelek podczas edycji lokalnej
│   └── pre-commit                 ← git hook: normalize + validate przed commitem
├── quartz/                 ← Quartz 4.5.2 (statyczny generator stron)
│   └── quartz.config.ts    ← konfiguracja (baseUrl, locale pl-PL)
├── .github/
│   └── workflows/
│       └── deploy.yml      ← GitHub Actions: buduje i deployuje na Pages
├── .obsidian/
│   └── snippets/
│       └── obsidian-only.css   ← CSS snippet: pokazuje przyciski lokalnie
├── .gitignore
└── CLAUDE.md               ← ten plik
```

## Folder Notes

Każdy folder w vault ma folder note — plik .md o tej samej nazwie co folder.
Plugin Folder Notes w Obsidian otwiera tę notatkę po kliknięciu folderu.

Nazwy folderów i plików używają Title Case ze spacjami (np. `Cold City/Cold City.md`).
Quartz automatycznie slugifikuje je do lowercase z myślnikami (np. `cold-city/cold-city`).

Hierarchia: `systemy/ → System/ → Kampania/ → Epizod XX.md`

### Ukrywanie folder notes w Quartz

Folder notes (systemów, kampanii, sekcji scenariuszy i podfolderów encyklopedii) mają `draft: true` w frontmatter — Quartz ich nie renderuje. Są widoczne tylko lokalnie w Obsidian (do nawigacji po folderach). Strony indeksujące (np. `Scenariusze.md`) linkują bezpośrednio do zawartości, z pominięciem folder notes.

**Wyjątek:** `Encyklopedia.md` i `Scenariusze.md` NIE mają `draft: true` — są renderowane przez Quartz jako strony treści.

### Tabelki epizodów

Folder notes kampanii zawierają automatycznie generowane tabelki epizodów
otoczone markerami HTML:

```markdown
## Spis epizodow

<!-- EPISODES_START -->
| # | Tytuł | Data |
|---|-------|------|
| 1 | [[Cold Tales/Epizod 01\|Epizod 1: "..."]] | 2010-10-29 |
<!-- EPISODES_END -->
```

Format linku: wikilink `[[CampaignFolder/EpisodeName\|Tytuł]]` — działa w Obsidian
niezależnie od wielkości liter i spacji w nazwie pliku. Folder notes mają
`draft: true`, więc Quartz ich nie renderuje (format linku nie wpływa na web).

### Tabelki kampanii

Folder notes systemów zawierają automatycznie generowane tabelki kampanii:

```markdown
## Kampanie

<!-- CAMPAIGNS_START -->
| Kampania | MG | Epizody |
|----------|-------|---------|
| [[L5K/Miecze Cnot I Grzechow/Miecze Cnot I Grzechow\|Tytuł kampanii]] | MG | 11 |
<!-- CAMPAIGNS_END -->
```

Format linku: wikilink `[[SystemFolder/CampaignFolder/CampaignName\|Tytuł]]`.

Skrypt `scripts/update-tables.mjs` skanuje pliki z `type: epizod` i `type: kampania`
w frontmatter i regeneruje tabelki między markerami.

Uruchamianie lokalne: `node scripts/update-tables.mjs vault/systemy`

Tryb watch (auto-aktualizacja podczas edycji w Obsidian):
`node scripts/watch-tables.mjs` — obserwuje `vault/` i regeneruje tabelki przy każdej zmianie .md.

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

### Workflow normalizacji

```bash
# 1. Podgląd co trzeba naprawić
node scripts/vault-tools.mjs normalize --dir vault

# 2. Zastosuj poprawki
node scripts/vault-tools.mjs normalize --dir vault --apply

# 3. Walidacja
node scripts/vault-tools.mjs validate --dir vault

# 4. Aktualizuj tabelki (kampanie, systemy, scenariusze, postacie, lokacje, artefakty)
node scripts/update-tables.mjs vault/systemy
node scripts/update-tables.mjs vault/scenariusze
```

Komenda `normalize` wykonuje 4 przejścia:
1. **Migracja scalar → array** — pola z `arrayFields` (np. `kampania`, `kampania_link` dla bohaterów)
2. **Computed values** — `system_pelna` z `SYSTEM_NAMES`, `tags` z `[type, system]`, `kampania_link`/`kampania` z path (epizody)
3. **Defaults** — `draft: true` dla kampanii/systemów, `mg` dla epizodów
4. **Ostrzeżenia** — brakujące required bez default

### Git pre-commit hook

Hook automatycznie uruchamia `normalize --apply`, `update-episode-tables` (systemy + scenariusze) i `validate` przed każdym commitem dotyczącym `vault/` lub `scripts/`. Blokuje commit jeśli walidacja nie przejdzie.

Instalacja (jednorazowo po klonie):
```bash
cp scripts/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
```

## Widoki sekcji (Quartz)

Strony folderów mają własne widoki z metadanymi frontmatter (RPG-65).
Implementacja w `quartz/quartz/components/pages/FolderContent.tsx` +
`quartz/quartz/components/PageList.tsx`.

Metadane wyświetlane per sekcja (badge'y pod tytułem):
- `encyklopedia/*` → `type`, `system_pelna`, `kampania`, `gracz`
- `systemy/*` → `gatunek`, `wydawca`
- `scenariusze/*` → `system`, `data`

## GitHub Pages

- URL: https://grobarch.github.io/2k4-Obsidian
- Repo: https://github.com/Grobarch/2k4-Obsidian
- Deploy: ręczny (workflow_dispatch)

## Workflow deploy (GitHub Actions)

1. Checkout repo
2. `npm ci` w `quartz/`
3. Kopiuje `vault/*` → `quartz/content/`
4. `node scripts/vault-tools.mjs normalize --dir quartz/content --apply` ← normalizuje frontmatter
5. `node scripts/update-tables.mjs quartz/content/systemy` ← aktualizuje tabelki epizodów
6. `node scripts/validate-frontmatter.mjs quartz/content` ← walidacja (CI gate)
7. `npx quartz build` → `quartz/public/`
8. Deploy `quartz/public/` na GitHub Pages

`quartz/content/` jest pusta w repo — wypełniana tylko w CI.

## Format plików vault

Każdy plik ma YAML frontmatter. Kluczowe pola:

```yaml
title: Tytuł strony
type: bohater-gracza | bohater-niezalezny | lokacja | artefakt | epizod | kampania | system
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

1. Edytuj pliki w `vault/`
2. Opcjonalnie: `node scripts/update-tables.mjs vault/systemy` (aktualizacja tabelek lokalnie)
3. `git add` + `git commit` + `git push`
4. Uruchom workflow ręcznie w GitHub Actions

## Dodawanie nowego epizodu

1. Utwórz plik `Epizod XX.md` w folderze kampanii
2. Dodaj frontmatter z `type: epizod`, `data:`, `kampania_link:`, `title:`
3. Skrypt pre-build automatycznie doda go do tabelki w folder note kampanii

## Dodawanie nowego scenariusza

1. Utwórz folder systemu w `vault/scenariusze/System Name/` (jeśli nie istnieje)
2. Utwórz folder note systemu `System Name.md` z listą linków do scenariuszy
3. Utwórz plik scenariusza z frontmatterem:
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
4. Dodaj system do `vault/scenariusze/Scenariusze.md`
5. Źródłowe pliki w `notes-source/scenariusze/` zawierają H1 tytuł i blok metadanych — przy konwersji przenosimy je do frontmatter, a treść zaczyna się po separatorze `---`

## Tworzenie postaci (Obsidian)

Formularz uruchamiany przyciskiem w folder note kampanii lub encyklopedii.
Wymaga pluginów: **Templater** + **Meta Bind**.

### Konfiguracja (jednorazowo)

1. Zainstaluj pluginy **Templater** i **Meta Bind** w Obsidian
2. W Templater: ustaw "Template folder location" → `templates`
3. W Obsidian Settings → Appearance → CSS snippets: włącz `obsidian-only`

### Działanie

Przycisk `+ Nowa postać` / `+ Nowy BG` / `+ Nowy BN` w folder note kampanii, `vault/encyklopedia/Encyklopedia.md`, lub folder note podsekcji encyklopedii (`bohaterowie-graczy.md`, `bohaterowie-niezalezni.md`)
uruchamia `templates/Utwórz Postać.md`. Formularz pyta kolejno o:
- Imię (wymagane)
- Typ: Bohater Gracza / Bohater Niezależny (wymagane)
- System (wymagane)
- Kampania (opcjonalna — lista filtrowana po systemie)
- Gracz (opcjonalne, tylko BG)
- Archetyp (opcjonalne)

Notatka tworzona w `encyklopedia/bohaterowie-graczy/` lub `.../bohaterowie-niezalezni/`.

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

Dostępne: `l5k`, `cold-city`, `deadlands`, `wolsung`, `wiedzmin`, `wfrp`,
`gasnace-slonca`, `7th-sea`, `wampir`, `mafia-ggf`, `honor-i-krew`, `generic` (fallback).

### Ukrywanie przycisków w widoku web

Przyciski są owinięte w `<div class="obsidian-only">`.
- **Obsidian**: CSS snippet `obsidian-only.css` → `display: block`
- **Quartz**: `quartz/quartz/styles/custom.scss` → `display: none`

## Ignorowane w .gitignore

- `quartz/node_modules/`
- `quartz/.quartz-cache/`
- `quartz/public/`
