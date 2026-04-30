---
title: "Na dnie studni Baba Jaga mieszka"
type: scenariusz
system: wideo-rpg
data: 2017-03-18
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
