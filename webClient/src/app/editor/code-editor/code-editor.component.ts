
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit, Input, ViewChild, ElementRef, Inject, Optional, OnDestroy } from '@angular/core';
import { Angular2InjectionTokens, Angular2PluginWindowEvents, Angular2PluginWindowActions } from 'pluginlib/inject-resources';
import { Response } from '@angular/http';
import { EditorControlService } from '../../shared/editor-control/editor-control.service';
import { HttpService } from '../../shared/http/http.service';
import { ENDPOINTS } from '../../../environments/environment';
import { MonacoService } from './monaco/monaco.service';
import { ProjectStructure } from '../../shared/model/editor-project';
import { EditorService } from '../editor.service';
import { ProjectContext, ProjectContextType } from '../../shared/model/project-context';
import { CodeEditorService } from './code-editor.service';
import { EditorKeybindingService } from '../../shared/editor-keybinding.service';
import { KeyCode } from '../../shared/keycode-enum';
import { Subscription } from 'rxjs/Rx';
import {HttpClient} from '@angular/common/http';
import { connect } from 'net';

const DEFAULT_TITLE = 'Editor';

@Component({
  selector: 'app-code-editor',
  templateUrl: './code-editor.component.html',
  styleUrls: ['./code-editor.component.scss']
})
export class CodeEditorComponent implements OnInit, OnDestroy {
  private openFileList: ProjectContext[];
  private noOpenFile: boolean;
  private keyBindingSub:Subscription = new Subscription();
  @ViewChild('monaco')
  monacoRef: ElementRef;

  public showSettings: boolean = false;
  public settingsOpen: boolean = false;

  public options;
  /*
    = {
    glyphMargin: true,
    lightbulb: {
      enabled: true
    },
    lineNumbers: true,
    codeLense: true,
    iconsInSuggestions: true,
    minimap: {
      enabled: false
    },
    suggestOnTriggerCharacters: true,
    quickSuggestions: true,
    theme: 'vs-dark'
  };
  */

  public editorFile: { context: ProjectContext, reload: boolean, line?: number };

  /* TODO: This can be extended to persist in future server storage mechanisms. 
  (For example, when a user re-opens the Editor they are plopped back into their workflow of tabs) */
  private previousSessionData: any = {};

  constructor(private httpService: HttpService,
    private http: HttpClient,
    private editorControl: EditorControlService,
    private monacoService: MonacoService,
    private editorService: EditorService,
    private appKeyboard: EditorKeybindingService,
    private editorControlService: EditorControlService,
    @Optional() @Inject(Angular2InjectionTokens.WINDOW_EVENTS) private windowEvents: Angular2PluginWindowEvents,
    @Optional() @Inject(Angular2InjectionTokens.WINDOW_ACTIONS) private windowActions: Angular2PluginWindowActions,
    @Inject(Angular2InjectionTokens.PLUGIN_DEFINITION) private pluginDefinition: ZLUX.ContainerPluginDefinition,
    private codeEditorService: CodeEditorService) {
      
    if (this.windowEvents) {
      this.windowEvents.restored.subscribe(()=> {
        this.focus();
      });
    }
    this.http.get<any>(ZoweZLUX.uriBroker.pluginConfigForScopeUri(this.pluginDefinition.getBasePlugin(),'user','monaco','editorconfig.json')).subscribe((response: any) => {
      if (response && response.contents && response.contents.config) {
        this.options = response.contents.config;
      }
    });
    
    //respond to the request to open
    this.editorControl.openFileEmitter.subscribe((fileNode: ProjectStructure) => {
      if (this.settingsOpen && this.showSettings) {
        this.showSettings = false;
        if (this.monacoRef) {
          (this.monacoRef as any).focus();
          (this.monacoRef as any).layout();
        }
      }
      this.openFile(fileNode);
      this.editorControlService.updateBottomBar.next(fileNode);
      this.editorControl.editor.getValue().layout();      
    });

    this.editorControlService.updateBottomBar.subscribe((fileNode: ProjectStructure) => {
     
      
      
      document.getElementById('encoding').innerHTML = editorControlService.getStringEncoding(fileNode.encoding);
      document.getElementById('ext').innerHTML = editorControlService.GetExtInfo();
      document.getElementById('lang').innerHTML = editorControlService.GetLangInfo();
    });

    this.editorControl.openFileList.subscribe((list: ProjectContext[]) => {
      this.openFileList = list;
      list.length === 0 ? this.noOpenFile = true : this.noOpenFile = false;
      // update editor title
      this.updateEditorTitle();
    });

    this.editorControl.closeFile.subscribe((fileContext: ProjectContext) => {
      this.handleCloseFile(fileContext);
    });

    this.editorControl.undoCloseFile.subscribe(() => {
      if (this.previousSessionData.noOpenFile) {
        this.noOpenFile = this.previousSessionData.noOpenFile;
      }
      if (this.previousSessionData.editorFile) {
        this.editorFile = this.previousSessionData.editorFile;

        this.editorFile.context.active = true;
        this.editorFile.context.opened = true;

        this.selectFile(this.editorFile.context, true);
        this.editorControl.openFileHandler(this.editorFile.context);
      }
      this.updateEditorTitle();
    })

    this.editorControl.closeAllFiles.subscribe(() => {
      this.previousSessionData.noOpenFile = this.noOpenFile;
      this.previousSessionData.editorFile = this.editorFile;

      this.noOpenFile = true;
      this.editorFile = undefined; 
      this.updateEditorTitle();
    })

    this.editorControl.undoCloseAllFiles.subscribe(() => {
      if (this.previousSessionData.noOpenFile) {
        this.noOpenFile = this.previousSessionData.noOpenFile;
      }
      if (this.previousSessionData.editorFile) {
        this.editorFile = this.previousSessionData.editorFile;

        this.editorFile.context.active = true;
        this.editorFile.context.opened = true;

        this.selectFile(this.editorFile.context, true);
        this.editorControl.openFileHandler(this.editorFile.context);
      }
      this.updateEditorTitle();
    })

    this.editorControl.openSettings.subscribe(() => {
      if (!this.settingsOpen) {
        this.showSettings = true;
        this.settingsOpen = true;
        this.openFileList.push({
          type: ProjectContextType.menu,
          name: "Settings",
          id: "org.zowe.editor.settings",
          model: {
            id: "org.zowe.editor.settings",
            name: "Settings",
            hasChildren: false,
            isDataset: false
          },
          opened: true,
          active: true, //TODO what happens to previously active file
          changed: false        
        });
      }
    });
    this.editorControl.closeSettings.subscribe(() => {
      if (this.settingsOpen) {
        this.showSettings = false;
        this.settingsOpen = false;
        for (let i = 0; i < this.openFileList.length; i++) {
          if (this.openFileList[i].id == 'org.zowe.editor.settings') {
            this.openFileList.splice(i, 1);
          }
        }
      }
    });

    this.keyBindingSub.add(this.appKeyboard.keydownEvent.subscribe((event) => {
      if (event.which === KeyCode.KEY_T && event.ctrlKey) {
        this.editorControl.undoCloseFile.next();
      }
    }));

    this.keyBindingSub.add(this.appKeyboard.keyupEvent.subscribe((event) => {
      if (event.which === KeyCode.PAGE_DOWN || event.which === KeyCode.PERIOD) {
        let fileContext = this.editorControl.fetchRightOfActiveFile();
        this.selectFile(fileContext, true);      
      } else if (event.which === KeyCode.PAGE_UP || event.which === KeyCode.COMMA) {
        let fileContext = this.editorControl.fetchLeftOfActiveFile();
        this.selectFile(fileContext, true);      
      } else if (event.which === KeyCode.KEY_W && !event.shiftKey) { // Separate keybinding for "close all"
        let fileContext = this.editorControl.fetchActiveFile();
        this.closeFile(fileContext);
        setTimeout(()=> {
          this.editorControl.getFocus();
        });
      }
    }));

  }

  setOptions(options: any) {
    if (typeof options == 'object') {
      this.options = options;
    }
  }
  
  updateEditorTitle():void {
    if(this.noOpenFile) {
      this.setTitle();
      return;
    } 

    const fileContext = this.getActiveFile();
    if(fileContext) {
      this.setTitle(fileContext.name);
    } else {
      this.setTitle();
    }
  }

  getActiveFile() {
    return this.openFileList.find(f=>f.active);
  }

  isAnySelected () {
    return typeof(this.getActiveFile()) != "undefined";
  }

  focus() {
    if (!this.showSettings) {
      (this.monacoRef as any).focus();
    }
  }

  ngOnInit() { }

  openFile(fileNode: ProjectStructure) {
    // get file context
    let fileContext = this.editorControl.fetchFileContext(fileNode);
    if (!fileContext) { fileContext = <ProjectContext>this.editorControl.generateProjectContext(fileNode); }

    // below logic is nothing to do with code editor (monaco)
    // check if the file user want to open is already opened
    let exist = false;

    for (const file of this.editorControl.openFileList.getValue()) {
      if (file.name === fileContext.name && file.model.path === fileContext.model.path) {
        exist = true;
      }
    }

    if (exist) {
      this.selectFile(fileContext, false, fileNode.line);
    } else {
      // pass file structure to specific code editor (monaco)
      // trigger code-editor change, let code editor open file
      this.editorFile = { context: fileContext, reload: true, line: fileContext.model.line || fileNode.line };
      this.editorControl.openFileHandler(fileContext);
    }

  }

  private handleCloseFile(fileContext: ProjectContext) {
    this.previousSessionData.noOpenFile = this.noOpenFile;
    this.previousSessionData.editorFile = this.editorFile;
    this.previousSessionData.openFileList = this.openFileList;

    if (!this.noOpenFile && !this.isAnySelected()) {
      this.selectFile(this.openFileList[0], true);
    }
  }

  ToggleTree() 
    {
      this.editorControl.toggleTree.next();
    }

  closeFile(fileContext: ProjectContext) {
    if (fileContext.type == ProjectContextType.menu) {
      this.editorControl.closeSettings.next();
      this.handleCloseFile(fileContext);
      let nextFileContext = this.editorControl.fetchActiveFile();
      this.selectFile(nextFileContext, true);
    } else {
      this.codeEditorService.closeFile(fileContext);
    }
  }


  /* 
     this.editorFile instructs monaco to change, 
     which in turn invokes monacoservice.openfile, 
     which kicks off discovery involving the editor controller   
  */
  selectFile(fileContext: ProjectContext, broadcast: boolean, line?: number) {
    if (fileContext.type != ProjectContextType.menu) { //TODO revisit for other types
      this.showSettings = false;
      this.codeEditorService.selectFile(fileContext, broadcast);
    } else {
      this.showSettings = true;
      this.editorControl.selectMenu.next(fileContext);
    }
    this.editorFile = { context: fileContext, reload: false, line: line };
    this.updateEditorTitle();
    this.editorControlService.updateBottomBar.next(fileContext.model);
  }

  refreshFile(fileContext: ProjectContext, broadcast: boolean, line?: number) {
    if (fileContext.type != ProjectContextType.menu) { //TODO revisit for other types
      this.monacoService.refreshFile(fileContext, broadcast, line)
      this.editorControlService.updateBottomBar.next(fileContext.model);
      // We don't want to kick off openfile from the editor controller, so talk to monaco directly
    }
  }

  setTitle(title?:String):void {
    let newTitle = DEFAULT_TITLE; 
    if(title) {
      newTitle = title + ' - ' + newTitle;
    }

    // for multiple app mode
    if (this.windowActions) {
      this.windowActions.setTitle(newTitle);
    } else {
      // for single app mode
      document.title = newTitle;
    }
  }

  ngOnDestroy():void {
    this.keyBindingSub.unsubscribe();
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
