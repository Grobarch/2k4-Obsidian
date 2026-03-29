---
title: "Wolsung: Magia Wieku Pary"
type: system
system: wolsung
wydawca: Kuźnia Gier
gatunek: steampunk, przygodowy
tags: [system, wolsung, steampunk, przygodowy]
draft: "false"
---

# Wolsung: Magia Wieku Pary


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

Polska gra fabularna wydana przez Kuźnię Gier w konwencji steampunk fantasy, osadzona w świecie przypominającym wiktoriańską belle epoque z magią, maszynami parowymi i pulpową przygodą. Gracze wcielają się w bohaterów rodem z powieści Juliusza Verne'a i Arthura Conan Doyle'a -- dżentelmenów-awanturników, wynalazców i magów. Łączy elegancję epoki z dynamiczną akcją i humorem.

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
        - system == "wolsung"
    order:
      - title
      - data
    sort:
      - property: data
        direction: ASC
```

## Wszystkie strony

Przegladaj: [wszystkie strony z tagiem *wolsung*](/tags/wolsung)
