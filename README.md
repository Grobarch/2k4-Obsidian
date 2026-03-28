# 2k4 Obsidian — Wiki RPG

Publiczna wiki dokumentująca kampanie TTRPG Arkadiusza Rygla.

**[Odwiedz wiki](https://grobarch.github.io/2k4-Obsidian)** | [Blog zrodlowy](https://arkadiusz-rygiel.blogspot.com)

## Stack

- **[Obsidian](https://obsidian.md)** — edycja lokalna (vault z notatkami markdown)
- **[Quartz 4](https://quartz.jzhao.xyz)** — generator statycznych stron z markdown
- **GitHub Pages** — hosting

## Struktura

```
vault/              Obsidian vault (tresc wiki)
  systemy/          systemy RPG > kampanie > epizody
  encyklopedia/     postacie, lokacje, artefakty
  scenariusze/      gotowe scenariusze per system
  Templates/        szablony Templater (formularze tworzenia tresci)
scripts/            narzedzia Node.js (normalize, validate, build-bases)
quartz/             Quartz 4.5.2 (konfiguracja + build)
.github/workflows/  CI/CD (deploy na GitHub Pages)
```

## Jak to dziala

1. Tresc edytowana w **Obsidian** — notatki markdown z YAML frontmatter
2. Folder notes kampanii/systemow uzywaja **Obsidian Bases** (bloki ` ```base ``` `) do wyswietlania dynamicznych tabel i list
3. Przy deploy skrypt `build-bases.mjs` konwertuje bloki `base` na statyczne tabele markdown
4. **Quartz** buduje strone HTML z przetworzonych plikow markdown
5. Strona deployowana na **GitHub Pages**

## Lokalne uruchomienie

```bash
# Wymagania: Node.js 22+
cd quartz && npm ci && cd ..

# Build + podglad na localhost:8080
bash scripts/local-build.sh

# Tylko build (bez serwera)
bash scripts/local-build.sh --build
```

## Deploy

Deploy jest reczny — uruchamiany z zakladki Actions w GitHub (`workflow_dispatch`).

Pipeline CI:
1. Kopiuje `vault/` -> `quartz/content/`
2. Normalizuje frontmatter (`vault-tools.mjs normalize`)
3. Konwertuje Obsidian Bases na statyczne tabele (`build-bases.mjs`)
4. Waliduje frontmatter (`validate-frontmatter.mjs`)
5. Buduje strone Quartz
6. Deployuje na GitHub Pages

## Narzedzia

| Skrypt | Opis |
|--------|------|
| `scripts/vault-tools.mjs` | CLI do masowych operacji na vault (normalize, validate, set-field...) |
| `scripts/build-bases.mjs` | Konwersja Obsidian Bases -> statyczne tabele/listy/karty |
| `scripts/validate-frontmatter.mjs` | Walidator frontmatter (CI gate) |
| `scripts/schema.mjs` | Kanoniczny schemat frontmatter (single source of truth) |
| `scripts/local-build.sh` | Lokalny build pipeline |

## Obsidian — wymagane pluginy

- **[Templater](https://github.com/SilentVoid13/Templater)** — formularze tworzenia tresci
- **[Meta Bind](https://github.com/mProjectsCode/obsidian-meta-bind-plugin)** — przyciski w notatkach
- **[Folder Notes](https://github.com/LostPaul/obsidian-folder-notes)** — folder notes

## Licencja

Tresc wiki (teksty, opisy kampanii) jest wlasnoscia autora.
Kod narzedzi i konfiguracja sa dostepne do wgladu.
