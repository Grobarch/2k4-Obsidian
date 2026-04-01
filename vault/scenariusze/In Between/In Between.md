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
        - file.inFolder("scenariusze/In Between")
    sort:
      - property: data
        direction: ASC
```
