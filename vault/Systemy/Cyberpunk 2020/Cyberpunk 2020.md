---
title: Cyberpunk 2020
type: system
system: cyberpunk-2020
wydawca: R. Talsorian Games
gatunek: cyberpunk
tags: [system, cyberpunk-2020, cyberpunk]
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

Klasyczna gra fabularna autorstwa Mike'a Pondsmitha, wydana przez R. Talsorian Games. Akcja toczy się w dystopijnym Night City roku 2020, gdzie megakorporacje rządzą światem, a uliczni najemnicy, hakerzy i rockerboye walczą o przetrwanie na krawędzi technologii i przestępczości. System Interlock kładzie nacisk na śmiertelny realizm walki i cybertechnologiczne modyfikacje ciała.

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
        - system == "cyberpunk-2020"
    order:
      - file.name
      - data
    sort:
      - property: data
        direction: ASC
```

## Wszystkie strony

Przegladaj: [wszystkie strony z tagiem *cyberpunk-2020*](/tags/cyberpunk-2020)
