
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Injectable } from '@angular/core';
import { ENDPOINTS } from '../../../../environments/environment';
import { HttpService } from '../../../shared/http/http.service';
import { ProjectStructure } from '../../../shared/model/editor-project';
import { ProjectContext } from '../../../shared/model/project-context';
import { EditorControlService } from '../../../shared/editor-control/editor-control.service';
import 'rxjs/add/operator/map';
import { UtilsService } from '../../../shared/utils.service';
import { DataAdapterService } from '../../../shared/http/http.data.adapter.service';
import { Http } from '@angular/http';
import { Observable } from '../../../../../node_modules/rxjs/Observable';
import { MatDialog } from '@angular/material';
import { SaveToComponent } from '../../../shared/dialog/save-to/save-to.component';

@Injectable()
export class MonacoService {

  private decorations: string[] = [];

  constructor(
    private httpService: HttpService,
    private http: Http,
    private dataAdapter: DataAdapterService,
    private editorControl: EditorControlService,
    private dialog: MatDialog,
    private utils: UtilsService
  ) {
    this.editorControl.closeFile.subscribe((fileContext: ProjectContext) => {
      this.closeFile(fileContext);
    });

    this.editorControl.changeLanguage.subscribe(e => {
      let openList = this.editorControl.openFileList.getValue();
      if (openList.length > 0) {
        // get monaco modal
        const _context: ProjectContext = e.context;
        const _editor = this.editorControl.editorCore.getValue().editor;
        const _modal = _editor.getModel(this.generateUri(_context.model));

        _context.model.language = e.language;
        this.editorControl.editorCore.getValue().editor.setModelLanguage(_modal, e.language);
      }
    });

    this.editorControl.saveAllFile.subscribe(() => {
      this.saveAllFile();
    });
  }

  openFile(fileNode: ProjectContext, reload: boolean, line?: number) {
    if (fileNode.temp) {
      this.setMonacoModel(fileNode, <{ contents: string, language: string }>{ contents: '', language: '' }).subscribe(() => {
        this.editorControl.fileOpened.next({ buffer: fileNode, file: fileNode.name });
        if (line) {
          this.editorControl.editor.getValue().revealPosition({ lineNumber: line, column: 0 });
          this.decorations.push(this.editorControl.editor.getValue().deltaDecorations([], [
            { range: new monaco.Range(line, 100, line, 100), options: { isWholeLine: true, inlineClassName: 'highlight-line' } },
          ])[0]);
          // this.editor.getValue().colorizeModelLine(newModel, fileNode.model.line);
        }
      });
    } else {
      let requestUrl: string;
      let filePath = ['/', '\\'].indexOf(fileNode.model.path.substring(0, 1)) > -1 ? fileNode.model.path.substring(1) : fileNode.model.path;
      let _observable;

      if (reload) {
        // let parentName = fileNode.parent ? fileNode.parent.name : fileNode.model.parent;
        // requestUrl = this.utils.formatUrl(ENDPOINTS.file, { dataset: parentName, member: fileNode.name });
        // this.httpService.get(requestUrl).subscribe((response: any) => {
        if (fileNode.model.isDataset) {
          requestUrl = this.utils.formatUrl(ENDPOINTS.datasetContents, { dataset: filePath });        
          _observable = this.http.get(requestUrl).map((res: any) => this.dataAdapter.convertDatasetContent(res._body));
        } else {
          requestUrl = this.utils.formatUrl(ENDPOINTS.openUnixFile, { directory: filePath, file: fileNode.model.fileName });        
          _observable = this.http.get(requestUrl).map((res: any) => this.dataAdapter.convertFileContent(res._body));
        }

      } else {
        _observable = new Observable((obs) => obs.next({ contents: fileNode.model.contents }));
      }
      _observable.subscribe((response: any) => {
        const resJson = response;
        this.setMonacoModel(fileNode, <{ contents: string, language: string }>resJson).subscribe(() => {
          this.editorControl.fileOpened.next({ buffer: fileNode, file: fileNode.name });
          if (line) {
            this.editorControl.editor.getValue().revealPosition({ lineNumber: line, column: 0 });
            this.decorations.push(this.editorControl.editor.getValue().deltaDecorations([], [
              { range: new monaco.Range(line, 100, line, 100), options: { isWholeLine: true, inlineClassName: 'highlight-line' } },
            ])[0]);
            // this.editor.getValue().colorizeModelLine(newModel, fileNode.model.line);
          }
        });
      });
    }
  }

  setMonacoModel(fileNode: ProjectContext, file: { contents: string, language: string }): Observable<void> {
    return new Observable((obs) => {
      const _editor = this.editorControl.editorCore.getValue().editor;
      fileNode.model.contents = file['contents'];
      this.editorControl.getRecommendedHighlightingModesForBuffer(fileNode).subscribe((supportLanguages: string[]) => {
        let fileLang = 'plaintext';
        if (file['language']) {
          fileLang = file['language'];
        } else if (fileNode.model.language) {
          fileLang = fileNode.model.language;
        } else if (supportLanguages[0]) {
          fileLang = supportLanguages[0];
        }
        // sync language to context
        fileNode.model.language = fileLang;
        const model = {
          value: file['contents'],
          language: fileLang,
          // language: 'json',
          uri: this.generateUri(fileNode.model),
        };
        const duplicate: boolean = this.fileDuplicateChecker(model.uri);
        let newModel;
        if (!duplicate) {
          newModel = _editor.createModel(model.value, model.language, model.uri);
        } else {
          newModel = _editor.getModel(model.uri);
        }
        newModel.onDidChangeContent((e: any) => {
          this.fileContentChangeHandler(e, fileNode, newModel);
        });
        this.editorControl.editor.getValue().setModel(newModel);
        obs.next();
      });
    });
  }

  closeFile(fileNode: ProjectContext) {
    const _editor = this.editorControl.editorCore.getValue().editor;
    const models = _editor.getModels();
    const fileUri = this.generateUri(fileNode.model);
    for (const model of models) {
      if (model.uri === fileUri) {
        model.dispose();
      }
    }
  }

  saveFile(fileContext: ProjectContext): Observable<void> {
    return new Observable((obs) => {
      if (!fileContext.temp) {
        this.editorControl.saveBuffer(fileContext, null).subscribe(() => obs.next());
      } else {
        let saveRef = this.dialog.open(SaveToComponent, {
          width: '500px',
          data: { file: fileContext.name }
        });
        saveRef.afterClosed().subscribe(result => {
          if (result) {
            this.editorControl.saveBuffer(fileContext, result).subscribe(() => obs.next());
          }
        });
      }
    });
  }

  saveAllFile() {
    let unsavedFile = this.editorControl.openFileList.getValue().filter((file: ProjectContext) => file.changed);
    // if (unsavedFile[0]) {
    //   let sub = this.saveFile(unsavedFile[0]).subscribe(() => {
    //     sub.unsubscribe();
    //     this.saveAllFile();
    //   });
    // }
    for (let file of unsavedFile) {
      let sub = this.saveFile(file).subscribe(() => {
        sub.unsubscribe();
      });
    }
  }

  generateUri(editorFile: ProjectStructure): string {
    // have to use lowercase here!
    return `inmemory://${editorFile.name.toLowerCase()}/${editorFile.id}`;
  }

  fileDuplicateChecker(uri: string): boolean {
    const models = this.editorControl.editorCore.getValue().editor.getModels();
    for (const model of models) {
      if (model.uri === uri) {
        return true;
      }
    }
    return false;
  }

  fileContentChangeHandler(e: any, fileNode: ProjectContext, model: any) {
    // update file context
    fileNode.model.contents = model.getValue();
    fileNode.changed = true;
  }

  cleanDecoration() {
    this.editorControl.editor.getValue().deltaDecorations(this.decorations, []);
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
