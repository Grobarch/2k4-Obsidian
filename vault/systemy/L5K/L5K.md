---
title: Legenda Pięciu Kręgów 1ed
type: system
system: l5k
wydawca: AEG / Tajemnicze Miasto
gatunek: samurajski
tags:
  - system
  - l5k
  - samurajski
draft: "false"
---

# Legenda Pięciu Kręgów 1ed


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

Pierwsza edycja kultowej gry fabularnej osadzonej w fikcyjnym cesarstwie Rokugan, inspirowanym feudalną Japonią, Chinami i Koreą. Gracze wcielają się w samurajów, shugenja i mnichów służących swoim klanom w świecie, gdzie honor jest ważniejszy od życia. Wydana przez AEG, system Roll & Keep oferuje dynamiczną mechanikę opartą na kościach k10, a rozgrywka łączy dworskie intrygi z epickim fantasy.

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
        - file.inFolder("systemy/L5K")
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
        - system == "l5k1ed"
    order:
      - title
      - data
    sort:
      - property: data
        direction: ASC
```

## Wszystkie strony

Przegladaj: [wszystkie strony z tagiem *l5k*](/tags/l5k)
