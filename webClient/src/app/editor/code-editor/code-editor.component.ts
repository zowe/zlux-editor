
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit, Input, ViewChild, ElementRef, Inject, Optional, OnDestroy } from '@angular/core';
import { Angular2InjectionTokens, Angular2PluginWindowEvents } from 'pluginlib/inject-resources';
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


@Component({
  selector: 'app-code-editor',
  templateUrl: './code-editor.component.html',
  styleUrls: ['./code-editor.component.scss']
})
export class CodeEditorComponent implements OnInit, OnDestroy {
  private openFileList: ProjectContext[];
  private noOpenFile: boolean;
  private subscription:Subscription = new Subscription();
  @ViewChild('monaco')
  monacoRef: ElementRef;

  //TODO load from configservice
  public options = {
    glyphMargin: true,
    lightbulb: {
      enabled: true
    },
    codeLense: true,
    iconsInSuggestions: true,
    minimap: {
      enabled: false
    },
    suggestOnTriggerCharacters: true,
    quickSuggestions: true,
    theme: 'vs-dark'
  };

  public editorFile: { context: ProjectContext, reload: boolean, line?: number };

  constructor(private httpService: HttpService,
    private editorControl: EditorControlService,
    private monacoService: MonacoService,
    private editorService: EditorService,
    private appKeyboard: EditorKeybindingService,
    @Optional() @Inject(Angular2InjectionTokens.WINDOW_EVENTS) private windowEvents: Angular2PluginWindowEvents,
    private codeEditorService: CodeEditorService) {
    if (this.windowEvents) {
      this.windowEvents.restored.subscribe(()=> {
        this.focusMonaco();
      });
    }
    //respond to the request to open
    this.editorControl.openFileEmitter.subscribe((fileNode: ProjectStructure) => {
      this.openFile(fileNode);
    });

    this.editorControl.openFileList.subscribe((list: ProjectContext[]) => {
      this.openFileList = list;
      list.length === 0 ? this.noOpenFile = true : this.noOpenFile = false;
    });

    this.editorControl.closeFile.subscribe((fileContext: ProjectContext) => {
      if (!this.noOpenFile && !this.isAnySelected()) {
        this.selectFile(this.openFileList[0], true);
      }
    });

    this.subscription.add(this.appKeyboard.keyupEvent.subscribe((event) => {
      if (event.altKey && event.which === KeyCode.KEY_T) {
        let fileContext = this.editorControl.fetchAdjToActiveFile();
        this.selectFile(fileContext, true);      
      } else if (event.altKey && event.which === KeyCode.KEY_W) {
        let fileContext = this.editorControl.fetchActiveFile();
        this.closeFile(fileContext);
      }
    }));

  }

  isAnySelected () {
    return this.openFileList.some(f=>f.active)
  }

  focusMonaco() {
    (this.monacoRef as any).focus();
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

  //TODO this is causing the error of nothing showing up when a tab is closed
  closeFile(fileContext: ProjectContext) {
    this.editorFile = undefined;
    this.codeEditorService.closeFile(fileContext);
  }

  /* 
     this.editorFile instructs monaco to change, 
     which in turn invokes monacoservice.openfile, 
     which kicks off discovery involving the editor controller   
  */
  selectFile(fileContext: ProjectContext, broadcast: boolean, line?: number) {
    this.codeEditorService.selectFile(fileContext, broadcast);
    this.editorFile = { context: fileContext, reload: false, line: line };
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
