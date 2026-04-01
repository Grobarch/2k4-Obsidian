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
        - file.inFolder("scenariusze/Deathwatch")
    sort:
      - property: data
        direction: ASC
```
