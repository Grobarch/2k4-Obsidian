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
        - file.inFolder("Scenariusze/Deathwatch")
    order:
      - title
    sort:
      - property: data
        direction: ASC
```
