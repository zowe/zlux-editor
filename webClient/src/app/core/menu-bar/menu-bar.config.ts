
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
export const MENU = [
    {
        name: 'File',
        children: [
            {
                name: 'New File',
                action: {
                    name: 'createFile',
                    params: [],
                },
                keyMap: '[Ctrl+N]',
            },
            {
                name: 'group-end'
            },
            // {
            //     name: 'Open Project',
            //     action: {
            //         name: 'openProject',
            //         params: [],
            //     },
            // },
            {
                name: 'Open Directory',
                action: {
                    name: 'openDirectory',
                    params: [],
                },
            },
            {
                name: 'group-end'
            },
            {
                name: 'Save',
                action: {
                    name: 'saveFile',
                    params: [],
                },
                keyMap: '[Ctrl+Alt+S]',
            },
            {
                name: 'Save All',
                action: {
                    name: 'saveAll',
                    params: [],
                },
                keyMap: '[Ctrl+S]',
            },
        ],
    },
    {
        name: 'Language Server',
        children: [
            {
                name: 'URL',
                action: {
                    name: 'languageServerSetting',
                    params: [],
                }
            }
        ],
    },
    {
        name: 'Help',
        children: [
            {
                name: 'About Zowe Editor',
                action: {
                    name: 'aboutUS',
                    params: [],
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
