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
  Systemy/          systemy RPG > kampanie > epizody
  Encyklopedia/     postacie, lokacje, artefakty
  Scenariusze/      gotowe scenariusze per system
  templates/        szablony Templater (formularze tworzenia tresci)
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

## Setup dla edytorow

### Wymagania

- [Node.js 22+](https://nodejs.org)
- [Git](https://git-scm.com)
- [Obsidian](https://obsidian.md) (dowolna aktualna wersja)

### Instalacja

```bash
git clone https://github.com/Grobarch/2k4-Obsidian.git
cd 2k4-Obsidian

# Zainstaluj zaleznosci Quartz (jednorazowo)
cd quartz && npm ci && cd ..

# Zainstaluj pre-commit hook (jednorazowo)
cp scripts/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### Otwieranie vault w Obsidian

1. Otworz Obsidian
2. Kliknij **"Open folder as vault"**
3. Wybierz folder `vault/` w sklonowanym repo
4. Obsidian automatycznie zaladuje konfiguracje i wtyczki z `.obsidian/`
5. W Settings → Community Plugins — kliknij **"Enable community plugins"** i wlacz wszystkie

Wtyczki zainstalowane w repo (wczytuja sie automatycznie):

| Wtyczka | Rola |
|---------|------|
| **Templater** | Formularze tworzenia nowych notatek (systemy, kampanie, postacie) |
| **Meta Bind** | Przyciski uruchamiajace szablony w notatkach |
| **Folder Notes** | Klikniecie folderu otwiera notatke folderu |
| **Obsidian Git** | Automatyczny auto-commit i sync z GitHub |

### Konfiguracja Git (jednorazowo)

```bash
git config --global user.name "Twoje Imie"
git config --global user.email "twoj@email.com"
```

Obsidian Git jest skonfigurowany do auto-commitu co 10 minut i auto-pull przy starcie.
Na Windows wymagany zainstalowany Git dostepny w PATH.

### Workflow edytora

1. Edytuj notatki w `vault/` przez Obsidian (lub dowolny edytor markdown)
2. Uzywaj przyciskow w folder notes do tworzenia nowych systemow/kampanii/postaci/epizodow
3. Pre-commit hook automatycznie normalizuje frontmatter i konwertuje bloki `base`
4. Push na GitHub: `git push`
5. Deploy strony: automatyczny po push na `main`, lub recznie z zakladki **Actions** w GitHub

### Najlepsze praktyki

- Edytuj wylacznie pliki w `vault/` — nie zmieniaj `quartz/content/` (generowany automatycznie)
- Kazdemu systemowi/kampanii odpowiada folder note o tej samej nazwie co folder
- Frontmatter YAML jest walidowany przed commitem — bledy blokuja commit
- Lokalne podglad przed pushem: `bash scripts/local-build.sh` → http://localhost:8080

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

Deploy jest automatyczny (push na `main`) lub reczny (zakladka Actions → `workflow_dispatch`).

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
| `scripts/restore-bases.mjs` | Odtwarzanie blokow base z statycznych tabel (odwrotnosc build-bases) |
| `scripts/sync-systems.mjs` | Synchronizacja systems-data.json z vault |
| `scripts/fix-infolder-paths.mjs` | Naprawa sciezek file.inFolder w blokach base |
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
