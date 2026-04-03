---
title: Deadlands
---

# Deadlands

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
        - file.inFolder("vault/scenariusze/Deadlands")
    order:
      - file.name
    sort:
      - property: data
        direction: ASC
```
