---
title: Warhammer Fantasy Role Play 4ed
---

# Warhammer Fantasy Role Play 4ed

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
        - file.inFolder("vault/scenariusze/Wfrp 4ed")
    order:
      - file.name
    sort:
      - property: data
        direction: ASC
```
