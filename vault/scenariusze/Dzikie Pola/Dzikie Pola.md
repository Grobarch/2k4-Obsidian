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
        - file.inFolder("scenariusze/Dzikie Pola")
    order:
      - title
    sort:
      - property: data
        direction: ASC
```
