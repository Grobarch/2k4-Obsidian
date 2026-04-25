---
title: Słudzy miecza i brzęczących monet
type: kampania
system: wiedzmin
system_pelna: "Wiedźmin: Gra Wyobraźni"
mg: Arkadiusz RYGIEL
gatunek: fantasy
tags: ["kampania", "Wiedźmin", "dark-fantasy", "fantasy", "wiedzmin"]
draft: "false"
status: "zakończona"
---


<div class="obsidian-only">

```meta-bind-button
label: "+ Nowy epizod"
style: primary
actions:
  - type: templaterCreateNote
    templateFile: "Templates/Utwórz Epizod.md"
    openNote: true
```

```meta-bind-button
label: "+ Nowa postać"
style: default
actions:
  - type: templaterCreateNote
    templateFile: "Templates/Utwórz Postać.md"
    openNote: true
```

</div>

## Spis epizodow


```base
filters:
  and:
    - type == "epizod"
views:
  - type: table
    name: Epizody
    filters:
      and:
        - file.inFolder("Systemy/Wiedzmin/Sludzy Miecza")
    order:
      - file.name
      - data
    sort:
      - property: data
        direction: ASC
```
