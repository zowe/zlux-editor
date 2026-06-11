
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
import { LimitsService } from '../../../shared/limits.service';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { finalize, map, switchMap, tap, take } from 'rxjs/operators';
import { of, Subject, Observable, throwError } from 'rxjs';
import { LoadingStatus } from '../loading-status';
import { HttpClient, HttpHeaders, HttpEventType, HttpEvent, HttpParams } from '@angular/common/http';
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
    private httpClient: HttpClient,
    private dataAdapter: DataAdapterService,
    private editorControl: EditorControlService,
    private dialog: MatDialog,
    private snackBar: SnackBarService,
    private limitsService: LimitsService
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
      const isMac = (navigator as any).userAgentData?.platform === 'macOS' || /Mac/.test(navigator.userAgent);
      if (e.key === 's' && (isMac ? e.metaKey : e.ctrlKey)) {
        e.preventDefault();
        let fileContext = self.editorControl.fetchActiveFile();
        if (!fileContext || !fileContext.model) return;
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

    const maxSize = this.limitsService.limits.maxFileSize;
    const maxSizeLabel = this.limitsService.getFormattedMaxSize();

    // Pre-check to avoid downloading oversized files/datasets.
    // If the file exceeds the limit, prompt the user with a warning dialog.
    // If they choose to override, download without a size cap.
    let preflight$: Observable<boolean>;
    if (fileNode.model.isDataset) {
      const isPdsMember = fileNode.model.path && fileNode.model.path.indexOf('(') !== -1;
      const attrs = fileNode.model.datasetAttrs;
      const org = attrs && attrs.dsorg ? attrs.dsorg.organization : '';

      if (isPdsMember) {
        // PDS members share the parent PDS allocation so DASD math would over-estimate;
        // they are protected by the streaming download abort below instead.
        preflight$ = of(false);
      } else if (org === 'vsam') {
        // VSAM datasets have different allocation semantics (CI/CA sizes, key ranges);
        // space/prime don't map to data size the same way. Rely on streaming abort.
        this.log.debug(`Dataset ${fileNode.name} is VSAM, skipping DASD size estimation`);
        preflight$ = of(false);
      } else {
        // Sequential, partitioned (whole PDS), HFS, DA, and other non-VSAM datasets:
        // estimate size via 3390 DASD geometry using space/prime allocation.
        const estimatedSize = this.limitsService.estimateDatasetSize(attrs);
        if (estimatedSize > 0 && estimatedSize > maxSize) {
          this.log.warn(`Dataset ${fileNode.name} estimated size ${estimatedSize} bytes (org=${org}, space=${attrs.space}, prime=${attrs.prime}) exceeds limit ${maxSize}`);
          preflight$ = this.confirmLargeFileOpen(fileNode.name,
            `has an estimated size of ${(estimatedSize / 1048576).toFixed(1)}MB`, maxSizeLabel);
        } else {
          preflight$ = of(false);
        }
      }
    } else {
      // For USS files, check size from the directory listing first (already on the model).
      // Fall back to a metadata API call only if size is not available (e.g. file opened
      // outside of a directory listing, or listing did not include size).
      const knownSize = fileNode.model.size;
      if (knownSize != null && knownSize > 0) {
        if (knownSize > maxSize) {
          this.log.warn(`File ${fileNode.name} size ${knownSize} (from directory listing) exceeds limit ${maxSize}`);
          preflight$ = this.confirmLargeFileOpen(fileNode.name,
            `is ${(knownSize / 1048576).toFixed(1)}MB`, maxSizeLabel);
        } else {
          preflight$ = of(false);
        }
      } else {
        const metadataUrl = ZoweZLUX.uriBroker.unixFileUri('metadata',
          filePath + '/' + fileNode.model.fileName);
        preflight$ = this.http.get(metadataUrl).pipe(
          switchMap((metadata: any) => {
            const fileSize = metadata && metadata.size != null ? metadata.size : 0;
            if (fileSize > maxSize) {
              this.log.warn(`File ${fileNode.name} size ${fileSize} exceeds limit ${maxSize}`);
              return this.confirmLargeFileOpen(fileNode.name,
                `is ${(fileSize / 1048576).toFixed(1)}MB`, maxSizeLabel);
            }
            return of(false);
          })
        );
      }
    }

    // preflight$ emits true if the user overrode the size limit, false if within limits.
    // If the user cancelled, the observable errors with _fileTooLarge + _userCancelled.
    return preflight$.pipe(
      tap(() => this.loadingStatusChanged.next('loading')),
      switchMap((userOverride: boolean) => {
        const effectiveMaxSize = userOverride ? Number.MAX_SAFE_INTEGER : maxSize;
        return this.getSizeLimitedResponse(requestUrl, options, effectiveMaxSize);
      }),
      map((res: any) => {
        try {
          if (fileNode.model.isDataset) {
            return this.dataAdapter.convertDatasetContent(res);
          } else {
            return this.dataAdapter.convertFileContent(res);
          }
        } catch (e) {
          throw { status: 0, _body: `Failed to parse server response for ${fileNode.name}: ${e.message || e}` };
        }
      }),
      finalize(() => this.loadingStatusChanged.next('complete'))
    );
  }

  /**
   * Fetches a URL while monitoring download progress. If the downloaded bytes
   * exceed maxSize, the request is cancelled immediately. This breaks the server's
   * socket so it stops streaming and doing CPU-intensive JSON conversion work.
   * Prevents the jsonConvertAndWriteBuffer() errors from burning server CPU.
   */
  private getSizeLimitedResponse(url: string, options: any, maxSize: number): Observable<any> {
    const maxSizeLabel = this.limitsService.getFormattedMaxSize();

    return new Observable((observer) => {
      const sub = this.httpClient.get(url, {
        headers: options.headers,
        responseType: 'text',
        reportProgress: true,
        observe: 'events'
      }).subscribe({
        next: (event: HttpEvent<string>) => {
          if (event.type === HttpEventType.ResponseHeader) {
            // Check Content-Length header if the server provides it
            const contentLength = parseInt(event.headers.get('Content-Length') || '0', 10);
            if (contentLength > maxSize) {
              this.log.warn(`Response Content-Length ${contentLength} exceeds limit ${maxSize}, aborting download`);
              sub.unsubscribe(); // Cancels the XMLHttpRequest, breaking the server's socket
              observer.error({ _fileTooLarge: true,
                message: `Content is too large (${(contentLength / 1048576).toFixed(1)}MB from Content-Length). Maximum allowed size is ${maxSizeLabel}.` });
            }
          } else if (event.type === HttpEventType.DownloadProgress) {
            // Monitor streaming progress and abort if accumulated bytes exceed limit
            if (event.loaded > maxSize) {
              this.log.warn(`Download progress ${event.loaded} bytes exceeds limit ${maxSize}, aborting`);
              sub.unsubscribe();
              observer.error({ _fileTooLarge: true,
                message: `Download exceeded maximum allowed size of ${maxSizeLabel}. Transfer was cancelled to protect server resources.` });
            }
          } else if (event.type === HttpEventType.Response) {
            // Full response received within limits
            observer.next(event.body);
            observer.complete();
          }
        },
        error: (err) => {
          // Normalize HttpErrorResponse so downstream error handlers can use
          // the same properties (status, _body) they expect from HttpService.
          if (err && err.status != null && err._body === undefined) {
            let body = '';
            if (typeof err.error === 'string' && err.error) {
              body = err.error;
            } else if (err.error && typeof err.error === 'object') {
              body = err.error.message || err.error.error || '';
            }
            err._body = body || err.statusText || `Server returned status ${err.status}`;
          }
          observer.error(err);
        }
      });

      // If the outer observable is unsubscribed, cancel the HTTP request too
      return () => sub.unsubscribe();
    });
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
        if (err._userCancelled) {
          return; // User cancelled from the large file warning dialog
        }
        this.log.warn(`${fileNode.name} could not be refreshed, status: `, err.status);
        if (err._fileTooLarge) {
          this.snackBar.open(err.message,
            'Close', { duration: MessageDuration.Long, panelClass: 'center' });
        } else if (err.status === 403) {
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
      this.editorControl.openFileHandler(fileNode);
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
          // Preflight passed (and user confirmed if oversized) -- now add the tab
          this.editorControl.openFileHandler(fileNode);
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
          if (err._userCancelled) {
            return; // User cancelled from the large file warning dialog
          }
          this.log.warn(`${fileNode.name} could not be opened, status: `, err.status);
          if (err._fileTooLarge) {
            this.snackBar.open(err.message,
              'Close', { duration: MessageDuration.Long, panelClass: 'center' });
          } else if (err.status === 403) {
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

  getDiffEditor(): monaco.editor.IStandaloneDiffEditor {
    return this.diffEditor;
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
      if (model.uri.toString() === fileUri) {
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

  /**
   * Shows a warning dialog for oversized files/datasets.
   * Returns an Observable that emits true if the user overrides, or throws _fileTooLarge if cancelled.
   */
  private confirmLargeFileOpen(fileName: string, sizeDescription: string, maxSizeLabel: string): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmAction, {
      maxWidth: '480px',
      data: {
        title: 'Large File Warning',
        warningMessage: `"${fileName}" ${sizeDescription} which exceeds the ${maxSizeLabel} limit. `
          + `Opening very large files in the editor may cause high memory usage or CPU load. `
          + `We recommend downloading the file and viewing it on your desktop instead.`,
        confirmLabel: 'Open Anyway',
        dismissLabel: 'Cancel'
      }
    });
    return dialogRef.afterClosed().pipe(
      take(1),
      switchMap((confirmed: boolean) => {
        if (confirmed) {
          this.log.info(`User chose to override size limit for ${fileName}`);
          return of(true);
        }
        return throwError({ _fileTooLarge: true, _userCancelled: true,
          message: `Opening "${fileName}" was cancelled.` });
      })
    );
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

  private allocateAndSave(fileContext: ProjectContext, result: any, obs: any) {
    const allocProps = result.allocateProps;
    const datasetName = result.datasetName;
    const requestUrl = ZoweZLUX.uriBroker.datasetContentsUri(datasetName);

    // Map datasetNameType: LIBRARY → PDSE for the API
    let dsnt = allocProps.datasetNameType;
    if (dsnt === 'LIBRARY') {
      dsnt = 'PDSE';
    }

    const allocBody: any = {
      ndisp: 'CATALOG',
      status: 'NEW',
      space: allocProps.allocationUnit,
      dsorg: allocProps.organization,
      lrecl: parseInt(allocProps.recordLength, 10),
      recfm: allocProps.recordFormat,
      dir: parseInt(allocProps.directoryBlocks, 10),
      prime: parseInt(allocProps.primarySpace, 10),
      secnd: parseInt(allocProps.secondarySpace, 10),
      dsnt: dsnt,
      close: 'true',
    };
    // Only include blockSize if it's a valid positive integer; 0 or negative causes ACB errors on z/OS
    if (allocProps.blockSize) {
      const blkSizeNum = parseInt(allocProps.blockSize, 10);
      if (!isNaN(blkSizeNum) && blkSizeNum > 0) {
        allocBody.blksz = blkSizeNum;
      }
    }

    this.http.put(requestUrl, allocBody).subscribe({
      next: () => {
        // If allocating PDS/PDSE with no member name, skip content save 
        // (you can't PUT content directly to a PDS — only to DSN(MEMBER))
        if ((allocProps.organization === 'PO') && !result.memberName) {
          this.snackBar.open(`Dataset ${datasetName} allocated successfully. Use Save As → Member to save content.`, 'Dismiss',
            { duration: MessageDuration.Long, panelClass: 'center' });
          fileContext.model.isDataset = true;
          fileContext.model.fileName = datasetName;
          fileContext.model.name = datasetName;
          fileContext.model.path = datasetName;
          fileContext.temp = false;
          this.editorControl._openFileList.next(this.editorControl._openFileList.getValue());
          obs.next('Save');
        } else {
          this.snackBar.open(`Dataset ${datasetName} allocated successfully`, 'Dismiss',
            { duration: MessageDuration.Medium, panelClass: 'center' });
          this.saveAsDatasetMember(fileContext, result, obs);
        }
      },
      error: (error: any) => {
        const raw = error?.error;
        const errMsg = (typeof raw === 'string') ? raw
          : raw?.error || raw?.msg || raw?.message || JSON.stringify(raw) || error?.message || 'Unknown error';
        // If error explicitly says "already exists", fall back to direct save
        if (errMsg.includes('already exists')) {
          this.snackBar.open(`Dataset ${datasetName} already exists — saving content directly.`, 'Dismiss',
            { duration: MessageDuration.Medium, panelClass: 'center' });
          this.saveAsDatasetMember(fileContext, result, obs);
        } else if (errMsg.includes('Unable to allocate a DD for ACB')) {
          this.snackBar.open(`Failed to allocate dataset ${datasetName}: The high-level qualifier may not be authorized for this user. Try a different dataset name prefix.`,
            'Close', { duration: MessageDuration.Long, panelClass: 'center' });
          obs.error(errMsg);
        } else {
          this.snackBar.open(`Failed to allocate dataset ${datasetName}: ${errMsg}`,
            'Close', { duration: MessageDuration.Long, panelClass: 'center' });
          obs.error(errMsg);
        }
      }
    });
  }

  private saveAsDatasetMember(fileContext: ProjectContext, result: any, obs: any) {
    const datasetName = result.datasetName;
    const memberName = result.memberName;
    const fullName = memberName ? `${datasetName}(${memberName})` : datasetName;
    const requestUrl = ZoweZLUX.uriBroker.datasetContentsUri(fullName);

    // Always get the latest content from the active editor model to avoid saving stale/empty data
    const editor = this.editorControl.editor.getValue();
    const editorModel = editor?.getModel();
    const rawContent = editorModel ? editorModel.getValue() : fileContext.model.contents;
    const contents = rawContent ? rawContent.replace(/\r\n/g, '\n').split('\n') : [''];

    // Use force=true to overwrite existing members (same as regular save does)
    let parameters = new HttpParams();
    parameters = parameters.append('force', 'true');
    const options = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      params: parameters
    };

    this.http.post(requestUrl, { records: contents }, options).subscribe({
      next: () => {
        this.snackBar.open(`Saved to dataset: ${fullName}`, 'Dismiss',
          { duration: MessageDuration.Medium, panelClass: 'center' });
        // Update file context to reflect it's now a dataset
        fileContext.model.isDataset = true;
        fileContext.model.fileName = fullName;
        fileContext.model.name = memberName || datasetName;
        fileContext.model.path = datasetName;
        fileContext.model.contents = rawContent || '';
        fileContext.temp = false;
        fileContext.changed = false;
        // Notify tab bar of the title change
        this.editorControl._openFileList.next(this.editorControl._openFileList.getValue());
        // Emit bufferSaved so the file tree and other listeners know
        this.editorControl.bufferSaved.next({ buffer: fileContext.model.contents, file: fileContext.model.name });
        // Refresh the dataset member list in the file tree so user doesn't have to manually refresh
        this.editorControl.openDirectory.next(datasetName);
        obs.next('Save');
      },
      error: (error: any) => {
        const raw = error?.error;
        const errMsg = (typeof raw === 'string') ? raw
          : raw?.error || raw?.msg || raw?.message || JSON.stringify(raw) || error?.message || 'Unknown error';
        this.snackBar.open(`Failed to save to dataset ${fullName}: ${errMsg}`,
          'Close', { duration: MessageDuration.Long, panelClass: 'center' });
        obs.error(errMsg);
      }
    });
  }

  saveFile(fileContext: ProjectContext, fileDirectory?: string, saveAs?: boolean): Observable<String> {
    return new Observable((obs) => {
      if (fileContext.model.isDataset && !saveAs) {
        this.editorControl.saveBuffer(fileContext, null, false).subscribe(() => obs.next('Save'));
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
          // Only pass fileDirectory for USS paths (starts with /); dataset names should not pre-fill USS directory
          const ussDirectory = fileDirectory && fileDirectory.startsWith('/') ? fileDirectory : undefined;
          let saveRef = this.dialog.open(SaveToComponent, {
            width: '540px',
            data: {
              canBeISO: x,
              fileName: fileContext.model.fileName,
              ...(ussDirectory && { fileDirectory: ussDirectory }),
              ...(fileContext.model.isDataset && { datasetName: fileContext.model.path, memberName: fileContext.model.name })
            }
          });
          saveRef.afterClosed().subscribe(result => {
            if (!result) {
              obs.next('Cancel');
              return;
            }

            // Handle "Save as Dataset/Member" option
            if (result.saveType === 'dataset') {
              if (result.allocateNew) {
                this.allocateAndSave(fileContext, result, obs);
              } else {
                this.saveAsDatasetMember(fileContext, result, obs);
              }
              return;
            }

            // Check if file already exists at destination
            this.editorControl.getFileMetadata(result.directory + '/' + result.fileName).subscribe(r => {
              const title = `"${result.fileName}" already exists. Do you want to replace it?`;
              const warningMessage = 'Replacing it will overwrite its current contents';
              let response = this.confirmAction(title, warningMessage).subscribe(response => {
                if (response == true) {
                  // when user selects to overwrite the file
                  if (result) {
                    // Use saveFileHandler directly — saveBuffer routes to saveDatasetHandler
                    // when model.isDataset is true, which doesn't support USS overwrite
                    this.editorControl.saveFileHandler(fileContext, result).subscribe(() => {
                      // After successful USS save, clear dataset flag so subsequent Ctrl+S uses USS path
                      fileContext.model.isDataset = false;
                      obs.next('Save');
                    });
                  }
                } else {
                  // when user selects not to overwrite or cancel
                  obs.next('Cancel');
                }
              });
            }, error => {
              if (error.status == 404) {// if file does not exist at destination, then try to save it
                if (result) {
                  // Use saveFileHandler directly for USS saves (bypasses isDataset check in saveBuffer)
                  this.editorControl.saveFileHandler(fileContext, result).subscribe(() => {
                    // After successful USS save, clear dataset flag so subsequent Ctrl+S uses USS path
                    fileContext.model.isDataset = false;
                    obs.next('Save');
                  });
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
      if (model.uri.toString() === uri) {
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
