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
        - file.inFolder("vault/scenariusze/Apokalipsa Spelniona")
    order:
      - file.name
    sort:
      - property: data
        direction: ASC
```
