# Zlux Editor Changelog

## `2.2.1`

- Removed .map files and large uncompressed files with .gz compressed variants, in order to reduce package size.

## `2.2.0`

- Removed use of node-sass, so that native compilation is not required
- Updated to typescript 3.7
- Updated to monaco 0.20
- Removed ngx-monaco, which was causing an issue where you could not open the editor more than twice
