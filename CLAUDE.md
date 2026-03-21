# CLAUDE.md — Wiki RPG

## Projekt

Publiczna wiki dokumentująca kampanie TTRPG Arkadiusza Rygla.
Blog źródłowy: arkadiusz-rygiel.blogspot.com

**Stack:** Obsidian (edycja lokalna) + Quartz (generator) + GitHub Pages (hosting)

## Struktura repo

```
2k4-Obsidian/               ← root repo (F:\RPG\RPG_repo\2k4-Obsidian)
├── vault/                  ← Obsidian vault (204 pliki markdown)
│   ├── index.md            ← strona główna wiki
│   ├── encyklopedia/
│   │   ├── bohaterowie-graczy/
│   │   ├── bohaterowie-niezalezni/
│   │   ├── lokacje/
│   │   └── artefakty/
│   ├── kampanie/           ← każda kampania w podfolderze system/kampania/
│   └── systemy/
├── quartz/                 ← Quartz 4.5.2 (statyczny generator stron)
│   └── quartz.config.ts    ← konfiguracja (baseUrl, locale pl-PL)
├── .github/
│   └── workflows/
│       └── deploy.yml      ← GitHub Actions: buduje i deployuje na Pages
├── .gitignore
├── CLAUDE.md               ← ten plik
└── HANDOFF.md              ← pełna dokumentacja projektu
```

## GitHub Pages

- URL: https://grobarch.github.io/2k4-Obsidian
- Repo: https://github.com/Grobarch/2k4-Obsidian
- Deploy: automatyczny przy każdym push do `main` (~1-2 min)

## Workflow deploy (GitHub Actions)

1. Checkout repo
2. `npm ci` w `quartz/`
3. Kopiuje `vault/*` → `quartz/content/`
4. `npx quartz build` → `quartz/public/`
5. Deploy `quartz/public/` na GitHub Pages

`quartz/content/` jest pusta w repo — wypełniana tylko w CI.

## Format plików vault

Każdy plik ma YAML frontmatter. Kluczowe pola:

```yaml
title: Tytuł strony
type: bohater-gracza | bohater-niezalezny | lokacja | artefakt | epizod | kampania | system
system: l5k | deadlands | wfrp | cold-city | wiedzmin | 7th-sea | ...
tags: [tag1, tag2]
```

## Linki wewnętrzne

Format absolutny: `[tekst](/ścieżka/do/strony)`

Przykłady:
- `[Bayushi Tokuno](/encyklopedia/bohaterowie-graczy/bayushi-tokuno)`
- `[Deadlands](/systemy/deadlands)`
- `/tags/l5k` — strona tagu

Quartz skonfigurowany z `markdownLinkResolution: "absolute"` — nie zmieniać.

## Proces aktualizacji wiki

1. Edytuj pliki w `vault/`
2. `git add` + `git commit` + `git push`
3. GitHub Actions automatycznie buduje i deployuje

## Ignorowane w .gitignore

- `quartz/node_modules/`
- `quartz/.quartz-cache/`
- `quartz/public/`
