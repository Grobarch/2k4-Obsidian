---
title: Ostrze Pychy Hokori
type: artefakt
system: l5k
system_pelna: Legenda Pięciu Kręgów 1ed
kampania_link: ["/systemy/l5k/miecze-cnot-i-grzechow"]
kampania: ["miecze-cnot-i-grzechow"]
tags: [artefakt, l5k, samurajski]
---

![Ostrze Pychy Hokori](placeholder.jpg)


## Opis

Ostrze Pychy Hokori" Obrażenia 4z3. Szermierz dzierżący miecz otrzymuje Zepsucie Skazą Cienia na Poziomie 3. Może używać kości odpowiadających Poziomowi Zepsucia do poprawiania testów.

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
