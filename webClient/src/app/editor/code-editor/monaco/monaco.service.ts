
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


@Injectable()
export class MonacoService {

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
    this.editorControl.closeFile.subscribe((bufferContext: ProjectContext) => {
      this.closeBuffer(bufferContext);
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

    //this.editorControl.saveAllFile.subscribe(() => {
      //this.saveAllFile();
    //});
  }

  /*
     Tab selection tells monaco to switch its buffer, this is interpreted as an open file operation
     But, the file may already be open, so within this we have to determine whether to fire an event
     From the controller to say whether this is new, or just a selection change
   */
  openBuffer(bufferNode: ProjectContext, reload: boolean, line?: number) {
    this.editorControl.saveCursorState();
    if (bufferNode.temp) {
      //blank new buffer
      this.setMonacoModel(bufferNode, <{ contents: string, language: string }>{ contents: '', language: '' }).subscribe(() => {
        this.editorControl.fileOpened.next({ buffer: bufferNode, file: bufferNode.name });
        if (line) {
          this.editorControl.editor.getValue().revealPosition({ lineNumber: line, column: 0 });
          this.decorations.push(this.editorControl.editor.getValue().deltaDecorations([], [
            { range: new monaco.Range(line, 100, line, 100), options: { isWholeLine: true, inlineClassName: 'highlight-line' } },
          ])[0]);
          // this.editor.getValue().colorizeModelLine(newModel, bufferNode.model.line);
        }
      });
    } else {
      let requestUrl: string;
      let bufferPath = ['/', '\\'].indexOf(bufferNode.model.path.substring(0, 1)) > -1 ? bufferNode.model.path.substring(1) : bufferNode.model.path;
      let _observable;

      if (reload) {
        if (bufferNode.model.isDataset) {
          requestUrl = ZoweZLUX.uriBroker.datasetContentsUri(bufferPath);
          _observable = this.http.get(requestUrl).map((res: any) => this.dataAdapter.convertDatasetContent(res._body));
        } else {
          requestUrl = ZoweZLUX.uriBroker.unixFileUri('contents',
                                                      bufferPath+'/'+bufferNode.model.fileName,
                                                      { responseType: 'b64' });
          _observable = this.http.get(requestUrl).map((res: any) => this.dataAdapter.convertFileContent(res._body));
        }

      } else {
        _observable = new Observable((obs) => obs.next({ contents: bufferNode.model.contents }));
      }
      _observable.subscribe({
        next: (response: any) => {
          //network load or switched to currently open buffer
          const resJson = response;
          this.setMonacoModel(bufferNode, <{ contents: string, language: string }>resJson).subscribe({
            next: () => {
              this.editorControl.fileOpened.next({ buffer: bufferNode, file: bufferNode.name });
              if (line) {
                this.editorControl.editor.getValue().revealPosition({ lineNumber: line, column: 0 });
                this.decorations.push(this.editorControl.editor.getValue().deltaDecorations([], [
                  { range: new monaco.Range(line, 100, line, 100), options: { isWholeLine: true, inlineClassName: 'highlight-line' } },
                ])[0]);
                // this.editor.getValue().colorizeModelLine(newModel, bufferNode.model.line);
              }
              if (reload) {
                this.editorControl.initializedFile.next(bufferNode);
              }
            },
            error: (err) => {
              this.log.warn(err);
            }
          });
        },
        error: (err) => {
          this.log.warn(`${bufferNode.name} could not be opened`);
          if (err.status === 403) {
            this.snackBar.open(`${bufferNode.name} could not be opened due to permissions`,
              'Close', { duration: MessageDuration.Short, panelClass: 'center' });
          } else if (err.status === 404) {
            this.snackBar.open(`${bufferNode.name} could not be found`,
              'Close', { duration: MessageDuration.Short, panelClass: 'center' });
          } else {
            this.snackBar.open(`${bufferNode.name} could not be opened`,
              'Close', { duration: MessageDuration.Short, panelClass: 'center' });
          }
        }
      });
    }
  }

  setMonacoModel(bufferNode: ProjectContext, buffer: { contents: string, language: string }): Observable<void> {
    return new Observable((obs) => {
      const coreSubscriber = this.editorControl.editorCore
        .subscribe((value) => {
          if (value && value.editor) {
            const editorCore = value.editor;

            bufferNode.model.contents = buffer['contents'];
            this.editorControl.getRecommendedHighlightingModesForBuffer(bufferNode).subscribe((supportLanguages: string[]) => {
              let bufferLang = 'plaintext';
              if (buffer['language']) {
                bufferLang = buffer['language'];
              } else if (bufferNode.model.language) {
                bufferLang = bufferNode.model.language;
              } else if (supportLanguages[0]) {
                bufferLang = supportLanguages[0];
              }
              // sync language to context
              bufferNode.model.language = bufferLang;
              const model = {
                value: buffer['contents'],
                language: bufferLang, // Replace bufferLang here to test other languages
                uri: this.generateUri(bufferNode.model),
              };
              this.editorControl.setThemeForLanguage(bufferLang);
              const duplicate: boolean = this.bufferDuplicateChecker(model.uri);
              let newModel;
              if (!duplicate) {
                newModel = editorCore.createModel(model.value, model.language, model.uri);
              } else {
                newModel = editorCore.getModel(model.uri);
              }
              newModel.onDidChangeContent((e: any) => {
                this.bufferContentChangeHandler(e, bufferNode, newModel);
              });
              const subscriber = this.editorControl.editor.subscribe((value)=> {
                if (value) {
                  value.setModel(newModel);
                  if (subscriber){subscriber.unsubscribe();}
                  obs.next();
                }
              });
            });
            if (coreSubscriber) {coreSubscriber.unsubscribe();}
          }
        });
    });
  }

  closeBuffer(bufferNode: ProjectContext) {
    const editorCore = this.editorControl.editorCore.getValue();
    if (!editorCore) {
      console.warn(`Editor core null on closeBuffer()`);
      return;
    }
    const _editor = editorCore.editor;
    const models = _editor.getModels();
    const bufferUri = this.generateUri(bufferNode.model);
    for (const model of models) {
      if (model.uri === bufferUri) {
        model.dispose();
      }
    }
  }

  preSaveCheck(bufferContext?: ProjectContext): boolean {
    let _activeBuffer: ProjectContext = bufferContext;
    let canBeISO = true;
    let i = 0;
    let bufferContents = _activeBuffer.model.contents;
    for (i; i < bufferContents.length; i++) {
      if (bufferContents[i].charCodeAt(0) > 127) {
        canBeISO = false;
        break;
      }
    }
    return canBeISO;
  }
  
  saveBuffer(bufferContext: ProjectContext): Observable<void> {
    return new Observable((obs) => {
      if (bufferContext.model.isDataset) {
        //TODO validation
        this.editorControl.saveBuffer(bufferContext, null).subscribe(() => obs.next());
      }
      /* If the buffer is not new, and the encoding 
       * has already been set inside of USS via
       * chtag.
       */
      if (!bufferContext.temp && 
          bufferContext.model.encoding != undefined &&
          bufferContext.model.encoding != null && 
          bufferContext.model.encoding != 0
          ){
        this.editorControl.saveBuffer(bufferContext, null).subscribe(() => obs.next());
      }
      /* The buffer is new or is untagged,
       * so we must prompt a dialog.
       */
      else {
        /* Issue a presave check to see if the
         * buffer can be saved as ISO-8859-1,
         * perhaps this should be done in real
         * time as an enhancement.
         */
        let x = this.preSaveCheck(bufferContext);
        
        /* The buffer is temporary, which means that
         * it was never tagged.
         */
        if (bufferContext.temp) {
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
            this.editorControl.saveBuffer(bufferContext, result).subscribe(() => obs.next());
          }
          });
        }
        /* The buffer was never tagged, so we should
         * ask the user if they would like to tag
         * it.
         */
        else {
          /* Open up a dialog asking if the user
           * wants to tag their buffer. Again,
           * we are checking if ISO-8859-1 is
           * an option.
           */
          let saveRef = this.dialog.open(TagComponent, {
            width: '500px',
            data: { canBeISO: x,
                    fileName: bufferContext.model.fileName }
          });
          saveRef.afterClosed().subscribe(result => {
          if (result) {
            this.editorControl.saveBuffer(bufferContext, result).subscribe(() => obs.next());
          }
          });
        }
      }
    });
  }

  //saveAllFile() {
    //let unsavedFile = this.editorControl.openFileList.getValue().filter((file: ProjectContext) => file.changed);
    // if (unsavedFile[0]) {
    //   let sub = this.saveBuffer(unsavedFile[0]).subscribe(() => {
    //     sub.unsubscribe();
    //     this.saveAllFile();
    //   });
    // }
    //for (let buffer of unsavedBuffer) {
      //let sub = this.saveBuffer(buffer).subscribe(() => {
        //sub.unsubscribe();
      //});
    //}
  //}

  generateUri(editorBuffer: ProjectStructure): string {
    // have to use lowercase here!
    return `inmemory://${editorBuffer.name.toLowerCase()}/${editorBuffer.id}`;
  }

  bufferDuplicateChecker(uri: string): boolean {
    const models = this.editorControl.editorCore.getValue().editor.getModels();
    for (const model of models) {
      if (model.uri === uri) {
        return true;
      }
    }
    return false;
  }

  bufferContentChangeHandler(e: any, bufferNode: ProjectContext, model: any) {
    // update buffer context
    bufferNode.model.contents = model.getValue();
    bufferNode.changed = true;
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
