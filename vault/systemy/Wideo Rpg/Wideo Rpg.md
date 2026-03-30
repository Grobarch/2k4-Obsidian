---
title: Wideo RPG
type: system
system: wideo-rpg
wydawca: System autorski Arkadiusza RYGLA
gatunek: uniwersalny
tags: [system, wideo-rpg, uniwersalny]
draft: "false"
---

# Wideo RPG


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

Autorski, uniwersalny system RPG stworzony przez Arkadiusza Rygla, zaprojektowany z myślą o elastyczności gatunkowej -- od westernu przez horror po fantasy. Lekka mechanika pozwala na prowadzenie gier w różnych konwencjach bez konieczności zmiany systemu. Sprawdzony w dziesiątkach sesji o rozmaitej tematyce.

## Scenariusze samodzielne


```base
filters:
  and:
    - type == "scenariusz"
views:
  - type: table
    name: Scenariusze
    filters:
      and:
        - system == "wideo-rpg"
    order:
      - title
      - data
    sort:
      - property: data
        direction: ASC
```

## Wszystkie strony

Przegladaj: [wszystkie strony z tagiem *wideo-rpg*](/tags/wideo-rpg)
