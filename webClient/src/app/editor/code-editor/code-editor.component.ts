
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit, Input } from '@angular/core';
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
@Component({
  selector: 'app-code-editor',
  templateUrl: './code-editor.component.html',
  styleUrls: ['./code-editor.component.scss']
})
export class CodeEditorComponent implements OnInit {
  private openBufferList: ProjectContext[];
  private noOpenBuffer: boolean;

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
    private codeEditorService: CodeEditorService) {
    //respond to the request to open
    this.editorControl.openFileEmitter.subscribe((bufferNode: ProjectStructure) => {
      this.openBuffer(bufferNode);
    });

    this.editorControl.openFileList.subscribe((list: ProjectContext[]) => {
      this.openBufferList = list;
      list.length === 0 ? this.noOpenBuffer = true : this.noOpenBuffer = false;
    });

    this.editorControl.closeFile.subscribe((bufferContext: ProjectContext) => {
      if (!this.noOpenBuffer && !this.isAnySelected()) {
        this.selectBuffer(this.openBufferList[0], true);
      }
    });

  }

  isAnySelected () {
    return this.openBufferList.some(f=>f.active)
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
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
