---
title: Losy bohaterów przez żarna czasu ścierane
type: kampania
system: wfrp
system_pelna: Warhammer Fantasy Role Play 2ed
mg: Arkadiusz RYGIEL
gatunek: fantasy
tags: [kampania, wfrp, dark-fantasy, fantasy]
draft: "false"
---

# Losy bohaterówprzez żarna czasu ścierane


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
        - file.inFolder("vault/systemy/Wfrp/Losy Bohaterow")
    order:
      - file.name
      - data
    sort:
      - property: data
        direction: ASC
```
