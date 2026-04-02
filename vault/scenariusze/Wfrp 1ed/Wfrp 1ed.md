---
title: Warhammer Fantasy Role Play 1ed
---

# Warhammer Fantasy Role Play 1ed

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
        - file.inFolder("scenariusze/Wfrp 1ed")
    order:
      - file.name
    sort:
      - property: data
        direction: ASC
```
