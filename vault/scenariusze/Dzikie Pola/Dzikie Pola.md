---
title: Dzikie Pola
---

# Dzikie Pola

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
        - file.inFolder("vault/scenariusze/Dzikie Pola")
    order:
      - file.name
    sort:
      - property: data
        direction: ASC
```
