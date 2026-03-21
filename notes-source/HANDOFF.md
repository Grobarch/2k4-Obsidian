# Handoff: Wiki RPG — Obsidian + Quartz

## Cel projektu

Wiki dokumentująca kampanie, sesje, postacie i światy TTRPG prowadzone przez Arkadiusza Rygla
(blog źródłowy: arkadiusz-rygiel.blogspot.com, sekcja "Papierowe RPG").

Docelowy stack: **Obsidian** (edycja lokalna) + **Quartz** (publikacja jako statyczna strona WWW).

---

## Stan na moment przekazania

### Co jest gotowe

- `vault/` — **204 pliki markdown** z YAML frontmatter, gotowe do otwarcia w Obsidianie
- Skrypt konwersji `scripts/convert_to_obsidian.py` — przetestowany, działa

### Co jeszcze nie zrobione

- Konfiguracja Obsidian (`.obsidian/`) — brak, trzeba wykonać raz po otwarciu vault
- Instalacja i konfiguracja Quartz — nie zaczęta
- Deploy na hosting — nie zaczęty

---

## Struktura vault/

```
vault/
├── encyklopedia/
│   ├── bohaterowie-graczy/     # 64 pliki — postacie graczy (BG)
│   ├── bohaterowie-niezalezni/ # 19 plików — NPC (BN)
│   ├── lokacje/                # 10 plików
│   └── artefakty/              # 6 plików
├── kampanie/
│   ├── 7th-sea/w-maskach/                              # 3 epizody + index
│   ├── cold-city/cold-tales/                           # 8 epizodów + index
│   ├── deadlands-martwe-ziemie/wszystkie-przebrania-alistaira-kanta/  # 10 epizodów + index
│   ├── gasnace-slonca-2ed/tajemnice-z-hortusa/         # 1 epizod + index
│   ├── honor-i-krew/trylogia-miecza/                   # 3 epizody + index
│   ├── legenda-pieciu-kregow-1ed/
│   │   ├── groza-ktora-zawsze-powraca/                 # 1 epizod + index
│   │   ├── miecze-cnot-i-grzechow/                    # 8 epizodów + index
│   │   ├── prawidla-zdrady/                            # 2 epizody + index
│   │   └── trylogia-klanu-lwa/                         # 2 epizody + index
│   ├── mafia-ggf/la-cosa-nostra/                       # 5 epizodów + index
│   ├── wampir-mroczne-wieki/diabel-z-lazareni/         # 4 epizody + index
│   ├── warhammer-frp-2ed/
│   │   ├── listy-z-praag/                              # 4 epizody + index
│   │   └── losy-bohaterow/                             # 3 epizody + index
│   └── wiedzmin-gra-wyobrazni/sludzy-miecza/           # 4 epizody + index
└── systemy/                    # 23 pliki — karty systemów RPG
```

---

## Format plików (YAML frontmatter)

Każdy plik ma frontmatter na górze. Przykłady:

### Bohater Gracza
```yaml
---
title: Bayushi Tokuno
type: bohater-gracza
system: l5k
system_pelna: Legenda Pięciu Kręgów 1ed
kampania_link: /kampanie/legenda-pieciu-kregow-1ed/miecze-cnot-i-grzechow
kampania: miecze-cnot-i-grzechow
gracz: Paweł OBSTAWSKI
archetyp: bushi z Klanu Skorpiona
tags: [bohater-gracza, l5k, samurajski]
---
```

### Epizod kampanii
```yaml
---
title: "Epizod 1: \"Walizka z Heartville\""
type: epizod
system: deadlands
system_pelna: "Deadlands: Martwe Ziemie"
kampania_link: /kampanie/deadlands-martwe-ziemie/wszystkie-przebrania-alistaira-kanta
kampania: wszystkie-przebrania-alistaira-kanta
mg: Arkadiusz RYGIEL
data: 2022-08-03
zrodlo: "https://arkadiusz-rygiel.blogspot.com/..."
tags: [epizod, deadlands, western, horror]
---
```

### Indeks kampanii
```yaml
---
title: Wszystkie przebrania Alistaira Kanta
type: kampania
system: deadlands
system_pelna: "Deadlands: Martwe Ziemie"
mg: Arkadiusz RYGIEL
gatunek: western
tags: [kampania, deadlands, western, horror]
---
```

### System RPG
```yaml
---
title: Legenda Pięciu Kręgów 1ed
type: system
system: l5k
wydawca: AEG / Tajemnicze Miasto
gatunek: samurajski
tags: [system, l5k, samurajski]
---
```

### Lokacja / Artefakt
```yaml
---
title: Heartville
type: lokacja
system: deadlands
kampania_link: /kampanie/deadlands-martwe-ziemie/wszystkie-przebrania-alistaira-kanta
kampania: wszystkie-przebrania-alistaira-kanta
tags: [lokacja, deadlands, western, horror]
---
```

---

## Wartości pola `type`

| Wartość | Opis |
|---------|------|
| `bohater-gracza` | Postać gracza (BG) |
| `bohater-niezalezny` | NPC / antagonista (BN) |
| `lokacja` | Miejsce fabularne |
| `artefakt` | Przedmiot szczególny |
| `epizod` | Sesja / odcinek kampanii |
| `kampania` | Indeks kampanii (plik index.md) |
| `system` | Karta systemu RPG |

## Slugu systemów (`system`)

| Slug | Pełna nazwa |
|------|-------------|
| `l5k` | Legenda Pięciu Kręgów 1ed |
| `deadlands` | Deadlands: Martwe Ziemie |
| `wfrp` | Warhammer Fantasy Role Play 2ed |
| `cold-city` | Cold City |
| `wiedzmin` | Wiedźmin: Gra Wyobraźni |
| `7th-sea` | 7th Sea |
| `gasnace-slonca` | Gasnące Słońca 2ed |
| `wampir` | Wampir: Mroczne Wieki |
| `mafia-ggf` | Mafia: GGF |
| `honor-i-krew` | Honor i Krew |
| `wolsung` | Wolsung: Magia Wieku Pary |
| `cyberpunk-2020` | Cyberpunk 2020 |
| `zew-cthulhu` | Zew Cthulhu |

---

## Linki wewnętrzne

Format: `[tekst](/ścieżka/do/strony)` — ścieżki absolutne od korzenia vault.

Przykłady:
- `[Bayushi Tokuno](/encyklopedia/bohaterowie-graczy/bayushi-tokuno)`
- `[Epizod 1](/kampanie/deadlands-martwe-ziemie/wszystkie-przebrania-alistaira-kanta/epizod-01)`
- `[Deadlands](/systemy/deadlands)`

Tagi: `/tags/l5k`, `/tags/epizod` (format Quartz, nie Wiki.js `/t/`).

---

## Krok 1: Otwarcie w Obsidianie

1. Zainstaluj [Obsidian](https://obsidian.md) (darmowy)
2. `File > Open Vault > Wybierz folder vault/`
3. Przydatne pluginy (Community Plugins):
   - **Dataview** — zapytania SQL-like po frontmatter (np. lista wszystkich BG z systemu l5k)
   - **Templater** — szablony z formularzami do tworzenia nowych wpisów
4. Widok grafu (`Ctrl+G`) — mapa relacji między stronami

### Przykładowe zapytanie Dataview

```dataview
TABLE gracz, archetyp
FROM "encyklopedia/bohaterowie-graczy"
WHERE system = "l5k"
SORT title ASC
```

---

## Krok 2: Instalacja Quartz (publikacja WWW)

Quartz generuje statyczną stronę HTML z zawartości vault.

```bash
# Sklonuj Quartz do osobnego katalogu (obok vault/)
git clone https://github.com/jackyzha0/quartz.git wiki-quartz
cd wiki-quartz
npm install

# Skopiuj zawartość vault/ do content/
cp -r ../vault/* content/

# Uruchom lokalnie
npx quartz build --serve
# Otwórz: http://localhost:8080
```

### Kluczowe ustawienia w `quartz.config.ts`

```typescript
configuration: {
  pageTitle: "Wiki RPG — Papierowe RPG",
  locale: "pl-PL",
  baseUrl: "twoja-domena.pl",
},
plugins: {
  transformers: [
    Plugin.FrontMatter(),
    Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
    Plugin.GitHubFlavoredMarkdown(),
    Plugin.CrawlLinks({
      markdownLinkResolution: "absolute",  // ważne — linki absolutne
    }),
  ],
  emitters: [
    Plugin.TagPage(),      // generuje /tags/<tag> automatycznie
    Plugin.FolderPage(),   // generuje stronę dla każdego folderu
    // ...reszta domyślna
  ],
}
```

### Deploy na GitHub Pages

Quartz ma gotowy workflow CI/CD:
1. Utwórz repo na GitHub (np. `wiki-rpg`)
2. Push zawartości `wiki-quartz/` do tego repo
3. GitHub Actions automatycznie buduje i deployuje przy każdym push

---

## Krok 3: Synchronizacja zespołu (2-3 osoby)

Opcje synchronizacji vault między edytorami:

**Opcja A: Obsidian Sync** ($5/mies)
- Wbudowany w Obsidian, działa bez Git
- Każda osoba instaluje Obsidian + loguje się tym samym kontem Sync

**Opcja B: Git + plugin obsidian-git**
- Plugin `obsidian-git` w Obsidianie — commit i push bez wychodzenia z aplikacji
- Wymaga że każda osoba ma Git i konto GitHub

Dla Quartz: każdy push do brancha `main` wyzwala automatyczny deploy przez GitHub Actions.

---

## Skrypt konwersji (regeneracja)

Jeśli trzeba zregenerować vault/ (np. po zmianach w wiki_pages/):

```bash
# Z katalogu projektu (gdzie jest scripts/)
python scripts/convert_to_obsidian.py           # dry-run
python scripts/convert_to_obsidian.py --apply   # zapisuje vault/
python scripts/convert_to_obsidian.py --apply --verbose  # szczegółowy log
```

Skrypt czyta z `wiki_pages/` i **nadpisuje** `vault/`. Nie modyfikuje oryginałów.

### Co konwertuje

| Źródło | Cel |
|--------|-----|
| `wiki_pages/encyklopedia/bohaterowie-graczy/` | `vault/encyklopedia/bohaterowie-graczy/` |
| `wiki_pages/encyklopedia/bohaterowie-niezalezni/` | `vault/encyklopedia/bohaterowie-niezalezni/` |
| `wiki_pages/encyklopedia/lokacje/` | `vault/encyklopedia/lokacje/` |
| `wiki_pages/encyklopedia/artefakty/` | `vault/encyklopedia/artefakty/` |
| `wiki_pages/systemy/` | `vault/systemy/` |
| `wiki_pages/kampanie/` | `vault/kampanie/` |

Nie konwertuje: `konwenty/`, `publicystyka/`, `raporty-z-testow/`, `scenariusze/`, `wideo-rpg/`.

---

## Znane ograniczenia / TODO

- **Obrazki**: pliki `placeholder.jpg` w encyklopedii to placeholdery — nie ma prawdziwych portretów postaci. Obrazki z bloga (Blogger CDN) w epizodach działają jako zewnętrzne linki.
- **Statystyki postaci**: pola statystyk w encyklopedii są puste (placeholdery) — do uzupełnienia ręcznie.
- **`encyklopedia/postacie/`**: 33 postacie nieoznaczone (BG/BN) z Wiki.js **nie zostały** przeniesione do vault — wymagają ręcznej klasyfikacji przed dodaniem.
- **Szablony Obsidian**: brak skonfigurowanych szablonów Templater — do zrobienia po otwarciu vault.
- **Quartz layout**: domyślny motyw Quartz — do dostosowania wg preferencji.
