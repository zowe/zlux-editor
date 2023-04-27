# Zlux Editor Changelog

## `3.0.1`
- Bugfix: Added a few rules for JCL syntax highlighter
- Bugfix: Set USS path to correct directory, when opening the directory or file in new browser tab respectively
- Added the feature to copy the line content and copy URL link to open a file at a specific line
- Bugfix: Getting 400 BAD REQUEST in browser when opening the file or dataset in a new browser tab
- Bugfix: When opening New File, editor keeps on using the earlier opened file and its model
- Bugfix: Fix app2app 'openDataset' function
- Rename 'openFile' to 'openBuffer' in editor-control.serverice.ts

## `3.0.0`

- Breaking change: The app now uses angular 12, making it compatible with Zowe v2 desktop and incompatible with v1 desktop.
- Enhancement: The app now contains a manifest file so that it can be installed with `zwe components install`
- Enhancement: Remove the opened file or dataset from Editor when deleted from file-tree.
- BugFix: Editor keeps the content of the file, after an opened file is closed.

## `2.9.0`
- Added the feature to update the dataset in the editor
- Added the check for e-tag while updating the dataset
- Added feature to open a file in new broswer tab
- Added the ability to view the dataset write conflicts in the diff-viewer
- Added the ability to overwrite the dataset and accept incoming change inside the diff-viewer
- Added the feature to prompt the user to save the unsaved files before closing

## `2.8.0`
- Bugfix: Fixed error message & phantom tab when opening undefined length dataset
- Bugfix: Unable to recalculate the size of monaco-code-container when switching from diff-viewer to code-editor.
- Added previously selected content comparison (Diff viewer)
- Added the ability to refresh the file properties in File Tree, when an already exiting untagged file is saved with an encoding type.
- Added the ability to use the latest USS encoding when saving an exiting file.
- Removed the Cancel button and replaced it with X button on all dialogue pop-ups
- Added toggle bar to show and hide File Explorer.

## `2.7.0`
- Added function to toggle the file explorer
- Added calls to the function in openfile and open dataset so that when the user inputs the string with a true in the url it will hide the file explorer 

## `2.6.0`

- Added a quick search to the File Tree that filters opened files, folders, and datasets.
- Added a preferences menu to customize the editing behavior and color theme. The preferences can be previewed in realtime, but can also be saved to the app-server so that they are applied every time the editor is opened.
- Added undo and redo menu items when editing a file

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
