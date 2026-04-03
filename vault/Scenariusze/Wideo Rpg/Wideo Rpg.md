---
title: Wideo RPG — scenariusze
draft: "true"
---

# Wideo RPG — scenariusze

```base
filters:
  and:
    - type == "scenariusz"
views:
  - type: list
    name: Scenariusze
    filters:
      and:
        - file.inFolder("Scenariusze/Wideo Rpg")
    order:
      - file.name
    sort:
      - property: data
        direction: ASC
```
