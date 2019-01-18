
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

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
import { ProjectStructure } from '../model/editor-project';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { Subscription } from 'rxjs/Subscription';
import { UtilsService } from '../utils.service';
import { HttpService } from '../http/http.service';
import { SnackBarService } from '../snack-bar.service';
import { Observer } from 'rxjs/Observer';
import { Http } from '@angular/http';
import * as _ from 'lodash';
import { MatDialog } from '@angular/material';
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';

export let EditorServiceInstance: BehaviorSubject<any> = new BehaviorSubject(undefined);
/**
 * Editor control service will communicate between tree list, editor and toolbar.
 * Such as open, close, select file.
 * @export
 * @class EditorControlService
 */
@Injectable()
export class EditorControlService implements ZLUX.IEditor, ZLUX.IEditorMultiBuffer, ZLUX.IEditorSyntaxHighlighting {
  public createFileEmitter: EventEmitter<string> = new EventEmitter();
  public openProject: EventEmitter<string> = new EventEmitter();
  public openDirectory: EventEmitter<string> = new EventEmitter();
  public openFileEmitter: EventEmitter<ProjectStructure> = new EventEmitter();
  public closeFile: EventEmitter<ProjectContext> = new EventEmitter();
  public selectFile: EventEmitter<ProjectContext> = new EventEmitter();
  public saveFile: EventEmitter<ProjectContext> = new EventEmitter();
  //public saveAllFile: EventEmitter<any> = new EventEmitter();
  public changeLanguage: EventEmitter<{ context: ProjectContext, language: string }> = new EventEmitter();
  public connToLS: EventEmitter<string> = new EventEmitter();
  public disFromLS: EventEmitter<string> = new EventEmitter();

  private _rootContext: BehaviorSubject<ProjectContext> = new BehaviorSubject<ProjectContext>(undefined);
  private _context: BehaviorSubject<ProjectContext[]> = new BehaviorSubject<ProjectContext[]>(undefined);
  private _projectNode: BehaviorSubject<ProjectStructure[]> = new BehaviorSubject<ProjectStructure[]>(undefined);
  private _editorCore: BehaviorSubject<any> = new BehaviorSubject<any>(undefined);
  private _editor: BehaviorSubject<any> = new BehaviorSubject<any>(undefined);
  private _openFileList: BehaviorSubject<ProjectContext[]> = new BehaviorSubject<ProjectContext[]>([]);

  private _projectName = '';


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
    private ngHttp: Http,
    private snackBar: SnackBarService,
    private dialog: MatDialog,
    @Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger
  ) {
    EditorServiceInstance.next(this);
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

  public initProjectContext(name: string, project: ProjectStructure[]): ProjectContext {
    // const mockProject = JSON.parse(JSON.stringify(project));
    const mockProject = project;
    let projectName = name ?
      name :
      (this.rootContext.getValue() && this.rootContext.getValue().name) ? this.rootContext.getValue().name : '';
    let root: ProjectContext = {
      id: '-1',
      name: projectName,
      model: {
        id: '-1',
        name: projectName,
        hasChildren: true,
        isDataset: false
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

  public get openFileList(): BehaviorSubject<ProjectContext[]> {
    return this._openFileList;
  }

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
    currentOpenFileList.push(fileContext);
    this._openFileList.next(currentOpenFileList);
  }

  public closeFileHandler(fileContext: ProjectContext) {
    !fileContext.opened ? this.log.warn(`File ${fileContext.name} already closed.`) : fileContext.opened = false;
    !fileContext.active ? this.log.warn(`File ${fileContext.name} already inactive.`) : fileContext.active = false;
    fileContext.changed = false;
    this._openFileList.next(this._openFileList.getValue().filter((file) => file.model.id !== fileContext.model.id));
  }

  public selectFileHandler(fileContext: ProjectContext) {
    for (const file of this._openFileList.getValue()) {
      if (file.id === fileContext.id) {
        file.opened = true;
        file.active = true;
      } else {
        file.opened = false;
        file.active = false;
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
        // const match = fileNode.id === node.id && fileNode.name === node.name;
        const match = fileNode.id === node.id;
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
  
  doSaving(context: ProjectContext, requestUrl: string, _activeFile: ProjectContext, results: any, isUntagged: boolean,
          _observer: Observer<void>, _observable: Observable<void>) {
    /* We must BASE64 encode the contents
     * of the file before it is sent
     * to the server.
     */
    var encodedFileContents = new Buffer(_activeFile.model.contents).toString('base64');
    
    /* Send the HTTP PUT request to the server
     * to save the file.
     */
    this.ngHttp.put(requestUrl, encodedFileContents).subscribe(r => {
      
      /* It was a new file, we
       * can set the new fileName. */
      if (results && !isUntagged) {
        _activeFile.name = results.fileName;
        _activeFile.model.name = results.fileName;
        _activeFile.model.encoding = this.getIntEncoding(results.encoding);
      }
      
      /* This will probably need to be changed
       * for the sake of accessibility.
       */
      this.snackBar.open(`${_activeFile.name} Saved!`, 'Close', { duration: 2000, panelClass: 'center' });
      
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
      this.openDirectory.next(results.directory);
      if (_observer != null) { _observer.next(null); }
    }, e => {
      let error = e.json().error;
      
      /* This will probably need to be changed
       * for the sake of accessibility.
       */
      this.snackBar.open(`${error}`, 'Close', { duration: 2000, panelClass: 'center' });
      this.openDirectory.next(results.directory);
    });
  }
  
  saveFileHandler(context?: ProjectContext, results?: any): Observable<void> {
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
      
      /* Request to get sessionID */
      requestUrl = ZoweZLUX.uriBroker.unixFileUri('contents', fileDir+'/'+fileName, sourceEncoding, targetEncoding, 
                                                  undefined, true, undefined, undefined);
      sessionID = 0;
      
      this.ngHttp.put(requestUrl, null).subscribe(r => {
        sessionID = r.json().sessionID;
        requestUrl = ZoweZLUX.uriBroker.unixFileUri('contents', fileDir+'/'+fileName, undefined, undefined, 
                                                    undefined, true, sessionID, true);   
        this.doSaving(context, requestUrl, _activeFile, results, isUntagged, _observer, _observable);
      }, e => {
        this.snackBar.open(`${_activeFile.name} could not be saved! There was a problem getting a sessionID. Please try again.`, 
                           'Close', { duration: 2000,   panelClass: 'center' });
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
      requestUrl = ZoweZLUX.uriBroker.unixFileUri('contents', results.directory+'/'+results.fileName, undefined, undefined,
                                                  undefined, true, undefined, undefined);
      sessionID = 0;
      
      this.ngHttp.put(requestUrl, null).subscribe(r => {
        sessionID = r.json().sessionID;
        requestUrl = ZoweZLUX.uriBroker.unixFileUri('contents', results.directory+'/'+results.fileName, sourceEncoding, targetEncoding,
                                                    undefined, true, sessionID, true);  
        this.doSaving(context, requestUrl, _activeFile, results, isUntagged, _observer, _observable);
      }, e => {
        this.snackBar.open(`${_activeFile.name} could not be saved! There was a problem getting a sessionID. Please try again.`, 
                           'Close', { duration: 2000,   panelClass: 'center' });
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
      throw new Error('File parent not exist! This may caused by you want a delete a root context.');
    }
  }

  createFile(name: string): ProjectContext {
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
    this.openFile(null, fileStructure);
    // return file context
    return fileContext;
    // return new Observable<ProjectContext>((observer) => {
    //   observer.next(<ProjectContext>fileContext);
    // });
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
     * Open a file into a buffer.
     *
     * @param   file         The path of the file that should be opened
     * @param   targetBuffer The buffer into which the file should be opened, or null to open a new buffer
     * @returns              An observable that pushes a handle to the buffer into which the file was opened
     */
  openFile(file: string, targetBuffer: ZLUX.EditorBufferHandle | null): Observable<ZLUX.EditorBufferHandle> {
    // targetBuffer is a context of project in GCE.
    let resultOpenObs: Observable<ZLUX.EditorBufferHandle>;
    let fileOpenSub: Subscription;
    let resultObserver: Observer<ZLUX.EditorBufferHandle>;

    resultOpenObs = new Observable((observer) => {
      resultObserver = observer;
    });

    fileOpenSub = this.fileOpened.subscribe((e: ZLUX.EditorFileOpenedEvent) => {
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

    this.openFileEmitter.emit(targetBuffer);
    return resultOpenObs;
  }
  /**
     * Save a buffer into a file.
     *
     * @param   buffer  The buffer that should be saved
     * @param   path    The path of the file into which the buffer should be saved, or null if the buffer is already associated with a file
     * @returns         An observable that pushes when the file has been saved
     */
  saveBuffer(buffer: ZLUX.EditorBufferHandle, path: string | null): Observable<void> {
    this.saveFile.emit(<ProjectContext>buffer);
    return this.saveFileHandler(buffer, path);
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
    return this.deleteFileHandler(buffer, force).map(x => {
      this.bufferDestroyed.next({ buffer: buffer, file: buffer.name });
      return null;
    });
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
      let bufferExt = this.utils.fileExtension(buffer.name);
      let results: string[] = [];
      this._editorCore.subscribe(monaco => {
        if (monaco != null) {
          let languages = monaco.languages.getLanguages();
          for (let lang of languages) {
            if (lang.extensions.indexOf(`.${bufferExt}`) > -1) {
              results.push(lang.id);
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

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
