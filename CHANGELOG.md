# Zlux Editor Changelog

## `2.5.0`

- Added a refresh file option to fetch up to date contents (right click file tab OR top left menu)
- Fixed the unsaved changes file tab icon

## `2.4.0`

- Added syntax highlighter for REXX and autodetection of REXX files and datasets

## `2.3.0`

- Added ability to change owner and permissions of files and folders similar to the commands `chown` and `chmod`
- Added ability to change tagging of a file or folder of files similar to the command `chtag`

## `2.2.3`

- Bugfix: Fixed missing fonts used for icons
- Updated file tree component from version 0.1.0 to 0.2.0

## `2.2.2`

- Bugfix: CSS would not load when using API Mediation Layer, leading to UI glitches.

## `2.2.1`

- Removed .map files and large uncompressed files with .gz compressed variants, in order to reduce package size.
- Bugfix: Solved issue of being unable to properly open migrated PDS datasets & members by updating to @zowe/zlux-angular-file-tree 0.1.0 which includes that fix.

## `2.2.0`

- Removed use of node-sass, so that native compilation is not required
- Updated to typescript 3.7
- Updated to monaco 0.20
- Removed ngx-monaco, which was causing an issue where you could not open the editor more than twice
