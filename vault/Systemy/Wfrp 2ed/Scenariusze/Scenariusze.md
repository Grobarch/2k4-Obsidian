---
title: Scenariusze
type: index
draft: "true"
---


```base
filters:
  and:
    - type == "scenariusz"
views:
  - type: table
    name: Scenariusze
    filters:
      and:
        - file.inFolder("Systemy/Wfrp 2ed/Scenariusze")
    order:
      - file.name
      - data
    sort:
      - property: data
        direction: ASC
```
