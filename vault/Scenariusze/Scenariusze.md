---
title: Scenariusze
---

Zbiór gotowych scenariuszy i przygód z różnych systemów RPG.

```base
filters:
  and:
    - type == "scenariusz"
views:
  - type: table
    name: Scenariusze
    order:
      - file.name
      - system
      - data
    sort:
      - property: data
        direction: ASC
```
