---
title: Zew Cthulhu
type: system
system: zew-cthulhu
wydawca: Chaosium / Wydawnictwo Pegasus
gatunek: horror
tags: [system, zew-cthulhu, horror]
draft: "false"
---

# Zew Cthulhu


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

Polska edycja klasycznej gry fabularnej Call of Cthulhu wydanej przez Chaosium, opartej na twórczości H.P. Lovecrafta. Gracze wcielają się w zwykłych ludzi -- badaczy, dziennikarzy i detektywów -- którzy odkrywają przerażającą prawdę o kosmicznych istotach czyhających na granicy ludzkiej percepcji. System oparty na procentowych kościach słynie z wysokiej śmiertelności postaci i nieuchronnej utraty poczytalności.

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
        - system == "zew-cthulhu"
    order:
      - file.name
      - data
    sort:
      - property: data
        direction: ASC
```

## Wszystkie strony

Przegladaj: [wszystkie strony z tagiem *zew-cthulhu*](/tags/zew-cthulhu)
