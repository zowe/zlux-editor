
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

export const TEST_LANGUAGE_MENU = [{name:'TEST_REPLACE',
                  action: {
                    functionString:`
                    console.log("My context=",context);
                    context.editor.model.setValue("GOODBYE TEXT");`, params:[]}, keyMap: ''},
                 {name:'Crop',
                  action: {
                    functionString:`
                    const selection = context.editor.cursor.getSelection();
                    context.log.info('selection=',selection);
                    if (selection) {
                      context.editor.model.setValue(context.editor.model.getValueInRange(selection));
                    }`, params:[]}, keyMap: ''},
                 {name:'Is Dataset?',
                  action: {
                    functionString:`
                    const model = context.controller.fetchActiveFile().model;
                    context.log.info('My model=',model);
                    const isDataset = model.isDataset;
                    const fullName = isDataset ? model.fileName : model.name;
                    context.controller.snackBar.open(isDataset ? fullName+' is a dataset!'
                                                     : fullName+' is NOT a dataset.', 'Close',
                                                     { duration: 3000, panelClass: 'center' });
                    `, params:[]}, keyMap: ''}
                ]


export const MENU = [
    {
        name: 'File',
        children: [
            {
              name: 'New File',
              action: {
                internalName: 'createFile'
              },
              keyMap: '' // [Ctrl+N] won't work due to browser conflicts. Keybindings will need
            },              // to be rethinked.
            {
              name: 'group-end'
            },
          // {
          //     name: 'Open Project',
          //     action: {
          //       internalName: 'openProject'
          //     }
          // },
            {
                name: 'Open Directory',
                action: {
                    internalName: 'openDirectory'
                }
            },
            {
                name: 'Open Datasets',
                action: {
                    internalName: 'openDatasets'
                }
            },
            {
                name: 'group-end'
            },
            {
                name: 'Save',
                action: {
                    internalName: 'saveFile'
                },
                keyMap: '' // [Ctrl+S] won't work due to browser conflicts. Keybindings will need
            },              // to be rethinked.
            //{
            //    name: 'Save All',
            //    action: {
            //        internalName: 'saveAll'
            //    },
            //    keyMap: '[Ctrl+S]'
            //},
            {
                name: 'group-end'
            },
            {
                name: 'Delete File',
                action: {
                    internalName: 'deleteFile'
                },
                keyMap: '' // [Ctrl+N] won't work due to browser conflicts. Keybindings will need
            },              // to be rethinked.
        ],
    },
    {
        name: 'Language Server',
        children: [
            {
                name: 'URL',
                action: {
                    internalName: 'languageServerSetting'
                }
            }
        ],
    }
];

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
