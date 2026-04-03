---
title: Deathwatch
---

# Deathwatch

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
        - file.inFolder("vault/scenariusze/Deathwatch")
    order:
      - file.name
    sort:
      - property: data
        direction: ASC
```
