---
title: "Mafia: Gangsterska Gra Fabularna"
type: system
system: mafia-ggf
wydawca: Wydawnictwo Portal
gatunek: gangsterski
tags: [system, mafia-ggf, gangsterski]
draft: "false"
---

# Mafia: Gangsterska Gra Fabularna


<div class="obsidian-only">

```meta-bind-button
label: "+ Nowa kampania"
style: primary
actions:
  - type: templaterCreateNote
    templateFile: "Templates/Utwórz Kampanię.md"
    openNote: true
```

</div>

## Opis

Polska gra fabularna wydana przez Portal, o świecie zorganizowanej przestępczości, inspirowana filmami gangsterskimi i kryminalnymi sagami. Gracze wcielają się w członków mafijnych rodzin, walcząc o władzę, pieniądze i przetrwanie w bezwzględnym półświatku. System kładzie nacisk na relacje między postaciami, lojalność i zdradę w gangsterskim środowisku.

## Kampanie


```base
filters:
  and:
    - type == "kampania"
views:
  - type: table
    name: Kampanie
    filters:
      and:
        - file.inFolder("systemy/Mafia Ggf")
    order:
      - title
      - mg
    sort:
      - property: title
        direction: ASC
```

## Wszystkie strony

Przegladaj: [wszystkie strony z tagiem *mafia-ggf*](/tags/mafia-ggf)
