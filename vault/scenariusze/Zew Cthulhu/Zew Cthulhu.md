---
title: Zew Cthulhu
---

# Zew Cthulhu

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
        - file.inFolder("scenariusze/Zew Cthulhu")
    order:
      - file.name
    sort:
      - property: data
        direction: ASC
```
