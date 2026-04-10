---
title: Artykuły
type: index
draft: "false"
---

Artykuły, rysy fabularne i opowiadania ze wszystkich kampanii.

```base
filters:
  and:
    - type == "artykul"
views:
  - type: table
    name: Artykuły
    order:
      - file.name
      - system
    sort:
      - property: title
        direction: ASC
```
