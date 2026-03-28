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
        - file.inFolder("Scenariusze/Dwory Konca Swiata")
    order:
      - title
    sort:
      - property: data
        direction: ASC
```
