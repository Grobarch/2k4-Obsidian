---
title: The Shadow of Yesterday
---

# The Shadow of Yesterday

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
        - file.inFolder("scenariusze/The Shadow Of Yesterday")
    sort:
      - property: data
        direction: ASC
```
