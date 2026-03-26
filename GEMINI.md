# GEMINI.md — Wiki RPG

## Projekt

Publiczna wiki TTRPG. Stack: **Obsidian** (edycja) + **Quartz** (generator) + **GitHub Pages** (hosting).
URL: https://grobarch.github.io/2k4-Obsidian

## Struktura

```
vault/                       ← Obsidian vault (tu edytujemy)
├── Encyklopedia/            ← postaci, lokacje, artefakty
│   ├── bohaterowie-graczy/
│   ├── bohaterowie-niezalezni/
│   ├── lokacje/
│   └── artefakty/
├── Scenariusze/             ← scenariusze per system
├── Systemy/                 ← systemy → kampanie → epizody
└── Templates/               ← szablony Obsidian (nie edytować bez potrzeby)
scripts/                     ← skrypty budowania
quartz/                      ← generator stron (nie edytować bez potrzeby)
```

## Frontmatter postaci

```yaml
title: "Imię Postaci"
type: bohater-gracza | bohater-niezalezny
system: l5k | deadlands | wfrp | cold-city | wiedzmin | 7th-sea | ...
system_pelna: "Legenda Pięciu Kręgów 1ed"
kampania_link: ["/systemy/l5k/miecze-cnot-i-grzechow"]
kampania: ["miecze-cnot-i-grzechow"]
gracz: "Jan Kowalski"        # tylko bohater-gracza
archetyp: "bushi z Klanu Lwa"
tags: [bohater-gracza, l5k]
```

## Frontmatter epizodu

```yaml
type: epizod
kampania_link: /systemy/cold-city/cold-tales
kampania: cold-tales
data: 2010-10-29
```

## Linki wewnętrzne

Format: `[tekst](/ścieżka/lowercase-z-myślnikami)` (absolutne slugi Quartz).

## Kluczowe zasady

- Folder notes = plik `.md` o nazwie folderu, mają `draft: true`
- Nazwy plików/folderów: Title Case ze spacjami
- Tabelki epizodów generowane przez `scripts/update-episode-tables.mjs`
- Statbloki w `vault/Templates/statblocks/{system-id}.md`
- Szczegóły → patrz `CLAUDE.md`
