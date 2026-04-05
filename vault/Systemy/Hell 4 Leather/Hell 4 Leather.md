---
title: Hell 4 Leather
type: system
system: hell-4-leather
wydawca: Imagining Games
gatunek: western, grindhouse
tags: [system, hell-4-leather, western, grindhouse]
draft: "false"
---


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

Niezależna gra fabularna w klimacie westernowego grindhouse'u, inspirowana filmami o zemście w stylu spaghetti western i exploitation. Mechanika oparta na talii kart prowadzi graczy przez krwawą historię odwetu, gdzie każda postać ma swoje powody do zemsty. Szybka, brutalna i kinowa rozgrywka na jedną sesję.

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
        - system == "hell-4-leather"
    order:
      - file.name
      - data
    sort:
      - property: data
        direction: ASC
```

## Wszystkie strony

Przegladaj: [wszystkie strony z tagiem *hell-4-leather*](/tags/hell-4-leather)
