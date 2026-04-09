---
title: Scenariusze
draft: "true"
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
        - file.inFolder("Systemy/Cold City/Scenariusze")
    order:
      - file.name
    sort:
      - property: data
        direction: ASC
```
