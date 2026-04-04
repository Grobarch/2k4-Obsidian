# COMMANDS — Wiki RPG

Przydatne komendy do pracy z projektem.

## Podgląd lokalny (pełny pipeline — ZALECANE)

```bash
cd f:\RPG\RPG_repo\2k4-Obsidian
bash scripts/local-build.sh
```

Wykonuje pełny pipeline identyczny z CI:
1. Kopiuje `vault/` → `quartz/content/`
2. Normalizuje frontmatter (`vault-tools.mjs normalize`)
3. Konwertuje Obsidian Bases → statyczne tabele/listy/karty (`build-bases.mjs`)
4. Buduje i serwuje Quartz na `localhost:8080`

Otwórz w przeglądarce: http://localhost:8080

Zatrzymaj serwer: `Ctrl+C`

Tylko build (bez serwera):
```bash
bash scripts/local-build.sh --build
```

> **Uwaga:** Komenda `npx quartz build --serve -d ../vault` pomija kroki 1-3,
> przez co bloki `base` wyświetlają się jako surowy YAML zamiast tabel/kart.
> Używaj `local-build.sh` do pełnego podglądu.

---

## Budowanie statycznych plików (bez serwera)

```bash
bash scripts/local-build.sh --build
```

Wynik trafia do `quartz/public/`.

---

## Deploy na GitHub Pages

```bash
cd f:\RPG\RPG_repo\2k4-Obsidian
git add vault/
git commit -m "vault backup: $(date '+%Y-%m-%d %H:%M:%S')"
git push
```

GitHub Actions automatycznie zbuduje i wdroży (~1-2 min).
Strona: https://grobarch.github.io/2k4-Obsidian

---

## Instalacja zależności (po świeżym clone)

```bash
cd f:\RPG\RPG_repo\2k4-Obsidian\quartz
npm install
```

---

## Sprawdzenie statusu deploy

```bash
# Status ostatnich commitów
git log --oneline -5

# Status GitHub Actions (wymaga gh CLI)
gh run list --limit 5
gh run watch
```

---

## Git — typowe operacje

```bash
# Status zmian
git status

# Dodaj wszystkie pliki vault i commituj
git add vault/
git commit -m "opis zmian"
git push

# Pull (aktualizacja z GitHub)
git pull

# Zmiana brancha
git checkout main
git checkout stage
```

---

## Przydatne ścieżki

| Co | Gdzie |
|----|-------|
| Notatki Obsidian | `vault/` |
| Konfiguracja Quartz | `quartz/quartz.config.ts` |
| Workflow GitHub Actions | `.github/workflows/deploy.yml` |
| Strona główna wiki | `vault/index.md` |
| Bohaterowie graczy | `vault/encyklopedia/bohaterowie-graczy/` |
| Bohaterowie niezależni | `vault/encyklopedia/bohaterowie-niezalezni/` |
| Lokacje | `vault/encyklopedia/lokacje/` |
| Kampanie | `vault/kampanie/` |
| Systemy | `vault/systemy/` |
