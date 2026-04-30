---
title: Dead of Night
type: system
system: dead-of-night
wydawca: Steampower Publishing
gatunek: horror
tags: [system, dead-of-night, horror]
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

Lekka gra fabularna stworzona z myślą o jednorazowych sesjach horrorowych w duchu klasycznych filmów grozy. Prosty system oparty na dwóch statystykach pozwala szybko rozpocząć grę i skupić się na budowaniu napięcia. Idealna do odtwarzania klimatu slasherów, nawiedzonych domów i innych horrorowych tropów.

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
        - system == "dead-of-night"
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
    - system == "dead-of-night"
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

Przegladaj: [wszystkie strony z tagiem *dead-of-night*](/tags/dead-of-night)
