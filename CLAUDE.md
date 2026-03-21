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
│   │   ├── bohaterowie-graczy/
│   │   ├── bohaterowie-niezalezni/
│   │   ├── lokacje/
│   │   └── artefakty/
│   └── systemy/            ← systemy RPG + kampanie + epizody
│       └── Cold City/          ← folder systemu
│           ├── Cold City.md    ← folder note systemu
│           └── Cold Tales/         ← folder kampanii
│               ├── Cold Tales.md   ← folder note kampanii (z tabelką epizodów)
│               ├── Epizod 01.md
│               └── ...
├── scripts/
│   └── update-episode-tables.mjs  ← skrypt pre-build: aktualizuje tabelki epizodów
├── quartz/                 ← Quartz 4.5.2 (statyczny generator stron)
│   └── quartz.config.ts    ← konfiguracja (baseUrl, locale pl-PL)
├── .github/
│   └── workflows/
│       └── deploy.yml      ← GitHub Actions: buduje i deployuje na Pages
├── .gitignore
├── CLAUDE.md               ← ten plik
└── HANDOFF.md              ← pełna dokumentacja projektu
```

## Folder Notes

Każdy folder w vault ma folder note — plik .md o tej samej nazwie co folder.
Plugin Folder Notes w Obsidian otwiera tę notatkę po kliknięciu folderu.

Nazwy folderów i plików używają Title Case ze spacjami (np. `Cold City/Cold City.md`).
Quartz automatycznie slugifikuje je do lowercase z myślnikami (np. `cold-city/cold-city`).

Hierarchia: `systemy/ → System/ → Kampania/ → Epizod XX.md`

### Tabelki epizodów

Folder notes kampanii zawierają automatycznie generowane tabelki epizodów
otoczone markerami HTML:

```markdown
## Spis epizodow

<!-- EPISODES_START -->
| # | Tytuł | Data |
|---|-------|------|
| 1 | [Epizod 1: "..."](/systemy/cold-city/cold-tales/epizod-01) | 2010-10-29 |
<!-- EPISODES_END -->
```

Skrypt `scripts/update-episode-tables.mjs` skanuje pliki z `type: epizod`
w frontmatter i regeneruje tabelki między markerami.

Uruchamianie lokalne: `node scripts/update-episode-tables.mjs vault/systemy`

## GitHub Pages

- URL: https://grobarch.github.io/2k4-Obsidian
- Repo: https://github.com/Grobarch/2k4-Obsidian
- Deploy: ręczny (workflow_dispatch)

## Workflow deploy (GitHub Actions)

1. Checkout repo
2. `npm ci` w `quartz/`
3. Kopiuje `vault/*` → `quartz/content/`
4. `node scripts/update-episode-tables.mjs quartz/content/systemy` ← aktualizuje tabelki epizodów
5. `npx quartz build` → `quartz/public/`
6. Deploy `quartz/public/` na GitHub Pages

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
2. Opcjonalnie: `node scripts/update-episode-tables.mjs vault/systemy` (aktualizacja tabelek lokalnie)
3. `git add` + `git commit` + `git push`
4. Uruchom workflow ręcznie w GitHub Actions

## Dodawanie nowego epizodu

1. Utwórz plik `Epizod XX.md` w folderze kampanii
2. Dodaj frontmatter z `type: epizod`, `data:`, `kampania_link:`, `title:`
3. Skrypt pre-build automatycznie doda go do tabelki w folder note kampanii

## Ignorowane w .gitignore

- `quartz/node_modules/`
- `quartz/.quartz-cache/`
- `quartz/public/`
