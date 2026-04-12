---
title: Scenariusze
type: index
draft: "false"
---

## Scenariusze

Zbiór gotowych przygód i scenariuszy RPG przeznaczonych do rozegrania przy własnym stole.

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
    sort:
      - property: system
        direction: ASC
```
