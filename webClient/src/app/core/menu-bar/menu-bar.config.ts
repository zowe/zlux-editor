
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

export const LANGUAGE_MENUS = {
  'jcl': [
    {
      name: 'Submit',
      action: {
        functionString:`
        const file = context.controller.fetchActiveFile();
        if (file) {
          let content = context.controller.fetchActiveFile().model.contents + '\\n';
          if (content && content.length > 0) {
            content = content.replace(/\\n/g,'\\\\n');
            const uri = '/jes';
            const stringJsonBody = '{ "jcl": "'+content+'"}';
            fetch(uri, {method: 'PUT', body: stringJsonBody,
                        credentials: 'include',
                        mode: 'cors',
                        headers:{ 'Content-Type': 'application/json'}})
            .then((response)=> {
              if (!response.ok) {
                response.text().then(text => {
                  context.controller.snackBar.open('Error submitting JCL: ' + text + ', Status: ' + response.status, 'Dismiss', {duration: 5000, panelClass: 'center' })
                });
                } else {
                response.json().then((response) => {
                  if (response.jobId) {
                    file.model.jobId = response.jobId;
                    let ref = context.controller.snackBar.open('JCL Submitted. ID='+response.jobId,'View in Explorer', {duration: 5000, panelClass: 'center' })
                      .onAction().subscribe(()=> {
                        const dispatcher = ZoweZLUX.dispatcher;
                        const argumentFormatter = {data: {op:'deref',source:'event',path:['data']}};
                        let action = dispatcher.makeAction('org.zowe.editor.jcl.view', 'View JCL',
                                                            dispatcher.constants.ActionTargetMode.PluginFindAnyOrCreate,
                                                            dispatcher.constants.ActionType.Launch,'org.zowe.explorer-jes',argumentFormatter);
                        dispatcher.invokeAction(action,{'data':{'owner':'*','prefix':'*','jobId':file.model.jobId}});
                      });
                  } else {
                    context.controller.snackBar.open('Warning: JCL submitted but Job ID not found.', 'Dismiss', {duration: 5000, panelClass: 'center' });
                  }
                });
              }
            });
          }
        }
        `,
        params: []
      },
      keyMap: ''
    },
    {
      name: 'group-end'
    },
    {
      name: 'View Job',
      action: {
        functionString:`
        const file = context.controller.fetchActiveFile();
        if (file) {
          const dispatcher = ZoweZLUX.dispatcher;
          const argumentFormatter = {data: {op:'deref',source:'event',path:['data']}};
          let action = dispatcher.makeAction('org.zowe.editor.jcl.view', 'View JCL',
                                             dispatcher.constants.ActionTargetMode.PluginFindAnyOrCreate,
                                             dispatcher.constants.ActionType.Launch,'org.zowe.explorer-jes',argumentFormatter);
          dispatcher.invokeAction(action,{'data':{'owner':'*','prefix':'*','jobId':file.model.jobId}});
        } else {
          context.controller.snackBar.open('Cannot find open file', 'Dismiss', {duration: 3000, panelClass: 'center' });
        }
        `,
        params:[]
      },
      keyMap: ''
    }
  ]
}

export const MENU = [
    {
        name: 'File',
        children: [
            {
              name: 'New File',
              action: {
                internalName: 'createFile'
              },
              keyMap: 'Alt+N'
            },
            {
              name: 'Refresh File Content',
              action: {
                internalName: 'refreshFile'
              },
              keyMap: 'Alt+R+Shift'
            },
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
                },
                keyMap: 'Alt+O'
            },
            {
                name: 'Open Datasets',
                action: {
                    internalName: 'openDatasets'
                },
                keyMap: 'Alt+K'
            },
            {
                name: 'group-end'
            },
            {
                name: 'Save',
                action: {
                    internalName: 'saveFile'
                },
                keyMap: 'Ctrl+S'
            },   
            {
              name: 'group-end'
            },
            {
              name: 'Close All',
              action: {
                  internalName: 'closeAll'
              },
              keyMap: 'Alt+W+Shift'
            },        
            //{
            //    name: 'Save All',
            //    action: {
            //        internalName: 'saveAll'
            //    },
            //    keyMap: '[Ctrl+K S]'
            //},
        ],
    },
    {
        name: 'Edit',
        children: [
            {
                name: 'Preferences',
                action: {
                    internalName: 'showSettings'
                }
            }
        ]
    }
    // {
    //     name: 'Language Server',
    //     children: [
    //         {
    //             name: 'URL',
    //             action: {
    //                 internalName: 'languageServerSetting'
    //             }
    //         }
    //     ],
    // }
];

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
