
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Injectable, Inject, OnDestroy } from '@angular/core';
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';
import { HttpService } from '../../../shared/http/http.service';
import { ProjectStructure } from '../../../shared/model/editor-project';
import { ProjectContext } from '../../../shared/model/project-context';
import { EditorControlService } from '../../../shared/editor-control/editor-control.service';
import { UtilsService } from '../../../shared/utils.service';
import { DataAdapterService } from '../../../shared/http/http.data.adapter.service';
import { MatDialog } from '@angular/material/dialog';
import { SaveToComponent } from '../../../shared/dialog/save-to/save-to.component';
import { ConfirmAction } from '../../../shared/dialog/confirm-action/confirm-action-component';
import { TagComponent } from '../../../shared/dialog/tag/tag.component';
import { SnackBarService } from '../../../shared/snack-bar.service';
import { MessageDuration } from '../../../shared/message-duration';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { finalize, map, switchMap, tap } from 'rxjs/operators';
import { of, Subject, Observable } from 'rxjs';
import { LoadingStatus } from '../loading-status';
import { HttpHeaders } from '@angular/common/http';
import * as _ from 'lodash';

const DIFF_VIEW_ELEM = "monaco-diff-viewer";

@Injectable()
export class MonacoService implements OnDestroy {
  loadingStatusChanged = new Subject<LoadingStatus>();
  private decorations: string[] = [];
  private previousFileContents: ProjectContext;
  private currentFileContents: ProjectContext;
  private diffEditor;
  private fileSaveListener;

  constructor(
    @Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger,
    private http: HttpService,
    private dataAdapter: DataAdapterService,
    private editorControl: EditorControlService,
    private dialog: MatDialog,
    private snackBar: SnackBarService
  ) {
    this.editorControl.closeFile.subscribe((fileContext: ProjectContext) => {
      this.closeFile(fileContext);
    });

    this.editorControl.closeAllFiles.subscribe(() => {
      this.closeAllFiles();
    });

    this.editorControl.changeLanguage.subscribe(e => {
      let openList = this.editorControl.openFileList.getValue();
      if (openList.length > 0) {
        // get monaco modal
        const _context: ProjectContext = e.context;
        const _editor = this.editorControl.editorCore.getValue().editor;
        const _modal = _editor.getModel(this.generateUri(_context.model));

        _context.model.language = e.language;
        _editor.setModelLanguage(_modal, e.language);
      }
    });

    let self = this; // Monaco bug: editor.addAction only works on the left-hand side of the Diff viewer
    this.fileSaveListener = function (e) { // Pure JS, Ctrl-S solution instead...
      if (e.key === 's' && (navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)) {
        e.preventDefault();
        let fileContext = self.editorControl.fetchActiveFile();
        let directory = fileContext.model.path || self.editorControl.activeDirectory;
        let sub = self.saveFile(fileContext, directory).subscribe(() => sub.unsubscribe()); // Error handling is done up-stream
      }
    }
    document.addEventListener("keydown", this.fileSaveListener);


    //this.editorControl.saveAllFile.subscribe(() => {
    //this.saveAllFile();
    //});
  }

  ngOnDestroy() {
    document.removeEventListener("keydown", this.fileSaveListener);
  }

  getFileRequestObservable(fileNode: ProjectContext, reload: boolean, line?: number) {
    if (!reload) {
      return of({ contents: fileNode.model.contents, etag: fileNode.model.etag });
    }
    let requestUrl: string;
    let filePath = ['/', '\\'].indexOf(fileNode.model.path.substring(0, 1)) > -1 ? fileNode.model.path.substring(1) : fileNode.model.path;
    if (fileNode.model.isDataset) {
      requestUrl = ZoweZLUX.uriBroker.datasetContentsUri(filePath);
    } else {
      requestUrl = ZoweZLUX.uriBroker.unixFileUri('contents',
        filePath + '/' + fileNode.model.fileName,
        { responseType: 'b64' });
    }
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    })
    const options = {
      headers: headers,
      responseType: 'text',
    }
    return of({}).pipe(
      tap(() => this.loadingStatusChanged.next('loading')),
      switchMap(() => this.http.get(requestUrl, options)),
      map((res: any) => {
        if (fileNode.model.isDataset) {
          return this.dataAdapter.convertDatasetContent(res);
        } else {
          return this.dataAdapter.convertFileContent(res);
        }
      }),
      finalize(() => this.loadingStatusChanged.next('complete'))
    );
  }

  refreshFile(fileNode: ProjectContext, reload: boolean, line?: number) {
    this.getFileRequestObservable(fileNode, reload, line).subscribe({
      next: (response: any) => {
        //network load or switched to currently open file
        const resJson = response;
        this.setMonacoModel(fileNode, <{ contents: string, etag: string, language: string }>resJson, false).subscribe({
          next: () => {
            this.editorControl.fileOpened.next({ buffer: fileNode, file: fileNode.name });
            if (line) {
              this.editorControl.editor.getValue().revealPosition({ lineNumber: line, column: 0 });
              this.decorations.push(this.editorControl.editor.getValue().deltaDecorations([], [
                { range: new monaco.Range(line, 100, line, 100), options: { isWholeLine: true, inlineClassName: 'highlight-line' } },
              ])[0]);
              // this.editor.getValue().colorizeModelLine(newModel, fileNode.model.line);
            }
            if (reload) {
              this.editorControl.initializedFile.next(fileNode);
            }
          },
          error: (err) => {
            this.log.warn(err);
          }
        });
      },
      error: (err) => {
        this.log.warn(`${fileNode.name} could not be refreshed, status: `, err.status);
        if (err.status === 403) {
          this.snackBar.open(`${fileNode.name} could not be refreshed due to permissions.`,
            'Close', { duration: MessageDuration.Medium, panelClass: 'center' });
        } else if (err.status === 404) {
          this.snackBar.open(`${fileNode.name} could not be found.`,
            'Close', { duration: MessageDuration.Medium, panelClass: 'center' });
        } else {
          this.snackBar.open(`${fileNode.name} could not be opened.`,
            'Close', { duration: MessageDuration.Medium, panelClass: 'center' });
        }
      }
    });
  }

  /*
    Tab selection tells monaco to switch its buffer, this is interpreted as an open file operation
    But, the file may already be open, so within this we have to determine whether to fire an event
    From the controller to say whether this is new, or just a selection change
    reload - Tells Editor to reload file language settings & other file init actions
   */
  openFile(fileNode: ProjectContext, reload: boolean, line?: number) {
    this.editorControl.openFileList.subscribe((list: ProjectContext[]) => {
      if (list.length === 1) {
        this.editorControl.saveCursorPosition = false;
      }
    });
    this.editorControl.selectFileHandler(fileNode);
    if (fileNode.temp) {
      //blank new file
      this.setMonacoModel(fileNode, <{ contents: string, etag: string, language: string }>{ contents: fileNode.changed ? fileNode.model.contents : '', etag: '', language: '' }, true).subscribe(() => {
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
      this.getFileRequestObservable(fileNode, reload, line).subscribe({
        next: (response: any) => {
          //network load or switched to currently open file
          const resJson = response;
          this.setMonacoModel(fileNode, <{ contents: string, etag: string, language: string }>resJson, true).subscribe({
            next: () => {
              this.editorControl.fileOpened.next({ buffer: fileNode, file: fileNode.name });
              if (line) {
                this.editorControl.editor.getValue().revealPosition({ lineNumber: line, column: 0 });
                this.decorations.push(this.editorControl.editor.getValue().deltaDecorations([], [
                  { range: new monaco.Range(line, 100, line, 100), options: { isWholeLine: true, inlineClassName: 'highlight-line' } },
                ])[0]);
                // this.editor.getValue().colorizeModelLine(newModel, fileNode.model.line);
              }
              if (reload) {
                this.editorControl.initializedFile.next(fileNode);
              }
            },
            error: (err) => {
              this.log.warn(err);
            }
          });
        },
        error: (err) => {
          this.editorControl.closeFileHandler(fileNode);
          this.log.warn(`${fileNode.name} could not be opened, status: `, err.status);
          if (err.status === 403) {
            this.snackBar.open(`${fileNode.name} could not be opened due to permissions.`,
              'Close', { duration: MessageDuration.Medium, panelClass: 'center' });
          } else if (err.status === 404) {
            this.snackBar.open(`${fileNode.name} could not be found.`,
              'Close', { duration: MessageDuration.Medium, panelClass: 'center' });
          } else {
            let reason = err._body || "Not provided by agent";
            this.snackBar.open(`${fileNode.name} could not be opened. Reason: ` + reason,
              'Close', { duration: MessageDuration.Long, panelClass: 'center' });
          }
        }
      });
    }
    this.editorControl.saveCursorPosition = true;
  }

  savePreviousFileContent(currentFileContent: ProjectContext) {
    if (currentFileContent) {
      if (this.currentFileContents && (this.currentFileContents.model.contents !== currentFileContent.model.contents)) {
        this.previousFileContents = _.cloneDeep(this.currentFileContents);
      }
      this.currentFileContents = currentFileContent;
    }
  }

  setMonacoModel(fileNode: ProjectContext, file: { contents: string, etag: string, language: string }, makeActiveModel?: boolean): Observable<void> {
    return new Observable((obs) => {
      const coreSubscriber = this.editorControl.editorCore
        .subscribe((value) => {
          if (value && value.editor) {
            const editorCore = value.editor;

            this.savePreviousFileContent(fileNode);
            fileNode.model.contents = file['contents'];
            fileNode.model.etag = file['etag'];
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
                language: fileLang, // Replace fileLang here to test other languages
                uri: this.generateUri(fileNode.model),
              };
              this.editorControl.setThemeForLanguage(fileLang);
              const duplicate: boolean = this.fileDuplicateChecker(model.uri);
              let newModel;
              if (!duplicate) {
                newModel = editorCore.createModel(model.value, model.language, model.uri);
              } else {
                newModel = editorCore.getModel(model.uri);
              }
              if (!makeActiveModel) {
                newModel.setValue(fileNode.model.contents);
                this.snackBar.open(`${fileNode.name} was refreshed successfully.`,
                  'Close', { duration: MessageDuration.Short, panelClass: 'center' });
                fileNode.changed = false;
              } else {
                newModel.onDidChangeContent((e: any) => {
                  this.fileContentChangeHandler(e, fileNode, newModel);
                });
                const subscriber = this.editorControl.editor.subscribe((value) => {
                  if (value) {
                    value.setModel(newModel);
                    if (subscriber) { subscriber.unsubscribe(); }
                    obs.next();
                  }
                });
              }
            });
            if (coreSubscriber) { coreSubscriber.unsubscribe(); }
          }
        });
    });
  }

  spawnDiffViewer(): boolean {
    if (!this.previousFileContents || !this.currentFileContents) {
      this.snackBar.open(`Open at least two files to compare selections.`,
        'Close', { duration: MessageDuration.Medium, panelClass: 'center' });
      return false;
    }

    const _editor = this.editorControl.editorCore.getValue().editor;
    const previousModel = _editor.getModel(this.generateUri(this.previousFileContents.model));

    if (!previousModel) {
      this.snackBar.open(`Open at least two files to compare selections.`,
        'Close', { duration: MessageDuration.Medium, panelClass: 'center' });
      return false;
    }

    let currentModel;

    if (this.editorControl.compareDataset) {
      currentModel = monaco.editor.createModel(this.currentFileContents.model.contents);
    } else {
      currentModel = _editor.getModel(this.generateUri(this.currentFileContents.model));
    }

    var diffViewElem = document.getElementById(DIFF_VIEW_ELEM);

    if (!this.diffEditor) {
      this.diffEditor = _editor.createDiffEditor(diffViewElem, {
        originalEditable: true
      });
    }

    // TODO: Need to figure out how to better re-render Diff viewer with resizing
    diffViewElem.style.display = 'none';
    diffViewElem.style.display = 'block';
    this.diffEditor.setModel({
      original: previousModel,
      modified: currentModel
    });

    // Navigate to first diff
    this.diffEditor.onDidUpdateDiff(() => {
      const changes = this.diffEditor.getLineChanges();
      if (!changes || changes.length === 0) {
        return;
      }

      let change = changes[0];
      this.diffEditor.revealLinesInCenter(change.modifiedStartLineNumber, change.modifiedEndLineNumber);
    });

    // Going to use monaco.editor instead of our own, so we don't inherit half-working Ctrl+S
    // var navi = monaco.editor.createDiffNavigator(this.diffEditor, {
    //   followsCaret: true, // resets the navigator state when the user selects something in the editor
    //   ignoreCharChanges: true // jump from line to line
    // });
    return true;
  }

  closeFile(fileNode: ProjectContext) {
    const editorCore = this.editorControl.editorCore.getValue();
    if (!editorCore) {
      console.warn(`Editor core null on closeFile()`);
      return;
    }
    const _editor = editorCore.editor;
    const models = _editor.getModels();
    const fileUri = this.generateUri(fileNode.model);
    for (const model of models) {
      if (model.uri === fileUri) {
        model.dispose();
        this.editorControl.saveCursorPosition = false;
      }
    }
  }

  closeAllFiles() {
    const editorCore = this.editorControl.editorCore.getValue();
    if (!editorCore) {
      console.warn(`Editor core null on closeFile()`);
      return;
    }
    const _editor = editorCore.editor;
    const models = _editor.getModels();
    for (const model of models) {
      model.dispose();
    }
  }

  confirmAction(title: any, warningMessage: any): Observable<boolean> {
    var response = new Subject<String>();
    const dialogRef = this.dialog.open(ConfirmAction, {
      maxWidth: '400px',
      data: {
        title: title,
        warningMessage: warningMessage,
      }
    });
    return dialogRef.afterClosed();
  }

  preSaveCheck(fileContext?: ProjectContext): boolean {
    let _activeFile: ProjectContext = fileContext;
    let canBeISO = true;
    let i = 0;
    let fileContents = _activeFile.model.contents;
    for (i; i < fileContents.length; i++) {
      if (fileContents[i].charCodeAt(0) > 127) {
        canBeISO = false;
        break;
      }
    }
    return canBeISO;
  }

  saveFile(fileContext: ProjectContext, fileDirectory?: string, saveAs?: boolean): Observable<String> {
    return new Observable((obs) => {
      if (fileContext.model.isDataset) {
        this.editorControl.saveBuffer(fileContext, null, saveAs).subscribe(() => obs.next('Save'));
      } else {
        /* Issue a presave check to see if the
          * file can be saved as ISO-8859-1,
          * perhaps this should be done in real
          * time as an enhancement.
          */
        if (fileContext.temp || saveAs) {
          let x = this.preSaveCheck(fileContext);
          /* Open up a dialog with the standard,
            * "save as" format.
            */
          let saveRef = this.dialog.open(SaveToComponent, {
            width: '500px',
            data: {
              canBeISO: x,
              fileName: fileContext.model.fileName, ...(fileDirectory && { fileDirectory: fileDirectory })
            }
          });
          saveRef.afterClosed().subscribe(result => {
            // Check if file already exists at destination
            this.editorControl.getFileMetadata(result.directory + '/' + result.fileName).subscribe(r => {
              const title = `"${result.fileName}" already exists. Do you want to replace it?`;
              const warningMessage = 'Replacing it will overwrite its current contents';
              let response = this.confirmAction(title, warningMessage).subscribe(response => {
                if (response == true) {
                  // when user selects to overwite the file
                  if (result) {
                    this.editorControl.saveBuffer(fileContext, result).subscribe(() => obs.next('Save'));
                  }
                } else {
                  // when user selects not to overwrite or cancel
                  obs.next('Cancel');
                }
              });
            }, error => {
              if (error.status == 404) {// if file does not exist at destination, then try to save it
                if (result) {
                  this.editorControl.saveBuffer(fileContext, result).subscribe(() => obs.next('Save'));
                }
              } else {
                this.snackBar.open(`Failed to verify if ${result.directory + '/' + result.fileName} already exists: . Error code=${error.status}`,
                  'Close', { duration: MessageDuration.Medium, panelClass: 'center' });
              }
            });
          });
        }

        /* If the file is not new, and the encoding
        * has already been set inside of USS via
        * chtag.
        */
        else {
          this.editorControl.getFileMetadata(fileContext.model.path + '/' + fileContext.model.name).subscribe(r => {
            fileContext.model.encoding = r.ccsid;
            if (r.ccsid && r.ccsid != 0) {
              this.editorControl.saveBuffer(fileContext, null, saveAs).subscribe(() => obs.next('Save'));
            }
            /* The file was never tagged, so we should
            * ask the user if they would like to tag it.
            */
            else {
              let x = this.preSaveCheck(fileContext);
              let saveRef = this.dialog.open(TagComponent, {
                width: '500px',
                data: {
                  canBeISO: x,
                  fileName: fileContext.model.fileName
                }
              });
              saveRef.afterClosed().subscribe(result => {
                if (result) {
                  this.editorControl.saveBuffer(fileContext, result, saveAs).subscribe(() => obs.next('Save'));
                } else {
                  obs.next('Cancel');
                }
              });
            }
          }, error => {
            if (error.status === 404) {
              let fileInfo: any = { fileName: fileContext.name, directory: fileContext.model.path, encoding: this.editorControl.getStringEncoding(fileContext.model.encoding) };
              this.editorControl.saveBuffer(fileContext, fileInfo).subscribe(() => obs.next('Save'));
            } else {
              this.snackBar.open(`Problem accessing file: ${fileContext.model.path}/${fileContext.model.name}. Status: ${error.status}`,
                'Close', { duration: MessageDuration.Long, panelClass: 'center' });
            }
          });
        }
      }
    });
  }

  //saveAllFile() {
  //let unsavedFile = this.editorControl.openFileList.getValue().filter((file: ProjectContext) => file.changed);
  // if (unsavedFile[0]) {
  //   let sub = this.saveFile(unsavedFile[0]).subscribe(() => {
  //     sub.unsubscribe();
  //     this.saveAllFile();
  //   });
  // }
  //for (let file of unsavedFile) {
  //let sub = this.saveFile(file).subscribe(() => {
  //sub.unsubscribe();
  //});
  //}
  //}

  promptToSave(file: ProjectContext): Promise<String> {
    return new Promise((resolve, reject) => {
      if (file.changed) {
        const title = 'Do you want to save the changes you made to \'' + file.name + '\'\?';
        const warningMessage = 'Your changes will be lost if you don\'t save them.';
        let response = this.confirmAction(title, warningMessage).subscribe(response => {
          if (response == true) {
            // when user selects to save the file and close it
            let sub = this.saveFile(file, file.model.path || this.editorControl.activeDirectory).subscribe((res) => {
              resolve(res);
            });
          } else if (response != false && response != true) {
            // when user selects to cancel then do not close any file
            resolve('Cancel');
          } else {
            // when user selects not to save the file and close it
            resolve('DontSave');
          }
        });
      } else {
        resolve('UnmodifiedFile');
      }
    })
  }

  generateUri(editorFile: ProjectStructure): string {
    if (editorFile.isDataset) {
      return `inmemory://${editorFile.path.toLowerCase()}`;
    } else {
      return `inmemory://${editorFile.name.toLowerCase()}/${editorFile.id}`;
    }
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
    this.editorControl.removeActiveFromAllFiles();
    fileNode.changed = true;
    fileNode.active = true;
    this.cleanDecoration();
  }

  cleanDecoration() {
    let editorValue = this.editorControl.editor.getValue();
    let decorationIds = [];
    editorValue.getModel().getAllDecorations().forEach((decoration) => {
      decorationIds.push(decoration.id);
    });
    editorValue.deltaDecorations(decorationIds, []);
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
