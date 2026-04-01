---
title: Dwory Końca Świata
---

# Dwory Końca Świata

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
        - file.inFolder("scenariusze/Dwory Konca Swiata")
    sort:
      - property: data
        direction: ASC
```
