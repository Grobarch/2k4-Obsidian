---
title: Miasto Słodkich Kłamstw
type: lokacja
system: l5k
system_pelna: Legenda Pięciu Kręgów 1ed
kampania_link: ["/systemy/l5k/miecze-cnot-i-grzechow"]
kampania: ["miecze-cnot-i-grzechow"]
tags: [lokacja, l5k, samurajski]
---

![Miasto Słodkich Kłamstw](placeholder.jpg)


## Opis

Miasto Słodkich Kłamstw Amai-yuki-no-machi - niewyjawione sekrety pozostają sekretami - kolejny miecz, który zatruwa ludzkie serca"**
Wiosna 1106 roku kalendarza Szmaragdowego Cesarstwa. Pan Ketsuki Miyagi udaje się do Przystani Płaczących Drzew Shidare-ki, aby odebrać listy z Miasta Władców Koni Uma na temat stanu zdrowia schorowanego młodego Księcia Akagi Taro. Bohaterowie trafiają do Miasta Słodkich Kłamstw na ziemiach Klanu Skorpiona.

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
