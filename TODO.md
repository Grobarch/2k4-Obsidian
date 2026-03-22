# TODO — Tworzenie postaci w Obsidian

Funkcja tworzenia postaci przez formularz (Templater + Meta Bind).
Przyciski na poziomie kampanii i encyklopedii. Niewidoczne w widoku web (Quartz).

## Zadania

- [ ] **1. Struktura templates/**
  Utwórz `vault/templates/`, `vault/templates/statblocks/` i placeholder image `vault/assets/placeholder-postac.png`.

- [ ] **2. Skrypt Templater**
  Napisz `vault/templates/Utwórz Postać.md` — formularz (imię, typ BG/BN, system, kampania, opcjonalnie gracz/archetyp)
  + składanie notatki: frontmatter, placeholder image, statblock z pliku systemowego, sekcja Opis, sekcja Kampanie.

- [ ] **3. Statbloki systemów**
  Utwórz `vault/templates/statblocks/`:
  `l5k.md`, `cold-city.md`, `deadlands.md`, `7th-sea.md`, `wfrp.md`,
  `wiedzmin.md`, `wampir.md`, `mafia-ggf.md`, `gasnace-slonca.md`,
  `honor-i-krew.md`, `generic.md` (fallback).

- [ ] **4. CSS Quartz**
  Dodaj `.obsidian-only { display: none; }` do `quartz/quartz/styles/custom.scss`
  — ukrywa przyciski w widoku web.

- [ ] **5. CSS snippet Obsidiana**
  Utwórz `.obsidian/snippets/obsidian-only.css` z `.obsidian-only { display: block !important; }`
  — wymusza widoczność przycisków lokalnie (nie jest commitowane do repo).

- [ ] **6. Przycisk w encyklopedii**
  Dodaj przycisk Meta Bind do `vault/encyklopedia/Encyklopedia.md` (utwórz jeśli brak).

- [ ] **7. Przyciski w kampaniach**
  Dodaj przycisk do folder notes wszystkich 14 kampanii.

- [ ] **8. Aktualizacja CLAUDE.md**
  Dodaj do dokumentacji: strukturę `vault/templates/`, format notatki postaci,
  opis mechanizmu statbloków i ukrywania przycisków w Quartz.

## Wymagania

- Plugin **Templater** (community plugin)
- Plugin **Meta Bind** (community plugin)
- Włączony CSS snippet `obsidian-only` w Obsidian Settings → Appearance

## Format notatki postaci (docelowy)

```markdown
---
title: "Imię Postaci"
type: bohater-gracza          # lub bohater-niezalezny
system: l5k
system_pelna: L5K 1ed
kampania: miecze-cnot-i-grzechow
kampania_link: /systemy/l5k/miecze-cnot-i-grzechow
gracz:
archetyp:
tags: [bohater-gracza, l5k]
---

# Imię Postaci

![[assets/placeholder-postac.png]]

## Statblock

← zawartość z templates/statblocks/l5k.md

## Opis

## Kampanie

- [Miecze cnót i grzechów](/systemy/l5k/miecze-cnot-i-grzechow/miecze-cnot-i-grzechow)
```
