>[!note]+
>```base
>views:
>  - type: table
>    name: Table
>    filters:
>      and:
>        - file.hasLink(this.file.name)
>    order:
>      - file.name
>      - file.folder
>      - file.ctime
>      - file.mtime
>    columnSize:
>      file.name: 500
>      file.folder: 500
>      file.ctime: 175
>      file.mtime: 175
>```
>