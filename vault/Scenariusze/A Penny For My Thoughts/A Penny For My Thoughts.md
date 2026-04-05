---
title: A Penny For My Thoughts
---

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
        - file.inFolder("Scenariusze/A Penny For My Thoughts")
    order:
      - file.name
    sort:
      - property: data
        direction: ASC
```
