---
title: "Chrom w duszę słodką truciznę tłoczy"
type: scenariusz
system: wideo-rpg
data: 2015-11-09
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
