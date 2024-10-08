
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

export const TEST_LANGUAGE_MENU = [{
  name: 'TEST_REPLACE',
  action: {
    functionString: `
                    console.log("My context=",context);
                    context.editor.model.setValue("GOODBYE TEXT");`, params: []
  }, keyMap: ''
},
{
  name: 'Crop',
  action: {
    functionString: `
                    const selection = context.editor.cursor.getSelection();
                    context.log.info('selection=',selection);
                    if (selection) {
                      context.editor.model.setValue(context.editor.model.getValueInRange(selection));
                    }`, params: []
  }, keyMap: ''
},
{
  name: 'Is Dataset?',
  action: {
    functionString: `
                    const model = context.controller.fetchActiveFile().model;
                    context.log.info('My model=',model);
                    const isDataset = model.isDataset;
                    const fullName = isDataset ? model.fileName : model.name;
                    context.controller.snackBar.open(isDataset ? fullName+' is a dataset!'
                                                     : fullName+' is NOT a dataset.', 'Close',
                                                     { duration: 3000, panelClass: 'center' });
                    `, params: []
  }, keyMap: ''
}
]

export const LANGUAGE_MENUS = {
  'jcl': [
    {
      name: 'Submit',
      isDisabledString: `
      const plugin = ZoweZLUX.pluginManager.getPlugin('org.zowe.explorer-jes');
      const file = context.controller.fetchActiveFile();
    if (!plugin || !file || (ZoweZLUX.uriBroker.serverRootUri('') == '/')) {
        return true;
      }
      return false;
      `,
      action: {
        /*
          TODO z/osmf has a jobs api, so this makes use of it for now. 
          But, we don't import that service into the editor, because it would make a hard requirement instead of an optional one.
          May want to have such metadata in plugindef, or perhaps this is an interface & capability to be searched up
        */
        functionString: `
        const file = context.controller.fetchActiveFile();
        if (file) {
          let content = context.editor.model.getValue();
          if (content && content.length > 0) {
            content = content.replace(/\\n/g,'\\\\n');
            const uri = '/api/v1/jobs/string';
            const stringJsonBody = '{ "jcl": "'+content+'"}';  
            fetch(uri, {method: 'POST', body: stringJsonBody,
                        credentials: 'include',
                        mode: 'cors',
                        headers:{ 'Content-Type': 'application/json'}})
              .then((response)=> {
                     if (!response.ok) {
                       throw new Error('Status: '+response.status+', '+response.statusText);
                     } else {
                       return response.json();
                     }
                   })
              .then((response)=> {
                     if (response.jobId && response.owner) {
                       file.model.jobId = response.jobId;
                       file.model.jobOwner = response.owner;
                       let ref = context.controller.snackBar.open('JCL Submitted. ID='+response.jobId,'View in Explorer', {duration: 5000, panelClass: 'center' })
                         .onAction().subscribe(()=> {
                           const dispatcher = ZoweZLUX.dispatcher;
                           const argumentFormatter = {data: {op:'deref',source:'event',path:['data']}};
                           let action = dispatcher.makeAction('org.zowe.editor.jcl.view', 'View JCL',
                                                              dispatcher.constants.ActionTargetMode.PluginFindAnyOrCreate,
                                                              dispatcher.constants.ActionType.Launch,'org.zowe.explorer-jes',argumentFormatter);
                           dispatcher.invokeAction(action,{'data':{'owner':file.model.jobOwner,'prefix':'*','jobId':file.model.jobId}});
                         });
                     } else {
                       context.controller.snackBar.open('Warning: JCL submitted but Job ID not found.', 'Dismiss', {duration: 5000, panelClass: 'center' });
                     }
                   })
              .catch(error=> context.controller.snackBar.open('Error submitting JCL: '+error.message, 'Dismiss', {duration: 5000, panelClass: 'center' }));
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
      isDisabledString: `
      const plugin = ZoweZLUX.pluginManager.getPlugin('org.zowe.explorer-jes');
      const file = context.controller.fetchActiveFile();
      if (plugin && file) {
        return !file.model.jobId;
      } else {
        return true;
      }
      `,
      action: {
        functionString: `
        const file = context.controller.fetchActiveFile();
        if (file) {
          const dispatcher = ZoweZLUX.dispatcher;
          const argumentFormatter = {data: {op:'deref',source:'event',path:['data']}};
          let action = dispatcher.makeAction('org.zowe.editor.jcl.view', 'View JCL',
                                             dispatcher.constants.ActionTargetMode.PluginFindAnyOrCreate,
                                             dispatcher.constants.ActionType.Launch,'org.zowe.explorer-jes',argumentFormatter);
          dispatcher.invokeAction(action,{'data':{'owner':file.model.jobOwner,'prefix':'*','jobId':file.model.jobId}});
        } else {
          context.controller.snackBar.open('Cannot find open file', 'Dismiss', {duration: 3000, panelClass: 'center' });
        }
        `,
        params: []
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
        name: 'Save As',
        action: {
          internalName: 'saveAsFile'
        },
        keyMap: 'Alt+S+Shift'
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
