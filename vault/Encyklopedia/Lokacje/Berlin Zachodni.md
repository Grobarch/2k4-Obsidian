---
title: Berlin Zachodni
type: lokacja
system: cold-city
system_pelna: Cold City
kampania_link: ["/systemy/cold-city/cold-tales"]
kampania: ["cold-tales"]
tags: [lokacja, cold-city, szpiegowski, horror]
---

![Berlin Zachodni](placeholder.jpg)


## Opis

*Opis do uzupełnienia.*

## Wystąpienia

```base
views:
  - type: table
    name: Wystąpienia
    filters:
      and:
        - file.hasLink(this.file)
    order:
      - file.name
      - data
    sort:
      - property: data
        direction: ASC
```
