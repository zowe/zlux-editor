
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
import { Injectable, Inject } from '@angular/core';
import { EventEmitter } from '@angular/core';
import { ProjectContext } from '../model/project-context';
import { ProjectStructure, DatasetAttributes } from '../model/editor-project';
import { BehaviorSubject } from 'rxjs';
import { Observable } from 'rxjs';
import { Subject } from 'rxjs';
import { Subscription } from 'rxjs';
import { UtilsService } from '../utils.service';
import { HttpService } from '../http/http.service';
import { SnackBarService } from '../snack-bar.service';
import { Observer } from 'rxjs';
import * as _ from 'lodash';
import { MatDialog } from '@angular/material/dialog';
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';
import { MessageDuration } from "../message-duration";
import { OverwriteDatasetComponent } from '../../shared/dialog/overwrite-dataset/overwrite-dataset.component';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { HttpHeaders, HttpParams } from '@angular/common/http';
import { map } from 'rxjs/operators';

let stateCache = {};
let lastFile;
//Unsupported DS types
const unsupportedTypes: Array<string> = ['G', 'B', 'C', 'D', 'I', 'R'];
const MAX_CONTENT_LENGTH = 5242880;

export let EditorServiceInstance: BehaviorSubject<any> = new BehaviorSubject(undefined);
/**
 * Editor control service will communicate between tree list, editor and toolbar.
 * Such as open, close, select file.
 * @export
 * @class EditorControlService
 */
@Injectable({
  providedIn: 'root',
})
export class EditorControlService implements ZLUX.IEditor, ZLUX.IEditorMultiBuffer, ZLUX.IEditorSyntaxHighlighting {
  public createFileEmitter: EventEmitter<string> = new EventEmitter();
  public toggleTree: EventEmitter<string> = new EventEmitter();
  public toggleDiffViewer: EventEmitter<string> = new EventEmitter();
  public enableDiffViewer: EventEmitter<string> = new EventEmitter();
  public createDirectory: EventEmitter<string> = new EventEmitter();
  public openProject: EventEmitter<string> = new EventEmitter();
  public openDirectory: EventEmitter<string> = new EventEmitter();
  public openDataset: EventEmitter<any> = new EventEmitter();
  public toggleFileTreeSearch: EventEmitter<string> = new EventEmitter();
  public closeAllFiles: EventEmitter<string> = new EventEmitter();
  public undoCloseAllFiles: EventEmitter<string> = new EventEmitter();
  public refreshLayout: EventEmitter<string> = new EventEmitter();
  public activeDirectory = '';
  public refreshFileMetadatdaByPath: EventEmitter<string> = new EventEmitter();
  public deleteFile: EventEmitter<string> = new EventEmitter();
  public openFileEmitter: EventEmitter<ProjectStructure> = new EventEmitter();
  public languageRegistered: EventEmitter<ProjectStructure> = new EventEmitter();
  public closeFile: EventEmitter<ProjectContext> = new EventEmitter();
  public undoCloseFile: EventEmitter<string> = new EventEmitter();
  public selectFile: EventEmitter<ProjectContext> = new EventEmitter();
  public saveFile: EventEmitter<ProjectContext> = new EventEmitter();
  public initializedFile: EventEmitter<ProjectContext> = new EventEmitter();
  //public saveAllFile: EventEmitter<any> = new EventEmitter();
  public changeLanguage: EventEmitter<{ context: ProjectContext, language: string }> = new EventEmitter();
  public connToLS: EventEmitter<string> = new EventEmitter();
  public disFromLS: EventEmitter<string> = new EventEmitter();
  public openSettings: EventEmitter<void> = new EventEmitter(); //open settings menu, a menu-type projectcontext
  public closeSettings: EventEmitter<void> = new EventEmitter(); 
  public selectMenu: EventEmitter<ProjectContext> = new EventEmitter(); //select menu-type projectcontext
  public changeTheme: EventEmitter<string> = new EventEmitter();
  public compareDatasetEmitter: EventEmitter<ProjectContext> = new EventEmitter();
  public acceptChangeEmitter: EventEmitter<void> = new EventEmitter()
  public overwriteDatasetEmitter: EventEmitter<void> = new EventEmitter()

  private _rootContext: BehaviorSubject<ProjectContext> = new BehaviorSubject<ProjectContext>(undefined);
  private _context: BehaviorSubject<ProjectContext[]> = new BehaviorSubject<ProjectContext[]>(undefined);
  private _projectNode: BehaviorSubject<ProjectStructure[]> = new BehaviorSubject<ProjectStructure[]>(undefined);
  private _editorCore: BehaviorSubject<any> = new BehaviorSubject<any>(undefined);
  private _editor: BehaviorSubject<any> = new BehaviorSubject<any>(undefined);
  public _openFileList: BehaviorSubject<ProjectContext[]> = new BehaviorSubject<ProjectContext[]>([]);
  private _defaultTheme: string;

  private _projectName = '';
  public _isTestLangMode = false;
  /* TODO: This can be extended to persist in future server storage mechanisms. 
  (For example, when a user re-opens the Editor they are plopped back into their workflow of tabs) */
  private previousSessionData: any = {};
  public saveCursorPosition = true; 
  public compareDataset = false;

  /**
   * An event that is triggered when a file is opened inside the editor.
   */
  fileOpened: Subject<ZLUX.EditorFileOpenedEvent> = new Subject();

  /**
   * An event that is triggered when a file is saved inside the editor.
   */
  bufferSaved: Subject<ZLUX.EditorBufferSavedEvent> = new Subject;

  /**
 * An event that is triggered when a new buffer is created.
 */
  bufferCreated: Subject<ZLUX.EditorBufferCreatedEvent> = new Subject();

  /**
   * An event that is triggered when a buffer is destroyed.
   */
  bufferDestroyed: Subject<ZLUX.EditorBufferDestroyedEvent> = new Subject();

  constructor(
    private utils: UtilsService,
    private http: HttpService,
    public snackBar: SnackBarService,
    private dialog: MatDialog,
    @Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger
  ) {
    EditorServiceInstance.next(this);
  }

  public saveCursorState() {
    let editor = this.editor.getValue();
    this.editor.subscribe((value)=> {
      if (value) {
        if(!value._modelData) {
          return;
        }
        editor.cursor = value._modelData.cursor;
        editor.viewModel = value._modelData.viewModel;
      } 
    });  
    //when quickly switching, cursor or viewmodel may not exist
    if (editor && editor.cursor && editor.viewModel && lastFile) {
      let lastCursor = editor.cursor.saveState();
      let lastView = editor.viewModel.saveState();
      this.log.debug(`saved cursor`,lastCursor,`file`,lastFile);
      stateCache[lastFile] = {cursor:lastCursor, view: lastView};
    }
  }

  public get rootContext(): BehaviorSubject<ProjectContext> {
    return this._rootContext;
  }
  public get context(): BehaviorSubject<ProjectContext[]> {
    return this._context;
  }

  public get editorCore(): BehaviorSubject<any> {
    return this._editorCore;
  }

  public get editor(): BehaviorSubject<any> {
    return this._editor;
  }

  public get projectNode(): BehaviorSubject<ProjectStructure[]> {
    return this._projectNode;
  }

  public get projectName() {
    return this._projectName;
  }

  public set projectName(value: string) {
    this._projectName = value;
  }

  public setProjectNode(value: ProjectStructure[]) {
    this._projectNode.next(value);
  }

  public setTheme(theme: string) {
    try {
      this.editor.getValue()._themeService.setTheme(theme);
      this.changeTheme.next(theme); // TODO: Change Editor UI for different themes (i.e. Vs)
    }
    catch (e) {
      this.log.warn("EditorControl setTheme failed with error", e);
    }
  }

  public initProjectContext(name: string, project: ProjectStructure[]): ProjectContext {
    // const mockProject = JSON.parse(JSON.stringify(project));
    const mockProject = project;
    let projectName;
    let isDataset = !name.startsWith('/');
    let lParen = name.indexOf('(');
    
    if (isDataset) {
      projectName = lParen ? name.substring(lParen+1, name.length-1) : name;
    } else {
      projectName = name ?
        name :
        (this.rootContext.getValue() && this.rootContext.getValue().name) ? this.rootContext.getValue().name : '';
    }
    let root: ProjectContext = {
      id: '-1',
      name: projectName,
      model: {
        id: '-1',
        name: projectName,
        hasChildren: true,
        isDataset: isDataset,
        path: name
      },
      opened: false,
      active: false,
      changed: false,
      children: [],
      tempChildren: [],
    };
    let childrenContext: ProjectContext[] = <ProjectContext[]>this.generateProjectContext(mockProject);
    childrenContext.map(node => node.parent = root);
    root.children = childrenContext;
    // if there is a root context create for a temp file before
    if (this._rootContext.getValue()) {
      let oldRoot = this._rootContext.getValue();
      if (oldRoot.children && oldRoot.children.length > 0) {
        // move temp children to new project.
        root.tempChildren = oldRoot.tempChildren.map(node => node.parent = root);
      }
    }
    this._context.next(childrenContext);
    this._rootContext.next(root);
    return root;
  }

  public registerLanguage(languageDefinition, highlighter?:any) {
    monaco.languages.register(languageDefinition);
    if (highlighter) {
      monaco.languages.setMonarchTokensProvider(languageDefinition.id, highlighter);
    }
    this.languageRegistered.next(languageDefinition);
  }

  public get openFileList(): BehaviorSubject<ProjectContext[]> {
    return this._openFileList;
  }

  //almost like selectfilehandler, except altering the list of opened files
  public openFileHandler(fileContext: ProjectContext) {
    for (const file of this._openFileList.getValue()) {
      file.opened = false;
      file.active = false;
    }
    if (fileContext) {
      fileContext.opened ? this.log.warn(`File ${fileContext.name} already open.`) : fileContext.opened = true;
      fileContext.active ? this.log.warn(`File ${fileContext.name} already active.`) : fileContext.active = true;
    }
    let currentOpenFileList = this._openFileList.getValue();
    if (!(currentOpenFileList.filter(function(e) { return e.model.path === fileContext.model.path && e.name === fileContext.name && e.id === fileContext.id; }).length > 0)) {
      /* We only want to add this file into the list if it doesn't already belong there */
      currentOpenFileList.push(fileContext);
    }
    this._openFileList.next(currentOpenFileList);
  }

  public closeFileHandler(fileContext: ProjectContext) {
    let cacheFileName = `${fileContext.model.fileName}:${fileContext.model.path}`;
    this.previousSessionData.stateCache = stateCache;
    this.previousSessionData._openFileList = this._openFileList.getValue();
    if (cacheFileName) {
      this.log.debug(`Clearing cache for`,cacheFileName);
      delete stateCache[cacheFileName];
    }
    !fileContext.opened ? this.log.warn(`File ${fileContext.name} already closed.`) : fileContext.opened = false;
    !fileContext.active ? this.log.warn(`File ${fileContext.name} already inactive.`) : fileContext.active = false;
    fileContext.changed = false;
    this._openFileList.next(this._openFileList.getValue().filter((file) => (file.model.fileName !== fileContext.model.fileName || file.model.path !== fileContext.model.path)));
  }

  public undoCloseFileHandler() {
    this.log.debug("Attempting to restore session with data: ", this.previousSessionData);
    if (this.previousSessionData.stateCache) {
      stateCache = this.previousSessionData.stateCache;
    }
    if (this.previousSessionData._openFileList) {
      this._openFileList.next(this.previousSessionData._openFileList);
    }
  }

  public closeAllHandler() {
    this.previousSessionData.stateCache = stateCache;
    /* As our cached list, we save all files *minus* the previously opened file. This is because
    that file will get opened as the last editor file in code-editor.component */
    this.previousSessionData._openFileList = this._openFileList.getValue();

    this.log.debug('Clearing all cache for files');
    stateCache = {};
    let currentOpenFileList = new Array<ProjectContext>(0);
    this._openFileList.next(currentOpenFileList);
  }

  public undoCloseAllHandler() {
    this.log.debug("Attempting to restore session with data: ", this.previousSessionData);
    if (this.previousSessionData.stateCache) {
      stateCache = this.previousSessionData.stateCache;
    }
    if (this.previousSessionData._openFileList) {
      this._openFileList.next(this.previousSessionData._openFileList);
    }
  }

  public removeActiveFromAllFiles() {
    for (const file of this.openFileList.getValue()) {
      file.opened = false;
      file.active = false;
    }
  }

  public selectFileHandler(fileContext: ProjectContext) {
    this.compareDataset = false;
    if(this.saveCursorPosition) {  
      this.saveCursorState();
    }
    //fileopen to be called soon after
    let fileOpenSub: Subscription = this.fileOpened.subscribe((e: ZLUX.EditorFileOpenedEvent) => {
      let model = e.buffer.model;
      lastFile = `${model.fileName}:${model.path}`;
      let cache = stateCache[lastFile];
      this.log.debug(`restoring cache`,cache,`file`,lastFile);
      if (cache){
        let editor = this.editor.getValue();
        this.editor.subscribe((value)=> {
          if(value._modelData) {
            editor.cursor = value._modelData.cursor;
            editor.viewModel = value._modelData.viewModel;
            editor._view = value._modelData.view
            editor.cursor.restoreState(cache.cursor);
            const smallView = editor.viewModel.reduceRestoreState(cache.view);
            editor._view.restoreState(smallView);
          }
        })  
      }
      this.checkForAndSetReadOnlyMode(model);
      fileOpenSub.unsubscribe();
    });
    
    for (const file of this._openFileList.getValue()) {
      if (file.model.fileName === fileContext.model.fileName && file.model.path === fileContext.model.path) {
        file.opened = true;
        file.active = true;
      } else {
        file.opened = false;
        file.active = false;
      }
    }
  }

  public checkForAndSetReadOnlyMode(model: any): void {
    let editor = this.editor.getValue();
    // Set write mode to true by default
    editor.updateOptions({ readOnly: false });
    // Current unsupported types:
    // B - Generation data group
    // C - VSAM Cluster
    // D - VSAM Data
    // G - Alternate index
    // I - VSAM Index
    // R - VSAM Path
    
    if (model) {
      if (model.datasetAttrs) {
        //VSAM & GDG are currently not supported for write mode
        if (unsupportedTypes.includes(model.datasetAttrs.csiEntryType)) {
          editor.updateOptions({ readOnly: true });
        }
        // TODO: Uncomment this in case PDSE is not supported for Dataset writing
        //PDSE is not supported for write mode
        // if (model.datasetAttrs.dsorg.isPDSE && model.datasetAttrs.dsorg.isPDSE == true) {
        //   editor.updateOptions({ readOnly: true });
        // }
      }
    }
  }

  public fetchFileContext(fileNode: ProjectStructure, context?: ProjectContext[]): ProjectContext {
    let fileContext: ProjectContext;
    if (context == null && this._context.getValue()) {
      context = this._context.getValue().concat(this._rootContext.getValue().tempChildren ? this._rootContext.getValue().tempChildren : []);
    }
    if (context != null) {
      for (const node of context) {
        const match = fileNode.name === node.name && fileNode.path === node.model.path;
        if (match) {
          fileContext = node;
          break;
        } else if (node.children) {
          fileContext = this.fetchFileContext(fileNode, node.children);
          if (fileContext != null) { break; }
        }
      }
    }
    return fileContext;
  }

  public fetchActiveFile(): ProjectContext {
    let activeFile = this._openFileList.getValue().filter(x => x.active === true)[0];
    return activeFile;
  }

  public fetchRightOfActiveFile(): ProjectContext {
    let openFileListVal = this._openFileList.getValue();
    let adjIdx = (openFileListVal.indexOf(this.fetchActiveFile())+1)%openFileListVal.length;
    return openFileListVal[adjIdx];
  }

  public fetchLeftOfActiveFile(): ProjectContext {
    let openFileListVal = this._openFileList.getValue();
    let adjIdx = (openFileListVal.indexOf(this.fetchActiveFile())-1)%openFileListVal.length;
    if (adjIdx < 0) {
      adjIdx = openFileListVal.length-1;
    }
    return openFileListVal[adjIdx];
  }

  public generateProjectContext(
    project: ProjectStructure | ProjectStructure[],
    parent?: ProjectContext
  ): ProjectContext | ProjectContext[] {
    if (project == null) {
      return null;
    }

    if (Array.isArray(project)) {
      let result: ProjectContext[];
      result = [];
      for (const item of project) {
        let _context: ProjectContext;
        _context = {
          id: item.id ? item.id : null,
          name: item.name,
          opened: false,
          active: false,
          changed: false,
          model: item,
          parent: parent,
        };
        _context.children = <ProjectContext[]>this.generateProjectContext(item.children, _context);
        result.push(_context);
      }
      return result;
    } else {
      let _context = <ProjectContext>{
        id: project.id,
        name: project.name,
        opened: false,
        active: false,
        children: this.generateProjectContext(project.children),
        model: project,
      };

      if (parent != null) {
        _context.parent = parent;
      }
      return _context;
    }
  }

  public getStringEncoding(ccsid: number): string | null {
    let s: string | null;
    switch(ccsid) {
      case 0: 
        s = "UNTAGGED";
        break;
      case -1:  
        s = "BINARY";
        break;
      case 819: 
        s = "ISO-8859-1";
        break;
      case 1047: 
        s = "IBM-1047";
        break;     
      case 1208: 
        s = "UTF-8";  
        break;
      case 1200: 
        s = "UTF-16"; 
        break;
      case 1201: 
        s = "UTF-16-BE";  
        break;
      case 1202: 
        s = "UTF-16-LE";
        break;
      default: 
        s = null;
    }
    return s;
  }
  
  getIntEncoding(ccsid: string): number | undefined {
    let x: number;
    switch(ccsid) {
      case "UNTAGGED": 
        x = 0;
        break;
      case "BINARY":  
        x = -1;
        break;
      case "ISO-8859-1": 
        x = 819;
        break;
      case "IBM-1047": 
        x = 1047;
        break;     
      case "UTF-8": 
        x = 1208;        
        break;
      case "UTF-16": 
        x = 1200;
        break;
      case "UTF-16-BE": 
        x = 1201;
        break;
      case "UTF-16-LE": 
        x = 1202;
        break;
      default: 
        x = undefined;
    }
    return x;    
  }
  
  getFileMetadata(path:string): Observable<any>{
    let url:string = ZoweZLUX.uriBroker.unixFileUri('metadata', path);
    //TODO: Fix ZSS bug where "%2F" is not properly processed as a "/" character
    url = url.split("%2F").join("/");
    return this.http.get(url);
  }

  doSaving(context: ProjectContext, requestUrl: string, _activeFile: ProjectContext, results: any, isUntagged: boolean,
          _observer: Observer<void>, _observable: Observable<void>, saveAs?: boolean) {
    /* We must BASE64 encode the contents
     * of the file before it is sent
     * to the server.
     */
    var encodedFileContents = new Buffer(_activeFile.model.contents).toString('base64');
    
    /* Send the HTTP PUT request to the server
     * to save the file.
     */
    this.http.put(requestUrl, encodedFileContents).subscribe(r => {
      // if we are doing SaveAs then do not update the openedFileList
      if(saveAs){
        this.snackBar.open(`${results.fileName} has been saved!`, 'Close', { duration: MessageDuration.Short, panelClass: 'center' });
        this.openDirectory.next(results.directory);
      }
      /* It was a new file, we
       * can set the new fileName. */
      else{
         if (results && !isUntagged) {
          _activeFile.name = results.fileName;
          _activeFile.model.name = results.fileName;
          _activeFile.model.fileName = results.fileName;
          _activeFile.model.encoding = this.getIntEncoding(results.encoding);
          _activeFile.model.path = results.directory;
          _activeFile.temp = false;
        }
        /* This will probably need to be changed
        * for the sake of accessibility.
        */
        this.snackBar.open(`${_activeFile.name} has been saved!`, 'Close', { duration: MessageDuration.Short, panelClass: 'center' });
        /* Send buffer saved event */
        this.bufferSaved.next({ buffer: _activeFile.model.contents, file: _activeFile.model.name });
        let fileList = this.openFileList.getValue()
          .map(file => {
            if (file.id === context.id) {
              file.changed = false;
            }
            return file;
          });
        this.openFileList.next(fileList);
        if (results) {
        this.openDirectory.next(results.directory);
        }
        if (_observer != null) { _observer.next(null); }
      }
    }, e => {
      let error = e.error.error;
      
      /* This will probably need to be changed
       * for the sake of accessibility.
       */
      this.snackBar.open(`${error}`, 'Close', { duration: MessageDuration.Medium, panelClass: 'center' });
      this.openDirectory.next(results.directory);
    });
  }

  public isContentValidForDatasetWrite(content: string[], datasetAttrs: DatasetAttributes): boolean | string {
    //TODO: validation of record length that is aware of how DBCS will effect actual length
    //FB must have exactly lrecl, VB must have no more than lrecl. content cant be undefined.
    if (!content) {
      return 'No Content';
    }
    if(datasetAttrs.recfm.recordLength === 'U') {
      return 'Cannot save a dataset with Undefined record format';
    }
    let maxRecordLen = datasetAttrs.dsorg.maxRecordLen;
    for (let i = 0; i < content.length; i++) {
      let record = content[i];
      if (record.length > maxRecordLen) {
        return `Line ${i+1} exceeds record length limit of ${maxRecordLen}`;
      }
    }
    if (JSON.stringify({records:content}).length > MAX_CONTENT_LENGTH) {
      return 'Content over currently supported max size ('+ (MAX_CONTENT_LENGTH/(1024*1024)) +'MB)';
    }
    return true;
  }
  
  saveDatasetHandler(context?: ProjectContext, destinationOverride?: any): Observable<void> {
    const _openDataset = this.openFileList.getValue();
    const editor = this._editor.getValue();
    const forceWrite = false;
    let _activeDataset: ProjectContext;
    let _observer: Observer<void>;
    let _observable: Observable<void>;
    let contents;
    if (editor) {
      contents = editor.getValue();
    }
    if (context != null) {
      _activeDataset = context;
    } else {
      _activeDataset = _openDataset.filter(dataset => dataset.active === true)[0];
    }
    const model = _activeDataset.model;
    const fullName = _activeDataset.model.fileName;

    _observable = new Observable((observer) => {
      _observer = observer;
      if (contents === undefined) {
        this.snackBar.open(`Cannot retrieve contents to save`, "Close", {duration: MessageDuration.Medium, panelClass: 'center'});
        return;
      }
      if (!destinationOverride && fullName) {
        contents = editor.getValue().split('\n');
        const requestUrl = ZoweZLUX.uriBroker.datasetContentsUri(fullName);
        this.log.debug(`Should save contents to dataset. dataset=${fullName}, route=${requestUrl}`);
        let result = this.isContentValidForDatasetWrite(contents, model.datasetAttrs);
        if (result === true) {
          this.saveDataset(context, _activeDataset, forceWrite, _observer, _observable);
        } else {
          this.snackBar.open(`Content invalid for saving to dataset. Reason=${result}`, 'Close', { duration:MessageDuration.Long, panelClass: 'center'});
        }
      } else {
        //dataset is new or needs some alteration we can't do yet
        this.snackBar.open(`${_activeDataset.name} could not be saved, feature not yet implemented.`, 
                           'Close', { duration: MessageDuration.Long,   panelClass: 'center' });    
      }
    });
    return _observable;
  }

  saveDataset(context: ProjectContext, activeDataset: ProjectContext, forceWrite: boolean, _observer: Observer<void>, _observable: Observable<void>): void {
    const editor = this._editor.getValue();
    let contents;
    const model = activeDataset.model;
    const fullName = model.fileName;
    const etag = model.etag;
    contents = model.contents.split('\n');
    let headers = new HttpHeaders({'Etag': etag})
    let reqBody = {records:contents};
    if(etag) {
      reqBody['etag'] = etag;
    } else {
      forceWrite = true;
    }
    const requestUrl = ZoweZLUX.uriBroker.datasetContentsUri(fullName);
    let parameters = new HttpParams();
    parameters = parameters.append('force', forceWrite);
    const options = {
      headers: headers,
      params: parameters
    }
    this.http.post(requestUrl, reqBody, options).subscribe(r => {
      model.etag = r.etag;
      this.snackBar.open(`${activeDataset.name} has been saved!`,'Close', {duration:MessageDuration.Short, panelClass: 'center'});
      /* Send buffer saved event */
      this.bufferSaved.next({ buffer: activeDataset.model.contents, file: activeDataset.model.name });
      this.openFileList.getValue()
        .map(file => {
          if (file.id === context.id) {
            file.changed = false;
          }
          return file;
        });
      if (_observer != null) {
        _observer.next(null);
      }
    }, e => {
      const error = e.error;
      if(error) {
        // TODO: Below message will vary depending upon the response from the server.
        if(error.includes('Provided etag did not match system etag. To write, read the dataset again and resolve the difference, then retry.')) {
          if(!this.compareDataset) {
            let overwriteRef = this.dialog.open(OverwriteDatasetComponent, {
              width: '500px',
              data: { fileName: fullName}
            });
            overwriteRef.afterClosed().subscribe(option => {
              if (option === 'force') {
                forceWrite = true;
                this.saveDataset(context, activeDataset, forceWrite, _observer, _observable);
              }
              if (option === 'compare') {
                this.compareFiles(context, activeDataset, _observer, _observable);
              }
            });
          }
        } else {
          this.snackBar.open(`${activeDataset.name} could not be saved! ${error}. Error code=${e.status}`,
          'Close', { duration: MessageDuration.Long,   panelClass: 'center' });
        }
      } else {
        this.snackBar.open(`${activeDataset.name} could not be saved!`,
        'Close', { duration: MessageDuration.Long,   panelClass: 'center' });
      }
    }); 
  }

  compareFiles(fileContext: ProjectContext, activeDataset: ProjectContext, _observer: Observer<void>, _observable: Observable<void>): void {
    let updatedFileContext: ProjectContext;
    let acceptChangeSub: Subscription;
    let overwriteSub: Subscription;
    const reqContent = ZoweZLUX.uriBroker.datasetContentsUri(activeDataset.model.fileName);
    this.http.get(reqContent).subscribe((response:any) => {
      updatedFileContext = _.cloneDeep(fileContext);
      updatedFileContext.model.etag = response.etag;
      updatedFileContext.model.contents = (response.records).join('\n');
      this.compareDataset = true;
      this.compareDatasetEmitter.emit(updatedFileContext);
      fileContext.active = true;
      acceptChangeSub = this.acceptChangeEmitter.subscribe(() => {
        this.compareDataset = false;
        this.removeActiveFromAllFiles();
        this.closeFileHandler(fileContext);
        this.closeFile.next(fileContext);
        this.openBuffer('', updatedFileContext.model);
        this.refreshLayout.next('');
        acceptChangeSub.unsubscribe();
        overwriteSub.unsubscribe();
      })
      overwriteSub = this.overwriteDatasetEmitter.subscribe(() => {
        this.compareDataset = false;
        this.saveDataset(fileContext, activeDataset, true, _observer, _observable);
        overwriteSub.unsubscribe();
        acceptChangeSub.unsubscribe();
      })
    }, e => {
      this.snackBar.open(`${fileContext.name} could not be compared!`,
      'Close', { duration: MessageDuration.Long,   panelClass: 'center' });
    })
  }

  saveFileHandler(context?: ProjectContext, results?: any, saveAs?: boolean): Observable<void> {
    const _openFile = this.openFileList.getValue();
    let _activeFile: ProjectContext;
    let _observer: Observer<void>;
    let _observable: Observable<void>;
    let sessionID: number;
    
    /* A new file is not "untagged"
     * in this case. I'm referring to
     * a file as untagged if it is currently
     * untagged in USS.
     */
    let isUntagged: boolean;

    if (context != null) {
      _activeFile = context;
    } else {
      _activeFile = _openFile.filter(file => file.active === true)[0];
    }
    
    let requestUrl: string;
    
    /* The code editor is visualizing
     * always in UTF-8.
     */
    let sourceEncoding = "UTF-8"
    
    /* If the file is untagged */
    if (this.getStringEncoding(_activeFile.model.encoding) === "UNTAGGED") {
      isUntagged = true;
    }
    
    /* If the user selected an encoding, we
     * we use it.
     */
    let targetEncoding: string;
    if (results || isUntagged) {
      targetEncoding = results.encoding;
    }
    /* Use the encoding of the file (tag) */
    else {
      targetEncoding = this.getStringEncoding(_activeFile.model.encoding);
    }
    let fileName;
    let fileDir;
    
    _observable = new Observable((observer) => {
      _observer = observer;
    });
    
    /* If the file already exists or it's
     * untagged, then we can use it's current
     * file properties.
     */
    if (!results || isUntagged) {
      fileDir = ['/', '\\'].indexOf(_activeFile.model.path.substring(0, 1)) > -1 ?
        _activeFile.model.path.substring(1) :
        _activeFile.model.path;
        fileName = _activeFile.model.fileName ? _activeFile.model.fileName : _activeFile.model.name;
        const forceOverwrite = true;
        /* Request to get sessionID */
      requestUrl = ZoweZLUX.uriBroker.unixFileUri('contents',
                                                  fileDir+'/'+fileName,
                                                  { sourceEncoding,
                                                    targetEncoding,
                                                    forceOverwrite });
      sessionID = 0;
      this.http.put(requestUrl, null).subscribe(r => {
        sessionID = r.sessionID;
        requestUrl = ZoweZLUX.uriBroker.unixFileUri('contents',
                                                    fileDir+'/'+fileName,
                                                    { sessionID,
                                                      forceOverwrite,
                                                      lastChunk: true });
        this.doSaving(context, requestUrl, _activeFile, results, isUntagged, _observer, _observable, saveAs);
        /** Update the new encoding value, in opeFileList Models */
        let index = this._openFileList.value.findIndex(item => item.id === _activeFile.id);
        this._openFileList.value[index].model.encoding = this.getIntEncoding(targetEncoding);
        this.refreshFileMetadatdaByPath.next('/'+fileDir+'/'+fileName);
      }, e => {
        this.snackBar.open(`${_activeFile.name} could not be saved! There was a problem getting a sessionID. Please try again.`, 
                          'Close', { duration: MessageDuration.Long,   panelClass: 'center' });
      });
    }
    
    /* The file is newly created, so
     * we are using the data returned
     * from the dialog.
     */
    else {
      /* If the user started it with a slash
       * remove it for when the URL is formatted.
       * This should be validated in the dialog
       * in future enhancements.
       */
      if (results.directory.charAt(0) === '/') {
        results.directory.substr(1);
      }
      
      /* Request to get sessionID */
      requestUrl = ZoweZLUX.uriBroker.unixFileUri('contents',
                                                  results.directory+'/'+results.fileName,
                                                  { sourceEncoding,
                                                    targetEncoding,
                                                    forceOverwrite: true });
      sessionID = 0;
      
      this.http.put(requestUrl, null).subscribe(r => {
        sessionID = r.sessionID;
        requestUrl = ZoweZLUX.uriBroker.unixFileUri('contents',
                                                    results.directory+'/'+results.fileName,
                                                    { forceOverwrite: true,
                                                      sessionID,
                                                      lastChunk: true });
        this.doSaving(context, requestUrl, _activeFile, results, isUntagged, _observer, _observable, saveAs);
        /** Update the new encoding value, in opeFileList Models */
          let index = this._openFileList.value.findIndex(item => item.id === _activeFile.id);
          this._openFileList.value[index].model.encoding = this.getIntEncoding(targetEncoding);
          this.refreshFileMetadatdaByPath.next('/'+fileDir+'/'+fileName);
        }, e => {
          this.snackBar.open(`${_activeFile.name} could not be saved! There was a problem getting a sessionID. Please try again.`, 
                            'Close', { duration: MessageDuration.Long,   panelClass: 'center' });
        });
      }
    return _observable;
  }

  //saveAllFileHandler() {
    //const _openFile = this.openFileList.getValue();
    //let promiseList = [];
    //let requestUrl = ENDPOINTS.saveFile;

    //for (let file of _openFile) {
      //let saveUrl = this.utils.formatUrl(requestUrl, { dataset: file.parent.name, member: file.name });
      //let savePromise = this.http.put(saveUrl, { contents: file.model.contents }).toPromise();
      //promiseList.push(savePromise);
    //}

    //Promise.all(promiseList).then(r => {
      //this.snackBar.open(`All Saved!`, 'Close', { duration: 2000, panelClass: 'center' });
      //let fileList = this.openFileList.getValue().map(file => {
        //file.changed = false;
        //return file;
      //});
      //this.openFileList.next(fileList);
    //});
  //}

  deleteFileHandler(context?: ProjectContext, force?: boolean): Observable<void> {
    let targetFile = context ? context : this.fetchActiveFile();
    if (context.parent) {
      let parent = context.parent.children;
      for (let child of parent) {
        if (child.id === targetFile.id) {
          if (force) {
            parent.splice(parent.indexOf(child), 1);
          } else {
            if (!child.changed) {
              parent.splice(parent.indexOf(child), 1);
            } else {
              // TODO: pop up a window to warn user
            }
          }
        }
      }
      let temp = context.parent.tempChildren;
      if (temp) {
        for (let child of temp) {
          if (child.id === targetFile.id) {
            if (force) {
              temp.splice(temp.indexOf(child), 1);
            } else {
              if (!child.changed) {
                temp.splice(temp.indexOf(child), 1);
              } else {
                // TODO: pop up a window to warn user
              }
            }
          }
        }
      }
      return new Observable(obs => obs.next(null));
    } else {
      throw new Error('File parent does not exist! This may have been caused by you wanting to a delete a root context.');
    }
  }

  getFocus(): void {
    // get focus of editor
    this.editor.getValue().focus();
  }

  createFile(name?: string): ProjectContext {
    if(name===undefined) {
      name = this.getNewFileName();
    }

    let rootContext = this.rootContext.getValue();
    let fileStructure: ProjectStructure = {
      id: _.uniqueId(),
      name: name,
      fileName: name,
      hasChildren: false,
      isDataset: false // TODO
    };
    let fileContext = <ProjectContext>this.generateProjectContext(fileStructure, rootContext);
    fileContext.temp = true;
    if (!rootContext) {
      rootContext = this.initProjectContext('', []);
    }
    // set parent
    fileContext.parent = rootContext;
    // update root context
    rootContext.tempChildren.push(<ProjectContext>fileContext);
    // broadcast root context & create file event
    this.rootContext.next(rootContext);
    this.createFileEmitter.next(name);
    // let new file open in editor
    this.openBuffer(null, fileStructure);
    // get focus of editor
    setTimeout(()=> {
      this.editor.getValue().focus();
    });
    //trigger initializedFile
    this.initializedFile.next(fileContext);
    // return file context
    return fileContext;
    // return new Observable<ProjectContext>((observer) => {
    //   observer.next(<ProjectContext>fileContext);
    // });
  }

  getNewFileName() {
    let name:string='new';
    let num:number= 1;
    let fileName = `${name}${num}`;
    let openFiles = this._openFileList.getValue().map((file)=>file.model.name);
    
    while(openFiles.indexOf(fileName)>=0) {
      fileName = `${name}${++num}`;
    }

    return fileName;
  }
   
  /* ============= ZLUX code editor implement ============= */
  /* ============= Class IEditor ============= */
  /**
     * Get a handle to the primary (currently focused) buffer in the editor.
     *
     * @returns A handle to the primary buffer in the editor (projectContext)
     */
  getPrimaryBuffer(): ZLUX.EditorBufferHandle {
    let openFileList = this._openFileList.getValue();
    let primaryFile = openFileList.filter(file => file.active === true)[0];

    if (primaryFile != null) {
      return primaryFile;
    } else {
      return null;
    }
  }
  /**
   * Get the path of the file currently open in a given buffer.
   *
   * @param   buffer  A handle to the buffer
   * @returns         The path of the file open in that buffer, or null if the buffer is not associated with a file.
   */
  getBufferPath(buffer: ZLUX.EditorBufferHandle): string | null {
    let targetStructure: ProjectStructure = <ProjectStructure>buffer.model;
    let targetFile = this.fetchFileContext(targetStructure);
    return targetFile.name;
  }
  /**
     * Open a file into a buffer - this prepares to alert others when that is done, 
     * but actually emits a request for help to do so, and awaits fullfilment
     *
     * @param   file         The path of the file that should be opened
     * @param   targetBuffer The buffer into which the file should be opened, or null to open a new buffer
     * @param   selectedLines Array that stores the first and last selected lines
     * @returns              An observable that pushes a handle to the buffer into which the file was opened
     */
  openBuffer(file: string, targetBuffer: ZLUX.EditorBufferHandle | null, selectedLines?: any): Observable<ZLUX.EditorBufferHandle> {
    // targetBuffer is a context of project in GCE.
    let resultOpenObs: Observable<ZLUX.EditorBufferHandle>;
    let fileOpenSub: Subscription;
    let resultObserver: Observer<ZLUX.EditorBufferHandle>;
    // this.saveCursorState();
    
    resultOpenObs = new Observable((observer) => {
      resultObserver = observer;
    });
    fileOpenSub = this.fileOpened.subscribe((e: ZLUX.EditorFileOpenedEvent) => {
      let model = e.buffer.model;
      lastFile = `${model.fileName}:${model.path}`;
      //If we are opening a file with selected line or lines via URL link to file
      if(selectedLines && selectedLines.length > 0){
        let firstLine = 1;
        let lastLine = 1;
        if(selectedLines.length == 1){
          firstLine = Number(selectedLines[0]);
          lastLine = firstLine;
        } else if(selectedLines.length == 2){
          firstLine = Number(selectedLines[0]);
          lastLine = Number(selectedLines[1]);
        }
        let editor = this.editor.getValue();
        this.editor.subscribe((value)=> {
          value.revealRangeAtTop(new monaco.Range(firstLine, 1, lastLine, 1));
          value.deltaDecorations(
            [],
            [
              {
                range: new monaco.Range(firstLine, 1, lastLine, 1000000),
                options: {
                   marginClassName: 'myLineDecoration'
                }
              }
            ]
          );
        })
      }
      // if have subscriber
      if (resultObserver) {
        if (e.buffer != null && e.buffer.id === targetBuffer.id) {
          resultObserver.next(e.buffer);
        } else {
          resultObserver.next(null);
        }
      }

      fileOpenSub.unsubscribe();
    });

    //tell someone else to open it!
    this.openFileEmitter.emit(targetBuffer);
    return resultOpenObs;
  }

  loadDirectory(path: string) {
    this.log.debug('Loading directory=',path);
    this.openDirectory.next(path);
  }
  /**
     * Save a buffer into a file.
     *
     * @param   buffer  The buffer that should be saved
     * @param   path    The path of the file into which the buffer should be saved, or null if the buffer is already associated with a file
     * @returns         An observable that pushes when the file has been saved
     */
  saveBuffer(buffer: ZLUX.EditorBufferHandle, path: string | null,  saveAs?: boolean): Observable<void> {
    this.saveFile.emit(<ProjectContext>buffer);
    if (buffer.model.isDataset) {
      return this.saveDatasetHandler(buffer, path);
    } else {
      return this.saveFileHandler(buffer, path, saveAs);
    }
  }
  /**
    * Get the contents of a buffer.
    *
    * @param   buffer  The buffer that should be read
    * @returns         An observable that pushes the contents of the buffer.
    */
  getBufferContents(buffer: ZLUX.EditorBufferHandle): Observable<string> {
    let observe = new Observable<string>((observer) => {
      const { next, error } = observer;
      let context = <ProjectContext>buffer;
      if (context.model && context.model.contents) {
        next(context.model.contents);
      } else {
        error(new Error(`Content does not exist in ${context.name}`));
      }
    });
    return observe;
  }
  /**
     * Checks if the buffer has been modified.
     *
     * @param   buffer The buffer to be checked
     * @returns        An observable that pushes whether or not the buffer has been modified
     */
  isBufferModified(buffer: ZLUX.EditorBufferHandle): Observable<boolean> {
    let context = <ProjectContext>buffer;

    let observe = new Observable<boolean>((observer) => {
      const { next, error } = observer;
      context.changed ? next(true) : next(false);
    });
    return observe;
  }
  /* ============= Class IEditorMultiBuffer ============= */
  /**
     * Get the set of open buffers.
     *
     * @returns   An array of handles for all buffers open in the editor
     */
  getOpenBuffers(): ZLUX.EditorBufferHandle[] {
    return this.openFileList.getValue();
  }

  /**
   * Create a new buffer in the editor.
   *
   * @returns   A handle to the newly created buffer.
   */
  createBuffer(): ZLUX.EditorBufferHandle {
    let createdContext = this.createFile('');
    this.bufferCreated.next({ buffer: createdContext });
    return this.createBuffer;
  }
  /**
   * Destroys an existing buffer inside the editor.
   *
   * @param   buffer  The buffer that should be destroyed
   * @param   force   True to close the buffer even if it contains unsaved content, false to prompt the user
   * @returns       An observable that pushes when buffer is destroyed
   */
  destroyBuffer(buffer: ZLUX.EditorBufferHandle, force: boolean): Observable<void> {
    return this.deleteFileHandler(buffer, force).pipe(map(x => {
      this.bufferDestroyed.next({ buffer: buffer, file: buffer.name });
      return null;
    }));
  }
  /* ============= Class IEditorMultiBuffer ============= */
  /**
   * Sets the highlighting mode for a given buffer.
   *
   * @param buffer   The buffer for which the highlighting mode should be set
   * @param language The highlighting mode for the buffer
   */
  setHighlightingModeForBuffer(buffer: ZLUX.EditorBufferHandle, language: string): void {
    this.changeLanguage.next({ context: buffer, language: language });
  }

  _setDefaultTheme(theme: string) {
    this._defaultTheme = theme;
  }

  /**
   * Sets the theme for a unique language, if necessary.
   *
   * @param language The desired language
   */
  setThemeForLanguage(language: string): void {
    // This is a pleasant option to preserve the classic ISPF aesthetic but we can
    // change the structure depending on what we do with themes (create modified versions
    // of the regular/dark/black themes and add our language specific tokens?)
    switch(language) {
      // TODO: Once we expand editor themes, we can think about how we handle languages like JCL
      // for ex. maybe have ispf, ispf-dark, and ispf-black that groups multiple commonly used languages
      // in ISPF that we decide to create syntax highlighting for,
      case 'jcl': { 
        monaco.editor.setTheme('jcl-dark');
        break; 
      }
      case 'rexx': {
        monaco.editor.setTheme('rexx-dark');
        break; 
      }
      default: {
        if (this._defaultTheme) {
          monaco.editor.setTheme(this._defaultTheme);
        }
        break; 
      } 
    } 
  }

  /**
   * Gets the highlighting mode for a given buffer.
   *
   * @param   buffer The buffer for which the highlighting mode should be checked
   * @returns        The highlighting mode of the buffer
   */
  getHighlightingModeForBuffer(buffer: ZLUX.EditorBufferHandle): string {
    let _context = <ProjectContext>buffer;
    return _context.model.language;
  }

  /**
   * Gets recommendations for the highlighting mode based on the contents or file associated with a given buffer.
   *
   * @param   buffer The buffer for which the recommendations should be issued
   * @returns        An observable that pushes an array of recommended highlighting modes for the buffer
   */
  getRecommendedHighlightingModesForBuffer(buffer: ZLUX.EditorBufferHandle): Observable<string[]> {
    return new Observable<string[]>((obs) => {
      let bufferExt = this.utils.fileExtension(buffer.name).toLowerCase();
      const fullName = buffer.model.isDataset ? buffer.model.fileName : buffer.name
      const parenIndex = fullName.indexOf('(');
      const isPds = buffer.model.isDataset && ( parenIndex != -1);
      const name = isPds ? fullName.substring(0,parenIndex).toLowerCase() : fullName.toLowerCase();
      let results: string[] = [];
      //TODO there is precedence to observe. File keywords wins, but not implemented yet.
      // Consider if you have an ASM.JCLLIB dataset
      this._editorCore.subscribe(monaco => {
        if (monaco != null) {
          let languages = monaco.languages.getLanguages();
          if (buffer.model.isDataset) {
            //to solve asm.jcllib, search back-to-front, all langs before moving to next portion of name
            const portions = name.split('.');
            for (let portion of portions) {
              for (let i = 0; i < languages.length; i++) {
                let lang = languages[i];
                for (let extension of lang.extensions) {
                  if (portion === extension
                      || portion === extension+'lib') {
                    results.push(lang.id);
                    i = languages.length;
                    break;
                  }
                }
              }
            }
          } else {
            for (let lang of languages) {
              if (lang?.extensions?.indexOf(`.${bufferExt}`) > -1) {
                results.push(lang.id);
                break;
              }
            }
          }
          for (let lang of languages) {
            if (lang.filenamePatterns) {
              for (let pattern of lang.filenamePatterns) {
                let regex = new RegExp(pattern);
                if (regex.test(name)) {
                  results.push(lang.id);
                  break;
                }
              }
            }
          }
          obs.next(results);
        }
      });
    });

  }
  /**
   * Gets the set of supported highlighting modes for this editor.
   *
   * @returns An observable that pushes an array of supported highlighting modes
   */
  getSupportedHighlightingModes(): Observable<string[]> {
    let observer;
    let observable = new Observable<string[]>((obs) => {
      observer = obs;
      this._editorCore.subscribe(monaco => {
        if (monaco != null) {
          if (observer) { observer.next(monaco.languages.getLanguages().map(language => language.id)); }
        }
      });
    });

    return observable;
  }
  /* ============= Class IComponent ============= */
  /**
  * Obtains the DOM element into which the component was rendered.
  *
  * @returns The DOM element where the component was rendered
  */
  getDOMElement(): HTMLElement {
    return document.getElementById('monaco-editor-container').getElementsByClassName('editor-container')[0] as HTMLElement;
  }
  /**
   * Obtains all of the component's capabilities.
   *
   * @returns An array of the component's capabilities
   */
  getCapabilities(): ZLUX.Capability[] {
    return [
      ZLUX.EditorCapabilities.Editor,
      // ZLUX.EditorCapabilities.EditorMultiBuffer,
      // ZLUX.EditorCapabilities.EditorSyntaxHighlighting,
    ];
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
