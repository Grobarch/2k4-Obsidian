---
title: Dzikie Pola
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
        - file.inFolder("Scenariusze/Dzikie Pola")
    order:
      - file.name
    sort:
      - property: data
        direction: ASC
```
