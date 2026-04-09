---
title: Scenariusze
draft: "true"
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
        - file.inFolder("Systemy/Hell 4 Leather/Scenariusze")
    order:
      - file.name
    sort:
      - property: data
        direction: ASC
```
