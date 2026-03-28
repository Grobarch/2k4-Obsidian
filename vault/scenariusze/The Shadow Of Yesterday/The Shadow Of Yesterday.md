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
        - file.inFolder("Scenariusze/The Shadow Of Yesterday")
    order:
      - title
    sort:
      - property: data
        direction: ASC
```
