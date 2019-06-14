
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

  private openFileList: ProjectContext[];
  private noOpenFile: boolean;

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
    private codeEditorService: CodeEditorService) {
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

  }

  isAnySelected () {
    return this.openFileList.some(f=>f.active)
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

  selectFile(fileContext: ProjectContext, broadcast: boolean, line?: number) {
    this.editorFile = { context: fileContext, reload: false, line: line };
    this.codeEditorService.selectFile(fileContext, broadcast);
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
