---
title: Deathwatch
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
        - file.inFolder("Scenariusze/Deathwatch")
    order:
      - file.name
    sort:
      - property: data
        direction: ASC
```
