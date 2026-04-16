---
title: Drzewo Duchów
type: lokacja
system: deadlands
system_pelna: "Deadlands: Martwe Ziemie"
kampania_link: ["/systemy/deadlands/wszystkie-przebrania-alistaira-kanta"]
kampania: ["wszystkie-przebrania-alistaira-kanta"]
tags: [lokacja, deadlands, western, horror]
---

![Drzewo Duchów](placeholder.jpg)


## Opis

Nieumarły koń galopuje na horyzoncie. Jest strażnikiem pradawnego miejsca. Za nim majaczy Szkarłatne Drzewo Duchów.

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
