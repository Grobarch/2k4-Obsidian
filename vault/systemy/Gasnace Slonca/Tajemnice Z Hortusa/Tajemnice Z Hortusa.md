---
title: Tajemnice zapomnianej technologii z Hortusa
type: kampania
system: gasnace-slonca
system_pelna: Gasnące Słońca 2ed
mg: Arkadiusz RYGIEL
gatunek: space-fantasy
tags: [kampania, gasnace-slonca, space-fantasy]
draft: "false"
---

# Tajemnice zapomnianej technologii z Hortusa


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
        - file.inFolder("systemy/Gasnace Slonca/Tajemnice Z Hortusa")
    order:
      - title
      - data
    sort:
      - property: data
        direction: ASC
```
