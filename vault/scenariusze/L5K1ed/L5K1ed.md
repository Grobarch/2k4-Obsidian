---
title: Legenda Pięciu Kręgów 1ed
---

# Legenda Pięciu Kręgów 1ed

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
        - file.inFolder("scenariusze/L5K1ed")
    order:
      - title
    sort:
      - property: data
        direction: ASC
```
