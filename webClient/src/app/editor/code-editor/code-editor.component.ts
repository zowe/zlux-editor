
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
import { NgxEditorModel } from 'ngx-monaco-editor';
import { EditorControlService } from '../../shared/editor-control/editor-control.service';
import { HttpService } from '../../shared/http/http.service';
import { ENDPOINTS } from '../../../environments/environment';
import { MonacoService } from './monaco/monaco.service';
import { ProjectStructure } from '../../shared/model/editor-project';
import { EditorService } from '../editor.service';
import { ProjectContext } from '../../shared/model/project-context';
import { CodeEditorService } from './code-editor.service';
import { EditorKeybindingService } from '../../shared/editor-keybinding.service';
import { KeyCode } from '../../shared/keycode-enum';
import { Subscription } from 'rxjs/Rx';

const DEFAULT_TITLE = 'Editor';

@Component({
  selector: 'app-code-editor',
  templateUrl: './code-editor.component.html',
  styleUrls: ['./code-editor.component.scss']
})

export class CodeEditorComponent implements OnInit, OnDestroy {
  private openBufferList: ProjectContext[];
  private noOpenBuffer: boolean;
  private subscription:Subscription = new Subscription();
  @ViewChild('monaco')
  monacoRef: ElementRef;

  //TODO load from configservice
  public options = {
    glyphMargin: true,
    lightbulb: {
      enabled: true
    },
    rulers: [],
    codeLense: true,
    iconsInSuggestions: true,
    minimap: {
      enabled: false
    },
    suggestOnTriggerCharacters: true,
    quickSuggestions: true,
    theme: 'vs-dark'
  };

  public editorBuffer: { context: ProjectContext, reload: boolean, line?: number };

  constructor(private httpService: HttpService,
    private editorControl: EditorControlService,
    private monacoService: MonacoService,
    private editorService: EditorService,
    private appKeyboard: EditorKeybindingService,
    @Optional() @Inject(Angular2InjectionTokens.WINDOW_EVENTS) private windowEvents: Angular2PluginWindowEvents,
    @Optional() @Inject(Angular2InjectionTokens.WINDOW_ACTIONS) private windowActions: Angular2PluginWindowActions,
    private codeEditorService: CodeEditorService) {
    if (this.windowEvents) {
      this.windowEvents.restored.subscribe(()=> {
        this.focusMonaco();
      });
    }
    //respond to the request to open
    this.editorControl.openFileEmitter.subscribe((bufferNode: ProjectStructure) => {
      this.openBuffer(bufferNode);
    });

    this.editorControl.openFileList.subscribe((list: ProjectContext[]) => {
      this.openBufferList = list;
      list.length === 0 ? this.noOpenBuffer = true : this.noOpenBuffer = false;
      // update editor title
      this.updateEditorTitle();
    });

    this.editorControl.closeFile.subscribe((bufferContext: ProjectContext) => {
      if (!this.noOpenBuffer && !this.isAnySelected()) {
        this.selectBuffer(this.openBufferList[0], true);
      }
    });

    this.subscription.add(this.appKeyboard.keyupEvent.subscribe((event) => {
      if (event.altKey && event.which === KeyCode.KEY_T) {
        let fileContext = this.editorControl.fetchAdjToActiveFile();
        this.selectBuffer(fileContext, true);      
      } else if (event.altKey && event.which === KeyCode.KEY_W) {
        let fileContext = this.editorControl.fetchActiveFile();
        this.closeBuffer(fileContext);
      }
    }));

  }

  updateEditorTitle():void {
    if(this.noOpenBuffer) {
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
    return this.openBufferList.find(f=>f.active);
  }

  isAnySelected () {
    return this.openBufferList.some(f=>f.active)
  }

  focusMonaco() {
    (this.monacoRef as any).focus();
  }

  ngOnInit() { }

  openBuffer(bufferNode: ProjectStructure) {
    // get buffer context
    let bufferContext = this.editorControl.fetchFileContext(bufferNode);
    if (!bufferContext) { bufferContext = <ProjectContext>this.editorControl.generateProjectContext(bufferNode); }

    // below logic is nothing to do with code editor (monaco)
    // check if the buffer user want to open is already opened
    let exist = false;

    for (const buffer of this.editorControl.openFileList.getValue()) {
      if (buffer.name === bufferContext.name && buffer.model.path === bufferContext.model.path) {
        exist = true;
      }
    }

    if (exist) {
      this.selectBuffer(bufferContext, false, bufferNode.line);
    } else {
      // pass buffer structure to specific code editor (monaco)
      // trigger code-editor change, let code editor open buffer
      this.editorBuffer = { context: bufferContext, reload: true, line: bufferContext.model.line || bufferNode.line };
      this.editorControl.openFileHandler(bufferContext);
    }
    
  }

  //TODO this is causing the error of nothing showing up when a tab is closed
  closeBuffer(bufferContext: ProjectContext) {
    this.editorBuffer = undefined;
    this.codeEditorService.closeBuffer(bufferContext);
  }

  /* 
     this.editorBuffer instructs monaco to change, 
     which in turn invokes monacoservice.openbuffer, 
     which kicks off discovery involving the editor controller   
  */
  selectBuffer(bufferContext: ProjectContext, broadcast: boolean, line?: number) {
    this.codeEditorService.selectBuffer(bufferContext, broadcast);
    this.editorBuffer = { context: bufferContext, reload: false, line: line };
    this.updateEditorTitle();
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
    this.subscription.unsubscribe();
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
