---
title: "Czarny kapelusz, biały kapelusz, szary kapelusz"
type: scenariusz
system: wideo-rpg
data: 2014-10-26
tags: [scenariusz, wideo-rpg]
---

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
