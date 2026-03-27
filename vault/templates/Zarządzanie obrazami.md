---
title: Zarządzanie obrazami
tags: [templates, dokumentacja]
---

# Zarządzanie obrazami w vaultcie

> [!info] Widoczność
> Ten plik jest w folderze `Templates/` — **niewidoczny w widoku web** (ignorowany przez Quartz).

## Obsługiwane formaty

| Format | Rozszerzenie |
|--------|-------------|
| JPEG   | `.jpg`, `.jpeg` |
| PNG    | `.png` |
| SVG    | `.svg` |
| GIF    | `.gif` |
| WebP   | `.webp` |
| BMP    | `.bmp` |

## Gdzie umieszczają się pliki graficzne

Obsidian jest skonfigurowany (`attachmentFolderPath: "./assets"`) żeby automatycznie zapisywać wklejone i przeciągnięte obrazy do podfoldera `assets/` **w tym samym katalogu co aktywna notatka**:

```
vault/
└── Encyklopedia/
    └── bohaterowie-graczy/
        ├── Alban Caron.md          ← notatka
        └── assets/
            ├── alban-portrait.jpg  ← wklejony Ctrl+V / przeciągnięty
            └── mapa-regionu.png    ← wklejony do innej notatki w tym folderze
```

> [!tip] Zmiana ustawienia
> Skonfigurowane w `.obsidian/app.json` → `attachmentFolderPath: "./assets"`.
> Można zmienić w: Ustawienia → Pliki i odnośniki → Domyślna lokalizacja nowych załączników.

## Jak osadzić obraz w notatce

### Podstawowe osadzenie
```
![[nazwa-pliku.jpg]]
```

### Z tekstem alternatywnym
```
![[nazwa-pliku.jpg|Opis obrazu]]
```

### Z określonymi wymiarami (szerokość × wysokość)
```
![[nazwa-pliku.jpg|400x300]]
```

### Z alt-textem i wymiarami
```
![[nazwa-pliku.jpg|Opis obrazu|400x300]]
```

### Tylko szerokość (wysokość proporcjonalna)
```
![[nazwa-pliku.jpg|400]]
```

## Zachowanie w widoku web

- Obraz **wyświetla się** w treści notatki, w miejscu gdzie umieszczono link
- Obraz **NIE pojawia się** w panelu bocznym Explorer (tylko pliki `.md` są widoczne)
- Obraz **NIE pojawia się** w listingu foldera (FolderContent)
- Obraz **NIE pojawia się** w wyszukiwarce
- Plik jest dostępny pod bezpośrednim URL (oczekiwane zachowanie)

## Przykład działający

W vaultcie istnieje `placeholder.jpg` — osadzony w `placeholder.jpg.md` jako:
```
![[placeholder.jpg]]
```

## Proces dodawania obrazu krok po kroku

### Metoda 1 — kopiuj-wklej (zalecana)
1. Skopiuj plik graficzny (Ctrl+C) lub zrób screenshot
2. Otwórz notatkę w Obsidianie i ustaw kursor w miejscu gdzie ma być obraz
3. Wklej (Ctrl+V) — obraz automatycznie trafi do `assets/` obok notatki i pojawi się wikilink `![[assets/nazwa.png]]`
4. Przebuduj Quartz lub poczekaj na automatyczny deploy przez GitHub Actions

### Metoda 2 — przeciągnij plik
1. Przeciągnij plik graficzny z eksploratora plików do treści notatki w Obsidianie
2. Obraz zapisze się w `assets/` obok notatki

### Metoda 3 — ręcznie
1. Skopiuj plik graficzny do folderu `assets/` obok notatki
2. W notatce wstaw ręcznie: `![[assets/nazwa-pliku.jpg]]`

## Uwagi

- Quartz obsługuje ścieżki bez podawania pełnej ścieżki — wystarczy sama nazwa pliku (Obsidian wikilink)
- Jeśli dwa pliki mają tę samą nazwę w różnych folderach, podaj pełną ścieżkę względną: `![[Encyklopedia/bohaterowie-graczy/portrait.jpg]]`
- Pliki graficzne **nie** generują własnych stron HTML — nie są "notatkami"
