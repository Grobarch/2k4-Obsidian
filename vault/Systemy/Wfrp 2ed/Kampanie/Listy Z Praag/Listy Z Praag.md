---
title: Listy z Praag
type: kampania
system: wfrp-2ed
system_pelna: Warhammer Fantasy Role Play 2ed
mg: Arkadiusz RYGIEL
gatunek: fantasy
tags: [kampania, wfrp-2ed, dark-fantasy, fantasy]
draft: "false"
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
        - file.inFolder("Systemy/Wfrp 2ed/Kampanie/Listy Z Praag")
    order:
      - file.name
      - data
    sort:
      - property: data
        direction: ASC
```
