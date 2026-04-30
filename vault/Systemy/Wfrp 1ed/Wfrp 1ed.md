---
title: Warhammer Fantasy Role Play 1ed
type: system
system: wfrp-1ed
wydawca: Games Workshop / Pegasus
gatunek: dark fantasy
tags: [system, wfrp-1ed, dark-fantasy]
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

Pierwsza edycja kultowego systemu RPG osadzonego w mrocznym świecie Warhammer Fantasy — ponurej, brudnej wersji renesansowej Europy ogarniętej Chaosem, plagą i korupcją. Gracze zaczynają jako zwykli ludzie — szczurołapy, żebracy i służący — i próbują przetrwać w świecie, który ich nienawidzi. Kultowy system znany z wysokiej śmiertelności, czarnego humoru i wyjątkowo klimatycznego settingu.

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
        - file.inFolder("Systemy/Wfrp 1ed/Kampanie")
    order:
      - file.name
      - mg
    sort:
      - property: title
        direction: ASC
```

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
        - file.inFolder("Systemy/Wfrp 1ed/Scenariusze")
    order:
      - file.name
      - data
    sort:
      - property: data
        direction: ASC
```

## Oś czasu

```base
filters:
  and:
    - type == "epizod"
    - system == "wfrp-1ed"
views:
  - type: list
    name: Oś czasu
    groupBy:
      property: data
      format: month
    order:
      - file.name
      - data
      - kampania
    sort:
      - property: data
        direction: ASC
```

## Wszystkie strony

Przegladaj: [wszystkie strony z tagiem *wfrp-1ed*](/tags/wfrp-1ed)
