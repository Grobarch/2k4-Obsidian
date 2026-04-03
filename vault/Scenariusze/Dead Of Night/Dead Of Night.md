---
title: Dead of Night
---

# Dead of Night

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
        - file.inFolder("Scenariusze/Dead Of Night")
    order:
      - file.name
    sort:
      - property: data
        direction: ASC
```
