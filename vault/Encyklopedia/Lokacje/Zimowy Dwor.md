---
title: Zimowy Dwór
type: lokacja
system: l5k
system_pelna: Legenda Pięciu Kręgów 1ed
kampania_link: ["/systemy/l5k/miecze-cnot-i-grzechow"]
kampania: ["miecze-cnot-i-grzechow"]
tags: [lokacja, l5k, samurajski]
---

![Zimowy Dwór](placeholder.jpg)


## Opis

Zimowy Dwór w dzień pojedynku. Żurawie i Lwy są już w mieście. Dworzanie z Klanu Żurawia przebywają niemal w każdym miejscu.

## Wystąpienia

```base
views:
  - type: table
    name: Wystąpienia
    filters:
      and:
        - file.hasLink(this.file)
    order:
      - file.name
      - data
    sort:
      - property: data
        direction: ASC
```
