---
title: "Dwory Końca Świata: Dziedzictwo Imperium"
type: system
system: dwory-konca-swiata
wydawca: Gramel
gatunek: science fiction, polityczny
tags: [system, dwory-konca-swiata, science-fiction, polityczny]
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

Polska gra fabularna wydana przez Gramel, rozgrywająca się w umierającym imperium gwiezdnym pełnym dworskich intryg i politycznych spisków. Gracze wcielają się w arystokratów walczących o władzę na tle upadającej cywilizacji, gdzie honor i zdrada przeplatają się z elementami science fiction. System kładzie nacisk na relacje między postaciami i dramatyczne wybory moralne.

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
        - system == "dwory-konca-swiata"
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
    - system == "dwory-konca-swiata"
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

Przegladaj: [wszystkie strony z tagiem *dwory-konca-swiata*](/tags/dwory-konca-swiata)
