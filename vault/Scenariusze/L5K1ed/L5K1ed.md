---
title: Legenda Pięciu Kręgów 1ed
---

## Scenariusze


```base
filters:
  and:
    - type == "scenariusz"
views:
  - type: list
    name: Scenariusze
    filters:
      and:
        - file.inFolder("Scenariusze/L5K1ed")
    order:
      - file.name
    sort:
      - property: data
        direction: ASC
```
