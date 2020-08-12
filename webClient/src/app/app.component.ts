
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, Inject, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';
import { EditorControlService } from './shared/editor-control/editor-control.service';
import { HttpService } from './shared/http/http.service';
import { DataAdapterService } from './shared/http/http.data.adapter.service';
import { UtilsService } from './shared/utils.service';
import { EditorKeybindingService } from './shared/editor-keybinding.service';
import * as monaco from 'monaco-editor';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: [
              '../styles.scss',
    './app.component.scss'
              ]
})
export class AppComponent {
  title = 'app';

  @ViewChild('editorheader')
  editorheaderElementRef: ElementRef<any>;
  
  constructor(@Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger,
              @Inject(Angular2InjectionTokens.LAUNCH_METADATA) private launchMetadata: any,
              private dataAdapter: DataAdapterService,
              private httpService: HttpService,
              private utils: UtilsService,
              private editorControl: EditorControlService,
              private appKeyboard: EditorKeybindingService,
              @Inject(Angular2InjectionTokens.PLUGIN_DEFINITION) private pluginDefinition: ZLUX.ContainerPluginDefinition,
              private HTTP: HttpClient) {
    this.log.debug(`Monaco object=`,monaco);
    let openWindowsStorageString : string = window.localStorage.getItem("org.zowe.editor-openWindows")
    let activeZluxEditorsCount : number
    let dataToSave : string
    if(openWindowsStorageString){
      (+window.localStorage.getItem("ZoweZLUX.lastActive") - +openWindowsStorageString.split(":")[1]) < +window.localStorage.getItem("ZoweZLUX.expirationTime") ? activeZluxEditorsCount = +openWindowsStorageString.split(":")[0] + 1 : activeZluxEditorsCount = 1
    }else{
      activeZluxEditorsCount = 1
    }
    dataToSave = activeZluxEditorsCount.toString() + ":" + Date.now() 
    window.localStorage.setItem("org.zowe.editor-openWindows",dataToSave)
    window.addEventListener("beforeunload", () => { 
      activeZluxEditorsCount = +window.localStorage.getItem("org.zowe.editor-openWindows").split(":")[0]
      activeZluxEditorsCount - 1 > -1 ? activeZluxEditorsCount-- : activeZluxEditorsCount = 0;
      dataToSave = activeZluxEditorsCount.toString() + ":" + Date.now() 
      localStorage.setItem("org.zowe.editor-openWindows",dataToSave)
    });
    if(activeZluxEditorsCount < 2){
      let plugin : ZLUX.Plugin = this.pluginDefinition.getBasePlugin()
      let filePath : string = 'ui/openTabs'
      let fileName : string = 'fileList'
      this.HTTP.get<any>(ZoweZLUX.uriBroker.pluginConfigUri(plugin,filePath,fileName)).subscribe(res => {
        if(res){
          this.editorControl.numberOfTabsToRestore = res.contents.files.length - 1
          res.contents.files.forEach(file => {
            if(file[0] == '/' && file.startsWith("//'") == false){
              file = file.slice(1);
            }
            this.handleLaunchOrMessageObject({'type':'openFile','name':file});
          });
        }
      });
    }
  }

  ngOnInit() {
    if (this.launchMetadata && this.launchMetadata.data && this.launchMetadata.data.type) {
      this.handleLaunchOrMessageObject(this.launchMetadata.data);
    }

    const editorheaderElement = this.editorheaderElementRef.nativeElement;
    this.appKeyboard.registerKeyUpEvent(editorheaderElement);
  }

  handleLaunchOrMessageObject(data: any) {
    switch (data.type) {
    case 'test-language':
      this.log.info(`Setting language test mode`);
      this.editorControl._isTestLangMode = true;
      break;
    case 'openFile':
      //TODO should this or must this also load the directory at the time that the file is
      let lastSlash = data.name.lastIndexOf("/");
      let firstSlash = data.name.indexOf("/");
      if (lastSlash == data.name.length-1) { 
        this.log.warn(`Ignoring opening invalid file or dataset name=${data.name}`);
        return;
      }
      let isDataset = false;
      if (data.name.startsWith("//'") && data.name.charAt(data.name.length-1) == "'") {
        isDataset = true;
        data.name = data.name.substring(3,data.name.length-1);
      }      
//      let parenIsLast = data.name.lastIndexOf(")") == data.name.length-1;
//      let openParen = data.name.indexOf("(");
//      let hasSlash = lastSlash != -1;
//      if (hasSlash && parenIsLast && openParen != -1 && firstSlash > openParen) {
      let nodeData;
      if (!isDataset) {
        let uri = ZoweZLUX.uriBroker.unixFileUri('contents', data.name.substring(0,lastSlash));
        this.log.debug(`I will be executing uri=${uri}, and looking for filename=${data.name.substring(lastSlash+1)}`);
        this.httpService.get(uri)
          .subscribe((response: any) => {
            let nodes = this.dataAdapter.convertDirectoryList(response);
            this.editorControl.setProjectNode(nodes);
            let fileName = data.name.substring(lastSlash+1);
            for (let i = 0; i < nodes.length; i++) {
              if (nodes[i].fileName == fileName) {
                this.editorControl.openFile('', nodes[i]).subscribe(x => {
                  this.log.debug(`file loaded through app2app.`);
                  this.editorControl.numberOfTabsToRestore - 1 > -1 ? this.editorControl.numberOfTabsToRestore-- : this.editorControl.numberOfTabsToRestore = 0
                });
              }
            }
          }, e => {
            let error = e.json().error;
//            this.snackBarService.open(`Directory ${dirName} does not exist!`, 'Close', { duration: 2000, panelClass: 'center' });
          });
      } else {
        this.log.info(`Opening dataset=${data.name}`);
        this.editorControl.openDataset.next(data.name);
      }
      break;
    case 'openDataset':
      if (data.name) {
        this.log.info(`Opening dataset=${data.name}`);
        this.editorControl.openDataset.next(data.name);
      } else {
        this.log.warn(`Dataset name missing. Skipping operation`);
      }
      break;
    case 'openDir':
      this.editorControl.loadDirectory(data.name);
      break;
    case 'openDSList':
      this.editorControl.loadDirectory(data.name);      
      break;
    default:
      this.log.warn(`Unknown command (${data.type}) given in launch metadata.`);
    }
  }
  

    /* I expect a JSON here*/
  zluxOnMessage(eventContext: any): Promise<any> {
    return new Promise((resolve,reject)=> {
      if (eventContext != null && eventContext.data != null && eventContext.data.type != null) {
        resolve(this.handleLaunchOrMessageObject(eventContext.data));
      } else {
        let msg = 'Event context missing or malformed';
        this.log.warn('onMessage '+msg);
        return reject(msg);
      }
    });
  }

  
  provideZLUXDispatcherCallbacks(): ZLUX.ApplicationCallbacks {
    return {
      onMessage: (eventContext: any): Promise<any> => {
        return this.zluxOnMessage(eventContext);
      }      
    }
  }

  ngOnDestroy(){
    let activeZluxEditors : number  = +window.localStorage.getItem("org.zowe.editor-openWindows").split(":")[0]
    activeZluxEditors - 1 > -1 ? activeZluxEditors-- : activeZluxEditors = 0;
    let dataToSave = activeZluxEditors.toString() + ":" + Date.now() 
    window.localStorage.setItem("org.zowe.editor-openWindows",dataToSave)
  }

}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
