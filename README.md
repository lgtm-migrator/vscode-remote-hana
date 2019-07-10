# vscode-remote-hana

Start Hana XS JS Development in VS Code

## Blocking

VSCode standard js/ts extension **NOT** support custom file system implementation.

Caused by vscode builtin extension `typescript-language-features` use the local `typescript` module as server in another process, its hard to use the filesystem provider from vscode extension.

## Feature

* [x] create/save file
* [x] create directory
* [x] delete file/directory
* [x] rename file/directory
* [ ] move file
* [ ] binary files upload
* [ ] document
* [ ] activate/status monitor
* [ ] version control integration
* [ ] debug
* [ ] xs js/ui5 code intellisense
