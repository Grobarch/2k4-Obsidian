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
        - file.inFolder("scenariusze/Deadlands")
    order:
      - title
    sort:
      - property: data
        direction: ASC
```
