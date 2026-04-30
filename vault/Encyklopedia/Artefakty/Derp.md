---
title: "Derp"
type: artefakt
system: cold-city
system_pelna: "Cold City"
tags: [artefakt, cold-city]
---

![Derp](placeholder.jpg)

## Opis

*Opis do uzupełnienia.*

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
