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
        - file.inFolder("scenariusze/Cyberpunk 2020")
    order:
      - title
    sort:
      - property: data
        direction: ASC
```
