---
title: "Wampir: Mroczne Wieki"
type: system
system: wampir
wydawca: White Wolf
gatunek: dark fantasy, horror
tags: [system, wampir, horror, dark-fantasy]
draft: "false"
---

# Wampir: Mroczne Wieki


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

Polska edycja gry Vampire: The Dark Ages wydanej przez White Wolf, osadzona w mrocznym średniowieczu Świata Mroku (World of Darkness). Gracze wcielają się w wampiry -- nieśmiertelne istoty rozdarte między Bestią a resztkami człowieczeństwa, uwikłane w odwieczne intrygi klanów i tajnych sekt. System Storyteller kładzie nacisk na dramat osobisty, politykę wampirów i walkę z wewnętrzną ciemnością.

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
        - file.inFolder("systemy/Wampir")
    order:
      - title
      - mg
    sort:
      - property: title
        direction: ASC
```

## Wszystkie strony

Przegladaj: [wszystkie strony z tagiem *wampir*](/tags/wampir)
