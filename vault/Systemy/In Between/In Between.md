---
title: In Between
type: system
system: in-between
wydawca: Wydawnictwo Portal
gatunek: horror, psychologiczny
tags: [system, in-between, horror, psychologiczny]
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

Polska gra fabularna wydana przez Portal, o tematyce horroru psychologicznego, w której bohaterowie balansują na granicy rzeczywistości i koszmaru. Rozgrywka skupia się na eksploracji lęków, traum i mrocznych tajemnic postaci w atmosferze narastającego niepokoju. System wspiera narracyjną budowę napięcia i stopniowe odkrywanie prawdy o otaczającym świecie.

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
        - system == "in-between"
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
    - system == "in-between"
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

Przegladaj: [wszystkie strony z tagiem *in-between*](/tags/in-between)
