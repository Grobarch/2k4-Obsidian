---
title: Dzikie Pola 2ed
type: system
system: dzikie-pola
wydawca: Wydawnictwo Storyha
gatunek: historyczny, przygodowy
tags: [system, dzikie-pola, historyczny, przygodowy]
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

Polska gra fabularna osadzona w realiach XVII-wiecznej Rzeczypospolitej Obojga Narodów -- epoce wojen, szlacheckiej fantazji i sarmackiego honoru. Gracze wcielają się w szlachciców, Kozaków, żołnierzy i awanturników na tle Potopu Szwedzkiego, powstań kozackich i walk z Turkami. Jeden z najbardziej rozbudowanych polskich systemów RPG, słynący z dbałości o historyczny detal.

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
        - system == "dzikie-pola"
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
    - system == "dzikie-pola"
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

Przegladaj: [wszystkie strony z tagiem *dzikie-pola*](/tags/dzikie-pola)
