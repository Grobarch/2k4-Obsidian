# Templater — formularze tworzenia treści (Obsidian)

Formularze uruchamiane przyciskami w folder notes.
Wymaga pluginów: **Templater** + **Meta Bind**.

## Konfiguracja (jednorazowo)

1. Zainstaluj pluginy **Templater** i **Meta Bind** w Obsidian
2. W Templater: ustaw "Template folder location" → `templates`
3. W Obsidian Settings → Appearance → CSS snippets: włącz `obsidian-only`

## Dostępne szablony

| Szablon | Uruchamiany z | Tworzy |
|---------|---------------|--------|
| `Utwórz System.md` | strona Systemy | folder note systemu z blokami `base` |
| `Utwórz Kampanię.md` | folder note systemu | folder note kampanii z blokami `base` |
| `Utwórz Epizod.md` | folder note kampanii | notatkę epizodu w folderze kampanii |
| `Utwórz Scenariusz.md` | folder note systemu | notatkę scenariusza w `Systemy/[System]/Scenariusze/` |
| `Utwórz Postać.md` | kampania / encyklopedia | notatkę postaci w encyklopedii |
| `Utwórz Artefakt.md` | kampania / encyklopedia | notatkę artefaktu w `Encyklopedia/Artefakty/` |
| `Utwórz Lokację.md` | kampania / encyklopedia | notatkę lokacji w `Encyklopedia/Lokacje/` |

## Tworzenie postaci

Przycisk `+ Nowa postać` / `+ Nowy BG` / `+ Nowy BN` w folder note kampanii,
`vault/Encyklopedia/Encyklopedia.md`, lub folder note podsekcji encyklopedii
uruchamia `templates/Utwórz Postać.md`. Formularz pyta kolejno o:
- Imię (wymagane)
- Typ: Bohater Gracza / Bohater Niezależny (wymagane)
- System (wymagane)
- Kampania (opcjonalna — lista filtrowana po systemie)
- Gracz (opcjonalne, tylko BG)
- Archetyp (opcjonalne)

Notatka tworzona w `Encyklopedia/Bohaterowie Graczy/` lub `Encyklopedia/Bohaterowie Niezalezni/`.

→ przykład wyniku: `vault/Encyklopedia/Bohaterowie Graczy/Bayushi Tokuno.md`

## Statbloki systemów

Pliki w `vault/templates/statblocks/` — jeden na system. Dodawanie nowego statbloku:
1. Utwórz `vault/templates/statblocks/{system-id}.md`
2. Wpisz czysty markdown (bez frontmatter) — tabela atrybutów, pola tekstowe
3. Skrypt Templater wczyta plik przez `app.vault.read()` i wklei go do notatki

Dostępne: `7th-sea`, `cold-city`, `deadlands`, `gasnace-slonca`, `generic` (fallback),
`honor-i-krew`, `l5k`, `mafia-ggf`, `wampir`, `wfrp`, `wfrp2`, `wfrp4`,
`wideo-rpg`, `wiedzmin`, `wolsung`.

## Ukrywanie przycisków w widoku web

Przyciski są owinięte w `<div class="obsidian-only">`.
- **Obsidian**: CSS snippet `obsidian-only.css` → `display: block`
- **Quartz**: `quartz/quartz/styles/custom.scss` → `display: none`
