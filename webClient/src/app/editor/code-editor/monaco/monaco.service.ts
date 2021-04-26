
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Injectable, Inject } from '@angular/core';
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';
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
import { TagComponent } from '../../../shared/dialog/tag/tag.component';
import { SnackBarService } from '../../../shared/snack-bar.service';
import { MessageDuration } from '../../../shared/message-duration';
import * as monaco from 'monaco-editor';
import { finalize, map, switchMap, tap } from 'rxjs/operators';
import { of, Subject } from 'rxjs';
import { LoadingStatus } from '../loading-status';

@Injectable()
export class MonacoService {
  loadingStatusChanged = new Subject<LoadingStatus>();
  private decorations: string[] = [];
  
  constructor(
    @Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger,
    private httpService: HttpService,
    private http: Http,
    private dataAdapter: DataAdapterService,
    private editorControl: EditorControlService,
    private dialog: MatDialog,
    private utils: UtilsService,
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

    //this.editorControl.saveAllFile.subscribe(() => {
      //this.saveAllFile();
    //});
  }

  getFileRequestObservable(fileNode: ProjectContext, reload: boolean, line?: number) {
    if (!reload) {
      return of({contents: fileNode.model.contents});
    }
    let requestUrl: string;
    let filePath = ['/', '\\'].indexOf(fileNode.model.path.substring(0, 1)) > -1 ? fileNode.model.path.substring(1) : fileNode.model.path;
    if (fileNode.model.isDataset) {
      requestUrl = ZoweZLUX.uriBroker.datasetContentsUri(filePath);
    } else {
      requestUrl = ZoweZLUX.uriBroker.unixFileUri('contents',
                                                  filePath+'/'+fileNode.model.fileName,
                                                  { responseType: 'b64' });
    }
    return of({}).pipe(
      tap(() => this.loadingStatusChanged.next('loading')),
      switchMap(() => this.http.get(requestUrl)),
      map((res: any) => {
        if (fileNode.model.isDataset) {
          return this.dataAdapter.convertDatasetContent(res._body);
        } else {
          return this.dataAdapter.convertFileContent(res._body);
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
        this.setMonacoModel(fileNode, <{ contents: string, language: string }>resJson, false).subscribe({
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
    this.editorControl.saveCursorState();
    if (fileNode.temp) {
      //blank new file
      this.setMonacoModel(fileNode, <{ contents: string, language: string }>{ contents: '', language: '' }, true).subscribe(() => {
        this.editorControl.fileOpened.next({ buffer: fileNode, file: fileNode.name });
        if (line) {
          this.editorControl.editor.getValue().revealPosition({ lineNumber: line, column: 0 });
          console.log(this.editorControl.editor.getValue().revealPosition({ lineNumber: line, column: 0 }));
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
          this.setMonacoModel(fileNode, <{ contents: string, language: string }>resJson, true).subscribe({
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
          this.log.warn(`${fileNode.name} could not be opened, status: `, err.status);
          if (err.status === 403) {
            this.snackBar.open(`${fileNode.name} could not be opened due to permissions.`,
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
  }

  setMonacoModel(fileNode: ProjectContext, file: { contents: string, language: string }, makeActiveModel?: boolean): Observable<void> {
    return new Observable((obs) => {
      const coreSubscriber = this.editorControl.editorCore
        .subscribe((value) => {
          if (value && value.editor) {
            const editorCore = value.editor;

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
                const subscriber = this.editorControl.editor.subscribe((value)=> {
                  if (value) {
                    value.setModel(newModel);
                    if (subscriber){subscriber.unsubscribe();}
                    obs.next();
                  }
                });
              }
            });
            if (coreSubscriber) {coreSubscriber.unsubscribe();}
          }
        });
    });
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
  
  saveFile(fileContext: ProjectContext, fileDirectory?: string): Observable<void> {
    return new Observable((obs) => {
      
      /* If the file is not new, and the encoding 
       * has already been set inside of USS via
       * chtag.
       */
      if (!fileContext.temp && 
          fileContext.model.encoding != undefined &&
          fileContext.model.encoding != null && 
          fileContext.model.encoding != 0
          ){
        this.editorControl.saveBuffer(fileContext, null).subscribe(() => obs.next());
      }
      /* The file is new or is untagged,
       * so we must prompt a dialog.
       */
      else {
        /* Issue a presave check to see if the
         * file can be saved as ISO-8859-1,
         * perhaps this should be done in real
         * time as an enhancement.
         */
        let x = this.preSaveCheck(fileContext);
        
        /* The file is temporary, which means that
         * it was never tagged.
         */
        if (fileContext.temp) {
          /* Open up a dialog with the standard,
           * "save as" format.
           */
          let activeDirectory = '';
          if (fileDirectory) {
            activeDirectory = fileDirectory;
          }
          let saveRef = this.dialog.open(SaveToComponent, {
            width: '500px',
            data: { canBeISO: x, 
              fileName: fileContext.model.fileName,
              fileDirectory: activeDirectory }
          });
          saveRef.afterClosed().subscribe(result => {
          if (result) {
            this.editorControl.saveBuffer(fileContext, result).subscribe(() => obs.next());
          }
          });
        }
        /* The file was never tagged, so we should
         * ask the user if they would like to tag
         * it.
         */
        else {
          /* Open up a dialog asking if the user
           * wants to tag their file. Again,
           * we are checking if ISO-8859-1 is
           * an option.
           */
          let saveRef = this.dialog.open(TagComponent, {
            width: '500px',
            data: { canBeISO: x,
                    fileName: fileContext.model.fileName }
          });
          saveRef.afterClosed().subscribe(result => {
          if (result) {
            this.editorControl.saveBuffer(fileContext, result).subscribe(() => obs.next());
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
