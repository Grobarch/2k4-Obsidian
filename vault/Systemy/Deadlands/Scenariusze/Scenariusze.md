---
title: Scenariusze
draft: "true"
---

<div class="obsidian-only">

```meta-bind-button
label: "+ Nowy scenariusz"
style: primary
actions:
  - type: templaterCreateNote
    templateFile: "Templates/Utwórz Scenariusz.md"
    openNote: true
```

</div>


## Scenariusze


```base
filters:
  and:
    - type == "scenariusz"
views:
  - type: list
    name: Scenariusze
    filters:
      and:
        - file.inFolder("Systemy/Deadlands/Scenariusze")
    order:
      - file.name
    sort:
      - property: data
        direction: ASC
```
