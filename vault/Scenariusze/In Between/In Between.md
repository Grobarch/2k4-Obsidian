---
title: In Between
---

# In Between

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
        - file.inFolder("Scenariusze/In Between")
    order:
      - file.name
    sort:
      - property: data
        direction: ASC
```
