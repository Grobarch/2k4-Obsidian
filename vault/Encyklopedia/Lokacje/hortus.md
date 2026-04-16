---
title: Hortus
type: lokacja
system: gasnace-slonca
system_pelna: Gasnące Słońca 2ed
kampania_link: ["/systemy/gasnace-slonca/tajemnice-z-hortusa"]
kampania: ["tajemnice-z-hortusa"]
tags: [lokacja, gasnace-slonca, space-fantasy]
---

![Hortus](placeholder.jpg)


## Opis

Hortusa". Epizod 1 "Banda wyrzutków staje się grupą poszukiwaczy na usługach rodu de Voltis". Scenariusz rozgrywaliśmy w sobotę 14 października 2023 roku.

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
