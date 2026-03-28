---
title: W maskach (test)
type: kampania
system: 7th-sea
system_pelna: 7th Sea
mg: Arkadiusz RYGIEL
gatunek: fantasy
tags: ["kampania", "7th-sea", "szpiegowski", "fantasy"]
draft: "false"
---

# W maskach (test)

## Epizody (inline base)

```base
filters:
  and:
    - type == "epizod"
    - kampania == ["w-maskach"]
views:
  - type: cards
    name: Epizody
    filters:
      and:
        - file.folder == "Systemy/7Th Sea/W Maskach Test"
    order:
      - title
      - data
    sort:
      - property: data
        direction: ASC
    imageAspectRatio: 1.25
  - type: cards
    name: View
  - type: table
    name: View 2
    filters:
      and:
        - file.folder == "Systemy/7Th Sea/W Maskach Test"

```

## Epizody (lista z pliku .base)

![[Epizody.base]]

