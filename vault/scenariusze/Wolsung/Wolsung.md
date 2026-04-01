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
        - file.inFolder("scenariusze/Wolsung")
    sort:
      - property: data
        direction: ASC
```
