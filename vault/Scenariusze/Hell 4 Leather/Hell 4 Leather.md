---
title: Hell 4 Leather
---

# Hell 4 Leather

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
        - file.inFolder("Scenariusze/Hell 4 Leather")
    order:
      - file.name
    sort:
      - property: data
        direction: ASC
```
