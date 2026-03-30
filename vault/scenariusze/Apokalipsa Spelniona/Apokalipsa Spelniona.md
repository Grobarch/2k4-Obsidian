---
title: Apokalipsa Spełniona
---

# Apokalipsa Spełniona

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
        - file.inFolder("scenariusze/Apokalipsa Spelniona")
    order:
      - title
    sort:
      - property: data
        direction: ASC
```
