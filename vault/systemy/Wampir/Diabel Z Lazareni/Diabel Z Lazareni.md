---
title: Diabeł z Łazareni
type: kampania
system: wampir
system_pelna: "Wampir: Mroczne Wieki"
mg: Arkadiusz RYGIEL
gatunek: dark-fantasy
tags: [kampania, wampir, horror, dark-fantasy]
draft: "false"
---

# Diabeł z Łazareni


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
        - file.inFolder("systemy/Wampir/Diabel Z Lazareni")
    order:
      - title
      - data
    sort:
      - property: data
        direction: ASC
```
