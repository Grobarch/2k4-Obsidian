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
        - file.inFolder("scenariusze/Dead Of Night")
    sort:
      - property: data
        direction: ASC
```
