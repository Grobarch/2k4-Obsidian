---
name: backlinks
description: Wstawianie absolutnych linkow markdown do body notatek vault RPG. Linkuje do notatek bohaterow, artefaktow, lokacji, systemow i kampanii. Dwa tryby - pojedyncza notatka (--file) lub batch caly vault (--all). Nigdy nie modyfikuje frontmatteru. Uzywaj gdy uzytkownik mowi "dodaj backlinki", "polinkuj notatke X", "przelinkuj vault", "run backlinks", "polinkuj X".
---

# Backlinks — wstawianie linkow wiki do notatek

## Po co to istnieje

W vaulcie setki notatek wzmiankuja bohaterow, artefakty, lokacje i kampanie, ale czesto bez linku. Istniejace pluginy Obsidian (Note Linker) linkuja rowniez tekst w **frontmatterze** (YAML properties), co lamie format i walidator.

Ten skill uzywa `scripts/backlinks.mjs` ktory:
- Dziala **tylko na body** notatki (prefix YAML jest kopiowany bit-for-bit).
- Linkuje tylko pierwsze wystapienie kazdego celu w notatce.
- Pomija: code blocks, inline code, istniejace linki markdown, wikilinki, image embeds.
- Nie dubluje linku jesli URL celu juz wystepuje w body.
- Nie linkuje notatki do siebie samej.

## Kiedy uzywac

- Uzytkownik prosi o "backlinki", "polinkowanie", "przelinkowanie", "run backlinks".
- Po dodaniu duzej nowej notatki (NPC, artefakt, lokacja, system) — zeby istniejace notatki zaczely do niej linkowac przy najblizszym uruchomieniu.
- NIE uzywac gdy uzytkownik chce recznie wstawic jeden konkretny link — zrob to bezposrednio Edit.

## Kiedy NIE uzywac

- Do edycji frontmatteru — uzyj `scripts/vault-tools.mjs` (`set-field`, `rename-field`, itd.).
- Do budowy statycznych widokow z blokow base — to robi `scripts/build-bases.mjs` w CI.

## Cele (target types)

Skrypt linkuje tylko te typy (zgodnie z `frontmatter.type`):

| Type | Folder |
|---|---|
| `bohater-gracza` | `Encyklopedia/Bohaterowie Graczy/` |
| `bohater-niezalezny` | `Encyklopedia/Bohaterowie Niezalezni/` |
| `artefakt` | `Encyklopedia/Artefakty/` |
| `lokacja` | `Encyklopedia/Lokacje/` |
| `system` | `Systemy/<System>/<System>.md` (folder note) |
| `kampania` | `Systemy/<System>/<Kampania>/<Kampania>.md` (folder note) |

Epizody i scenariusze celowo NIE sa celami — sa zbyt specyficzne i rzadko wzmiankowane po nazwie poza swoim folderem.

## Aliasy (opcjonalnie)

Jesli cel ma znane pseudonimy/skroty, dodaj do jego frontmattera:

```yaml
aliases:
  - Baron Hawkwood
  - Kamden Hawkwood
```

Skrypt wtedy bedzie linkowal rowniez te formy. Kazdy wariant liczy sie niezaleznie jako kandydat — ale po zlinkowaniu celu raz, dalsze jego wystapienia (w dowolnej formie) sa pomijane.

Pole `aliases` jest opcjonalne. Walidator frontmatter je akceptuje (ignoruje nieznane pola). `vault-tools.mjs normalize` je zachowuje.

## Workflow

### Tryb per-note (pojedyncza notatka)

Uzyj gdy uzytkownik wskazuje konkretna notatke do polinkowania.

1. **Dry-run:**
   ```bash
   node scripts/backlinks.mjs --file "vault/Systemy/Cold City/Cold Tales/Epizod 01.md"
   ```
2. Pokaz uzytkownikowi liste kandydatow (skrypt sam je wypisuje w formacie `+ "fraza" -> /url`).
3. Po akceptacji — apply:
   ```bash
   node scripts/backlinks.mjs --file "vault/..." --apply
   ```

### Tryb batch (caly vault)

Uzyj gdy uzytkownik chce polinkowac caly vault naraz (np. po dodaniu wielu nowych postaci).

1. **Dry-run:**
   ```bash
   node scripts/backlinks.mjs --all
   ```
2. Pokaz uzytkownikowi statystyki (ile plikow, ile linkow).
3. Po akceptacji — apply:
   ```bash
   node scripts/backlinks.mjs --all --apply
   ```

W trybie `--all` domyslnie wykluczone sa:
- Folder notes (pliki gdzie nazwa == nazwa parent folderu) — zawieraja glownie bloki `base`.
- `vault/Templates/**` — szablony.
- `vault/index.md` — strona glowna.

## Flagi dodatkowe

- `--ci` — matching case-insensitive (domyslnie case-sensitive).
- `--root <dir>` — zmien root vaultu (domyslnie `vault`).

## Po apply

Zawsze uruchom walidator:
```bash
node scripts/vault-tools.mjs validate --dir vault
```
Jesli walidacja przeszla (bit-for-bit zachowanie frontmatteru to glowna gwarancja), smiało `git add` + `git commit`.

## Troubleshooting

**"Skrypt nie polinkowal X, chociaz X jest w tekscie."**
- Sprawdz czy notatka celu X ma `type` z listy dozwolonych typow.
- Sprawdz czy X ma `title` we frontmatterze.
- Byc moze tytul celu brzmi inaczej niz forma w tekscie — dodaj wariant do `aliases` we frontmatterze celu.
- Sprawdz czy X nie jest w folderze wykluczonym (`Templates/`, folder note).
- Sprawdz czy fraza nie jest wewnatrz code blocka / inline code / istniejacego linku — wtedy jest celowo pomijana.
- Sprawdz czy URL celu juz wystepuje w body notatki — wtedy pomijany (nie dubluje linkow).

**"Skrypt polinkowal za duzo / za agresywnie."**
- Domyslnie matching jest case-sensitive i wymaga dokladnie calego tytulu (lub aliasu). To zazwyczaj wystarczy. Jesli pojawil sie false positive — zmien tytul celu albo dodaj aliasy do dokladniejszych form.

**"Frontmatter sie zmienil."**
- Nie powinien. Skrypt kopiuje prefix `---...---` bit-for-bit bez parsowania go do zapisu (parsuje tylko do odczytu celow). Jesli to widzisz, to bug — zglos.
