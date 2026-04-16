---
title: Heartville
type: lokacja
system: deadlands
system_pelna: "Deadlands: Martwe Ziemie"
kampania_link: ["/systemy/deadlands/wszystkie-przebrania-alistaira-kanta"]
kampania: ["wszystkie-przebrania-alistaira-kanta"]
tags: [lokacja, deadlands, western, horror]
---

![Heartville](placeholder.jpg)


## Opis

Heartville"**

**Scena 1. "Duszna atmosfera w Saloonie Crazy Horseshoe"**
Skonfederowane Stany Zjednoczone. Heartville w Stanie Missouri.

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