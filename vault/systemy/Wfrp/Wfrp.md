---
title: Warhammer Fantasy Role Play
type: system
system: wfrp
wydawca: Games Workshop / Copernicus
gatunek: dark fantasy
tags: [system, wfrp, dark-fantasy]
draft: "false"
---

# Warhammer Fantasy Role Play


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

Gra fabularna osadzona w mrocznym świecie Warhammer Fantasy -- ponurej, brudnej wersji renesansowej Europy ogarniętej Chaosem, plagą i korupcją. Gracze zaczynają jako zwykli ludzie -- szczurołapy, żebracy i służący -- i próbują przetrwać w świecie, który ich nienawidzi. Kultowy system znany z wysokiej śmiertelności, czarnego humoru i wyjątkowo klimatycznego settingu.

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
        - file.inFolder("systemy/Wfrp")
    order:
      - title
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
        - system == ["wfrp-1ed", "wfrp-4ed"]
    order:
      - title
      - data
    sort:
      - property: data
        direction: ASC
```

## Wszystkie strony

Przegladaj: [wszystkie strony z tagiem *wfrp*](/tags/wfrp)
