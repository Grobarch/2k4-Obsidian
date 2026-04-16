---
title: Mjr. Iwan Gorki
type: bohater-gracza
system: cold-city
system_pelna: Cold City
kampania_link: ["/systemy/cold-city/cold-tales"]
kampania: ["cold-tales"]
archetyp: Funkcjonariusz PAP, Agent GRU
tags: [bohater-gracza, cold-city, szpiegowski, horror]
---

![Portret Mjr. Iwan Gorki](placeholder.jpg)


## Statystyki

<!-- SYSTEM: cold-city -->
*Brak statystyk mechanicznych — postać opisana narracyjnie.*

## Opis

Towarzysz Gorki trafił do PAP jako specjalista od zjawisk paranormalnych. Na co dzień, zajmuje się likwidacją skutków nazistowskich eksperymentów. Dodatkowo, przesyła istotne informacje do centrali w Moskwie. Likwiduje także ludzi niewygodnych dla interesów Związku Radzieckiego.

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
