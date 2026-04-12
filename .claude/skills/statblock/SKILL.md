---
name: statblock
description: Tworzenie nowego statbloku systemu RPG, aktualizacja istniejacego szablonu w vault/templates/statblocks/, oraz masowa migracja wklejonych blokow statystyk w notatkach BG/BN w vault/Encyklopedia/. Uzywaj gdy uzytkownik prosi o "nowy statblok", "zmien statblok systemu X", "zaktualizuj postacie po zmianie statbloku", "dodaj pole do statbloku".
---

# Statblock — tworzenie i aktualizacja

Skill do zarzadzania szablonami statblokow RPG. Rozwiazuje trzy problemy:
1. **Tworzenie** szablonu dla nowego systemu (spojny format, rejestracja w schemacie).
2. **Aktualizacja** istniejacego szablonu.
3. **Masowa migracja** statblokow wklejonych do notatek BG/BN po zmianie szablonu —
   tylko puste (niewypelnione) sa zastepowane automatycznie, wypelnione zglaszane do recznego przegladu.

## Architektura

- **Szablony:** `vault/templates/statblocks/{system-id}.md` — czysty markdown, bez frontmatter, bez H1.
- **Uzycie:** Templater `vault/templates/Utwórz Postać.md:148-154` wczytuje szablon i wkleja go pod markerem
  `<!-- SYSTEM: {system-id} -->` w notatce postaci. Statblok zajmuje wszystko od markera do nastepnego `##`.
- **Rejestracja:** `scripts/schema.mjs` → `SYSTEM_NAMES` (system_id → pelna nazwa) jest single source of truth.
  `vault/templates/systems-data.json` (generowany przez `scripts/sync-systems.mjs`) dostarcza liste do Templater.
- **Lista systemow w vaulcie:** `cold-city, deadlands, gasnace-slonca, honor-i-krew, l5k, mafia-ggf,
  7th-sea, wampir, wiedzmin, wfrp-1ed, wfrp-2ed, wfrp-4ed, wolsung` + `generic` (fallback).

## Konwencje szablonu statbloku

Kazdy `vault/templates/statblocks/{id}.md`:
- Brak frontmatter (plik zaczyna sie od tresci).
- Brak `# H1` — title wchodzi z notatki postaci.
- Jezyk polski.
- Placeholder dla pustych wartosci: `—` (em-dash, nie `-`).
- Placeholder dla zaznaczen: `○` (puste kolko).
- Tabele markdown z wyrownaniem `|:-:|` dla wartosci centrowanych.
- Skalary jako `**Pole:** —`.
- Sekcje oddzielane `---`.
- Brak linkow wewnetrznych (statblok jest duplikowany miedzy postaciami).

Jesli niepewne — skopiuj format z najblizszego systemu:
- **Atrybutowe fantasy:** `wfrp-2ed.md` (WW/US/K/Odp... + lokacje pancerza).
- **Narracyjne / light:** `cold-city.md` (4 atrybuty + sieci zaufania).
- **Zywioly/rangi:** `l5k.md` (4 zywioly + 8 sub-atrybutow + rany).
- **Pulowe kosci:** `deadlands.md` (XkY + umiejetnosci sub-listy).
- **Ultra-light:** `generic.md` — tylko Cechy/Umiejetnosci/Ekwipunek.

## Workflow A — nowy statblok (nowy system)

Uzyj gdy uzytkownik dodaje nowy system RPG do vaulta.

### Kroki

1. Zbierz od uzytkownika:
   - `system_id` — slug ASCII (np. `savage-worlds`, `zew-cthulhu`). Bez polskich znakow.
   - `pelna_nazwa` — do `system_pelna` (np. "Savage Worlds 3ed").
   - Szkic mechaniki: jakie atrybuty, czy sa obciazenia/rany/zdrowie, czy tabele sprzetu itd.
2. Wybierz system-wzor z listy powyzej, skopiuj strukture.
3. Utworz `vault/templates/statblocks/{system_id}.md`. Pilnuj konwencji (Placeholder `—`, brak H1, brak frontmatter).
4. Dodaj wpis do `scripts/schema.mjs` → `SYSTEM_NAMES`:
   ```js
   "savage-worlds": "Savage Worlds 3ed",
   ```
5. Zsynchronizuj dane Templater:
   ```bash
   node scripts/sync-systems.mjs --apply
   ```
6. (Opcjonalnie) zweryfikuj build lokalny:
   ```bash
   bash scripts/local-build.sh --build
   ```
7. Poinformuj uzytkownika, ze moze teraz w Obsidian uzyc `+ Nowa postac` i wybrac nowy system.

## Workflow B — aktualizacja istniejacego statbloku

Uzyj gdy uzytkownik chce dodac/usunac pole, zmienic uklad tabeli, poprawic etykiety itd.

### Kroki

1. **Najpierw zrob snapshot starego szablonu** (konieczny do bezpiecznej detekcji "pustych" instancji,
   ktore byly wklejone z poprzedniej wersji szablonu):
   ```bash
   git show HEAD:vault/templates/statblocks/{system_id}.md > /tmp/old-{system_id}.md
   ```
2. Edytuj `vault/templates/statblocks/{system_id}.md` — wprowadz zmiany.
3. Sprawdz status wszystkich postaci w systemie:
   ```bash
   node scripts/apply-statblock.mjs diff {system_id} --snapshot /tmp/old-{system_id}.md
   ```
   Wyjscie klasyfikuje kazda postac:
   - `empty-identical-template` — pasuje do aktualnego szablonu (nic do zmiany).
   - `empty-identical-snapshot` — pasuje do starego szablonu (bezpieczne do auto-update).
   - `empty-placeholders` — zawiera tylko placeholdery/separatory (bezpieczne do auto-update).
   - `filled` — ma dane uzytkownika — **wymaga recznej migracji**.
4. Dry-run aktualizacji pustych:
   ```bash
   node scripts/apply-statblock.mjs apply {system_id} --snapshot /tmp/old-{system_id}.md
   ```
5. Gdy raport wyglada dobrze — zastosuj:
   ```bash
   node scripts/apply-statblock.mjs apply {system_id} --snapshot /tmp/old-{system_id}.md --apply
   ```
6. Dla postaci oznaczonych `filled` — patrz **Workflow C**.
7. Sprzataj: `rm /tmp/old-{system_id}.md`.

## Workflow C — reczna migracja wypelnionej postaci

Gdy postac ma wypelniony statblok i nie moze byc automatycznie zastapiona:

1. Otworz notatke postaci (`vault/Encyklopedia/Bohaterowie Graczy/...` lub `Bohaterowie Niezalezni/...`).
2. Wklej nowy szablon pod markerem `<!-- SYSTEM: {id} -->`, przenos wartosci z poprzedniego ukladu.
3. Jesli uzytkownik **jawnie** potwierdzi, ze chce stracic dane postaci i wkleic czysty szablon,
   uzyj:
   ```bash
   node scripts/apply-statblock.mjs apply {system_id} \
     --file "vault/Encyklopedia/Bohaterowie Graczy/Foo.md" --force --apply
   ```
   **Uwaga:** `--force` nadpisze statystyki. Uzywaj tylko po zgodzie uzytkownika.

## Narzedzie: `scripts/apply-statblock.mjs`

```
node scripts/apply-statblock.mjs <list|diff|apply> [system-id] [opcje]

Komendy:
  list                  Wszystkie postacie z markerem SYSTEM, pogrupowane po systemie.
  diff <system-id>      Status kazdej postaci (empty*/filled).
  apply <system-id>     Zastap statbloki nowym szablonem.

Opcje:
  --only-empty          (domyslne) Tylko puste instancje.
  --force               Zastap wszystko. Uzywaj ostroznie.
  --file <path>         Zawez do jednej notatki (np. vault/Encyklopedia/.../Foo.md).
  --snapshot <path>     Stary szablon do porownania (z "git show").
  --apply               Zapisz zmiany. Bez niej: dry-run (domyslnie).
```

Skrypt uzywa `scripts/shared.mjs` (findMdFiles, parseFrontmatter) i waliduje `system-id`
wobec `SYSTEM_NAMES` w `scripts/schema.mjs`.

## Weryfikacja po zmianach

- **Git:** `git diff vault/Encyklopedia/` — przejrzyj zmiany statblokow.
- **Walidator frontmatter:** skrypt nie rusza frontmatter, ale dobrze sprawdzic:
  ```bash
  node scripts/validate-frontmatter.mjs vault
  ```
- **Pre-commit hook:** jesli zainstalowany — automatycznie uruchomi `normalize` i `validate` przy commicie.
- **Build lokalny:** `bash scripts/local-build.sh --build` — symuluje CI, renderuje Quartz.

## Szybki pattern dla Claude

Kiedy uzytkownik prosi "dodaj pole X do statbloku systemu Y":
1. `git show HEAD:vault/templates/statblocks/Y.md > /tmp/old-Y.md`
2. Edit `vault/templates/statblocks/Y.md` — dodaj pole.
3. `node scripts/apply-statblock.mjs diff Y --snapshot /tmp/old-Y.md` — raport.
4. Jesli `filled > 0` — pokaz liste uzytkownikowi, spytaj czy migracja reczna czy `--force`.
5. `node scripts/apply-statblock.mjs apply Y --snapshot /tmp/old-Y.md --apply` — zastosuj puste.
6. Dla `filled` — zaproponuj edycje per plik.
