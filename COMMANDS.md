# COMMANDS — Wiki RPG

Przydatne komendy do pracy z projektem.

## Podgląd lokalny (Quartz dev server)

```bash
cd f:\RPG\RPG_repo\2k4-Obsidian\quartz
npx quartz build --serve -d ../vault
```

Otwórz w przeglądarce: http://localhost:8080

Zatrzymaj serwer: `Ctrl+C`

---

## Budowanie statycznych plików (bez serwera)

```bash
cd f:\RPG\RPG_repo\2k4-Obsidian\quartz
npx quartz build -d ../vault
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
