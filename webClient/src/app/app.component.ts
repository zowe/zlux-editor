
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
              private appKeyboard: EditorKeybindingService) {
    this.log.debug(`Monaco object=`,(<any>window).monaco);
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

}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
