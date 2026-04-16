---
title: Mjr. Józef Bardak
type: bohater-gracza
system: cold-city
system_pelna: Cold City
kampania_link: ["/systemy/cold-city/cold-tales"]
kampania: ["cold-tales"]
archetyp: Funkcjonariusz PAP, Żołnierz KBW
tags: [bohater-gracza, cold-city, szpiegowski, horror]
---

![Portret Mjr. Józef Bardak](placeholder.jpg)


## Statystyki

<!-- SYSTEM: cold-city -->
*Brak statystyk mechanicznych — postać opisana narracyjnie.*

## Opis

Pracuje w PAP jako jeden z asystentów ppłk. Arkadego Kazakowa. Sowieci próbują uczynić z niego agenta, który w przyszłości mógłby szpiegować Amerykanów.

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
