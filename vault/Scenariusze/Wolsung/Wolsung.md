---
title: Wolsung
---

# Wolsung

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
        - file.inFolder("Scenariusze/Wolsung")
    order:
      - file.name
    sort:
      - property: data
        direction: ASC
```
