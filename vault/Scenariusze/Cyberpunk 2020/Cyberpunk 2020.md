---
title: Cyberpunk 2020
---

# Cyberpunk 2020

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
        - file.inFolder("Scenariusze/Cyberpunk 2020")
    order:
      - file.name
    sort:
      - property: data
        direction: ASC
```
