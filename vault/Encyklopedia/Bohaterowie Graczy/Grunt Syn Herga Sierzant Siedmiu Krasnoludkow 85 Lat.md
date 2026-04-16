---
title: Grunt Syn Herga, Sierżant Siedmiu Krasnoludków, 85 lat
type: bohater-gracza
system: wiedzmin
system_pelna: "Wiedźmin: Gra Wyobraźni"
tags: ["bohater-gracza", "Wiedźmin", "dark-fantasy", "wiedzmin"]
---

![Portret Grunt Syn Herga, Sierżant Siedmiu Krasnoludków, 85 lat](placeholder.jpg)


## Statystyki

<!-- SYSTEM: wiedzmin -->
| Atrybut | Wartość |
|---------|---------|
| Ko (Kondycja) | |
| Po (Poczytalność) | |
| Si (Siła) | |
| Zm (Zmysły) | |
| Zr (Zręczność) | |
| Zw (Zwinność) | |

**Żywotność**: — **Walka bronią**: —
**Umiejętności**: —

## Opis

Łysol z tatuażami na głowie o źle zrośniętym nosie, bezoki, na opasce przesłaniającej oczodół ma namalowane oko. Nosi dumnie swe blizny. Wszył czerwoną nicią runy ochronne w kołnierzyk. Na co dzień ubiera proste ubranie.

## Wystąpienia

```base
views:
  - type: table
    name: Wystąpienia
    filters:
      and:
        - file.hasLink(this.file)
    order:
      - file.name
      - data
    sort:
      - property: data
        direction: ASC
```
