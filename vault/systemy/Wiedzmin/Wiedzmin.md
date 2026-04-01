---
title: "Wiedźmin: Gra Wyobraźni"
type: system
system: wiedzmin
wydawca: MAG / CD Projekt
gatunek: dark fantasy
tags: ["system", "Wiedźmin", "dark-fantasy", "wiedzmin"]
draft: "false"
---

# Wiedźmin: Gra Wyobraźni


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

Polska gra fabularna osadzona w uniwersum Wiedźmina stworzonego przez Andrzeja Sapkowskiego, wydana przez MAG. Gracze eksplorują mroczny, słowiański świat fantasy pełen potworów, politycznych intryg i moralnych szarości, gdzie nic nie jest czarno-białe. System pozwala wcielić się w wiedźminów, czarodziejki, bardy i innych mieszkańców Kontynentu.

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
        - file.inFolder("systemy/Wiedzmin")
    order:
      - mg
    sort:
      - property: title
        direction: ASC
```

## Wszystkie strony

Przegladaj: [wszystkie strony z tagiem *wiedzmin*](/tags/wiedzmin)
