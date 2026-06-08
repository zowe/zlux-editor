
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit, Input, OnChanges, SimpleChanges, Inject, ViewChild, ElementRef } from '@angular/core';
// import { listen } from 'vscode-ws-jsonrpc';
// import { MessageConnection } from 'vscode-jsonrpc';
// import {
//   BaseLanguageClient, CloseAction, ErrorAction,
//   createMonacoServices, createConnection,
// } from 'monaco-languageclient';

import { MonacoService } from './monaco.service';
import { MonacoConfig } from './monaco.config';
import { EditorControlService } from '../../../shared/editor-control/editor-control.service';
import { LanguageServerService } from '../../../shared/language-server/language-server.service';
import { Angular2InjectionTokens, Angular2PluginViewportEvents } from 'pluginlib/inject-resources';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { Subscription } from 'rxjs';
import { EditorKeybindingService } from '../../../shared/editor-keybinding.service';
import { KeyCode } from '../../../shared/keycode-enum';
import { SnackBarService } from '../../../shared/snack-bar.service';
import { MessageDuration } from "../../../shared/message-duration";
import { debounceTime } from 'rxjs/operators';
import { UtilsService } from '../../../shared/utils.service';
import { ProjectStructure } from '../../../shared/model/editor-project';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmAction, DialogData } from '../../../shared/dialog/confirm-action/confirm-action-component';
const ReconnectingWebSocket = require('reconnecting-websocket');

// Matches absolute Unix-style paths, e.g. /u/user/file.txt or /etc/zowe/server.yaml.
// The negative lookbehind prevents matching path segments inside URIs (e.g. safkeyring://host/path)
// by requiring that the leading / is not preceded by an alphanumeric, path, or URI character.
const PATH_PATTERN = '(?<![a-zA-Z0-9._\\-@+#$~:/])\\/[a-zA-Z0-9._\\-@+#$~]+(?:\\/[a-zA-Z0-9._\\-@+#$~]+)*';
// Matches MVS dataset notation: DSNAME=A.B or DSNAME=A.B(MEMBER)
const DATASET_DSNAME_PATTERN =
  'DSNAME=([A-Z@#$][A-Z0-9@#$-]{0,7}(?:\\.[A-Z@#$][A-Z0-9@#$-]{0,7})+(?:\\([A-Z@#$][A-Z0-9@#$-]{0,7}\\))?)';

// Matches z/OS UNIX dataset path notation: //\'A.B\' or //\'A.B(MEMBER)\'
const DATASET_SLASH_PATTERN =
  "//'([A-Z@#$][A-Z0-9@#$-]{0,7}(?:\\.[A-Z@#$][A-Z0-9@#$-]{0,7})+(?:\\([A-Z@#$][A-Z0-9@#$-]{0,7}\\))?)'";

// Matches http:// or https:// URLs
const URL_PATTERN = 'https?://[^\\s<>{}\\[\\]]+';@Component({
  selector: 'app-monaco',
  templateUrl: './monaco.component.html',
  styleUrls: ['./monaco.component.scss']
})
export class MonacoComponent implements OnInit, OnChanges {
  // Usually, we can use 1 public field do our set/get in template, within Angular lifecycle. But we want custom setter. 
  private _monacoOptions: any;
  @Input() get monacoOptions(): any { return this._monacoOptions }
  set monacoOptions(options: any) {
    if (!options) { return; }
    this._monacoOptions = options;
    if (this.editor) {
      if (options.theme) {
        this.editorControl._setDefaultTheme(options.theme);
        this.editorControl.setTheme(options.theme);
      }

      this.editor.updateOptions(options);
      if (this.editor.getModel()) {
        this.updatePathDecorations(this.editor);
      }
    } else {
      this.log.debug("Editor options passed prior to editor init. Cached.");
    }
  };

  @Input() editorFile;
  @Input() compareDataset;
  @ViewChild('monacoEditor', { static: true })
  public monacoEditorRef: ElementRef;
  private editor: any;
  private monacoConfig: MonacoConfig;
  public showEditor: boolean;
  public showDiffViewer: boolean;
  private keyBindingSub: Subscription = new Subscription();
  private diffEditor: monaco.editor.IStandaloneDiffEditor | null;
  private pathLinkDecorationIds: string[] = [];
  private pathContentChangeDisposable: any = null;
  private pathDecorateTimeout: any = null;

  constructor(
    private monacoService: MonacoService,
    private editorControl: EditorControlService,
    private languageService: LanguageServerService,
    private appKeyboard: EditorKeybindingService,
    public snackBar: SnackBarService,
    private dialog: MatDialog,
    @Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger,
    @Inject(Angular2InjectionTokens.PLUGIN_DEFINITION) private pluginDefinition: ZLUX.ContainerPluginDefinition,
    @Inject(Angular2InjectionTokens.VIEWPORT_EVENTS) private viewportEvents: Angular2PluginViewportEvents) {
    this.keyBindingSub.add(this.appKeyboard.keydownEvent.subscribe((event) => {
      if (event.which === KeyCode.KEY_V) {
        this.editorControl.toggleDiffViewer.next('');
      }
    }));

  }

  ngOnInit() {
    this.monacoConfig = new MonacoConfig();
    let options = this._monacoOptions ? Object.assign({}, this._monacoOptions) : {};
    const hasModel = !!options.model;

    if (hasModel) {
      const model = monaco.editor.getModel(options.model.uri || '');
      if (model) {
        options.model = model;
        options.model.setValue('');
      } else {
        options.model = monaco.editor.createModel(options.model.value, options.model.language, options.model.uri);
      }
    }
    this.log.debug("New editor with options=", this.editorControl.sanitizeAndSetOptions(options));
    let editor = monaco.editor.create(this.monacoEditorRef.nativeElement, this.editorControl.sanitizeAndSetOptions(options));
    // let editor = monaco.editor.create(this.monacoEditorRef.nativeElement, (options));
    if (options.theme) {
      this.editorControl._setDefaultTheme(options.theme);
    }
    if (!hasModel) {
      editor.setValue('');
    }
    this.editor = editor;

    this.monacoConfig.onLoad();

    this.onMonacoInit(editor);
    monaco.editor.remeasureFonts();
    this.showEditor = true;

    this.editorControl.toggleDiffViewer.subscribe(() => {
      this.toggleDiffViewer();
    });

    this.editorControl.enableDiffViewer.subscribe(() => {
      this.showEditor = !this.monacoService.spawnDiffViewer();
      this.showDiffViewer = !this.showEditor;
      if (this.showDiffViewer) {
        this.diffEditor = this.monacoService.getDiffEditor();
      }
    });

    this.editor.onContextMenu((e: any) => {
      if (e.target.type === 3) { //if right click is on top of the line numbers
        this.viewportEvents.spawnContextMenu(e.event.browserEvent.clientX, e.event.browserEvent.clientY, [
          {
            text: 'Copy permalink',
            action: () => this.copyPermalink(e)
          },
          {
            text: 'Copy line',
            action: () => this.copyLine(e)
          }
        ], true)
      }
    });
  }

  handleDiffEditorResize() {
    if (this.showDiffViewer && this.diffEditor) {
      this.diffEditor.layout();
    }
  }

  focus(e: any) {
    this.editor.focus();
  }


  ngOnChanges(changes: SimpleChanges) {
    for (const input in changes) {
      if (input === 'editorFile' && changes[input].currentValue != null) {
        this.monacoService.openFile(
          changes[input].currentValue['context'],
          changes[input].currentValue['reload'],
          changes[input].currentValue['line']);
        //TODO: This is a workaround to instruct the editor to remeasure its container when switching from diff-viewer to code-editor
        if (this.showDiffViewer) {
          this.log.debug("ngOnChanges: refreshing layout")
          setTimeout(() => this.editor.layout(), 1);
        }
        this.showEditor = true;
        this.showDiffViewer = false;
        this.diffEditor = null;
      }
    }
  }


  onMonacoInit(editor) {
    this.editorControl.editor.next(editor);
    this.keyBinds(editor);
    this.setupPathLinkSupport(editor);
    this.viewportEvents.resized
      .pipe(debounceTime(100) as any)
      .subscribe(()=> {
        if (!this.showDiffViewer) {
          editor.layout()
        }
        this.handleDiffEditorResize();
    });
    /* disable for now...
  this.editorControl.connToLS.subscribe((lang) => {
    this.connectToLanguageServer(lang);
  });
  this.editorControl.disFromLS.subscribe((lang) => {
    this.closeLanguageServer(lang);
  });

  this.connectToLanguageServer();
  */
  }

  private setupPathLinkSupport(editor: any): void {
    this.updatePathDecorations(editor);

    const subscribeContentChanges = () => {
      if (this.pathContentChangeDisposable) {
        this.pathContentChangeDisposable.dispose();
      }
      this.pathContentChangeDisposable = editor.getModel()?.onDidChangeContent(() => {
        clearTimeout(this.pathDecorateTimeout);
        this.pathDecorateTimeout = setTimeout(() => this.updatePathDecorations(editor), 300);
      });
    };

    subscribeContentChanges();

    // Re-decorate whenever a different file model is loaded into this editor instance
    editor.onDidChangeModel(() => {
      this.pathLinkDecorationIds = [];
      subscribeContentChanges();
      this.updatePathDecorations(editor);
    });

    // Handle Ctrl/Cmd+Click to open recognized strings in the editor
    editor.onMouseDown((e: any) => {
      if (!e.event.ctrlKey && !e.event.metaKey) { return; }
      const position = e.target.position;
      if (!position) { return; }
      const model = editor.getModel();
      if (!model) { return; }

      const options = this._monacoOptions || {};
      const line = model.getLineContent(position.lineNumber);

      // Always intercept URL clicks to prevent Monaco's built-in link opener from firing,
      // regardless of the clickLinksUrl setting. Only show the confirmation dialog when enabled.
      const urlRegex = new RegExp(URL_PATTERN, 'g');
      {
        let match: RegExpExecArray | null;
        while ((match = urlRegex.exec(line)) !== null) {
          if (position.column >= match.index + 1 && position.column <= match.index + match[0].length + 1) {
            e.event.preventDefault();
            if (options.clickLinksUrl !== false) {
              this.handleUrlClick(match[0]);
            }
            return;
          }
        }
      }

      // Check dataset patterns: //'DS.NAME' and DSNAME=DS.NAME
      if (options.clickLinksDataset !== false) {
        const dsSlashRegex = new RegExp(DATASET_SLASH_PATTERN, 'g');
        let match: RegExpExecArray | null;
        while ((match = dsSlashRegex.exec(line)) !== null) {
          if (position.column >= match.index + 1 && position.column <= match.index + match[0].length + 1) {
            e.event.preventDefault();
            // Strip the //'' wrapper to extract the dataset name
            this.handleDatasetClick(match[0].substring(3, match[0].length - 1));
            return;
          }
        }
        const dsnameRegex = new RegExp(DATASET_DSNAME_PATTERN, 'g');
        while ((match = dsnameRegex.exec(line)) !== null) {
          if (position.column >= match.index + 1 && position.column <= match.index + match[0].length + 1) {
            e.event.preventDefault();
            // Strip the 'DSNAME=' prefix to extract the dataset name
            this.handleDatasetClick(match[0].substring('DSNAME='.length));
            return;
          }
        }
      }

      // Check Unix-style file/directory paths
      if (options.clickLinksFilePath !== false) {
        const pathRegex = new RegExp(PATH_PATTERN, 'g');
        let match: RegExpExecArray | null;
        while ((match = pathRegex.exec(line)) !== null) {
          if (position.column >= match.index + 1 && position.column <= match.index + match[0].length + 1) {
            e.event.preventDefault();
            this.handleFilePathClick(match[0]);
            return;
          }
        }
      }
    });
  }

  private updatePathDecorations(editor: any): void {
    const model = editor.getModel();
    if (!model) { return; }

    const options = this._monacoOptions || {};
    const enableFilePath = options.clickLinksFilePath !== false;
    const enableDataset = options.clickLinksDataset !== false;
    const enableUrl = options.clickLinksUrl !== false;

    const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];
    const lineCount = model.getLineCount();

    // Each tuple: [patternString, enabled]
    const patterns: [string, boolean][] = [
      [PATH_PATTERN, enableFilePath],
      [DATASET_DSNAME_PATTERN, enableDataset],
      [DATASET_SLASH_PATTERN, enableDataset],
      [URL_PATTERN, enableUrl]
    ];

    for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
      const line = model.getLineContent(lineNumber);
      for (const [patternStr, enabled] of patterns) {
        if (!enabled) { continue; }
        const regex = new RegExp(patternStr, 'g');
        let match: RegExpExecArray | null;
        while ((match = regex.exec(line)) !== null) {
          newDecorations.push({
            range: new monaco.Range(lineNumber, match.index + 1, lineNumber, match.index + match[0].length + 1),
            options: {
              inlineClassName: 'path-link',
              hoverMessage: { value: 'Ctrl+Click to open' }
            }
          });
        }
      }
    }

    this.pathLinkDecorationIds = editor.deltaDecorations(this.pathLinkDecorationIds, newDecorations);
  }

  // Checks if a Unix path is a file or directory before acting
  private handleFilePathClick(path: string): void {
    this.editorControl.getFileMetadata(path).subscribe({
      next: (response: any) => {
        if (response && response.directory === true) {
          const dialogRef = this.dialog.open(ConfirmAction, {
            data: <DialogData>{
              title: 'Open Folder',
              warningMessage: `Navigate the file explorer to folder: ${path}?`
            }
          });
          dialogRef.afterClosed().subscribe((confirmed: boolean) => {
            if (confirmed) {
              this.editorControl.openDirectory.next(path);
            }
          });
        } else {
          this.openPathInEditor(path);
        }
      },
      error: () => {
        // Metadata unavailable: attempt to open as a file
        this.openPathInEditor(path);
      }
    });
  }

  private handleDatasetClick(datasetName: string): void {
    this.log.debug(`Opening dataset from ctrl+click: ${datasetName}`);
    this.editorControl.openDataset.next({ datasetName: datasetName.toUpperCase() });
  }

  private handleUrlClick(url: string): void {
    const dialogRef = this.dialog.open(ConfirmAction, {
      data: <DialogData>{
        title: 'Open URL',
        warningMessage: `Open "${url}" in a new browser tab?`
      }
    });
    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    });
  }

  private openPathInEditor(path: string): void {
    const lastSlash = path.lastIndexOf('/');
    const fileName = lastSlash >= 0 ? path.substring(lastSlash + 1) : path;
    const directory = lastSlash > 0 ? path.substring(0, lastSlash) : '/';

    const fileNode: ProjectStructure = {
      id: path,
      name: fileName,
      fileName: fileName,
      path: directory,
      hasChildren: false,
      isDataset: false
    };

    this.log.debug(`Opening file path from ctrl+click: ${path}`);
    this.editorControl.openFileEmitter.emit(fileNode);
  }

  keyBinds(editor: any) {
    let self = this;
    //editor.addAction({
    // An unique identifier of the contributed action.
    //id: 'save-all',

    // A label of the action that will be presented to the user.
    //label: 'Save All',

    // An optional array of keybindings for the action.
    //keybindings: [
    // tslint:disable-next-line:no-bitwise
    //monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S
    // chord
    // tslint:disable-next-line:no-bitwise
    // monaco.KeyMod.chord(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_M)
    //],

    // A precondition for this action.
    //precondition: null,

    // A rule to evaluate on top of the precondition in order to dispatch the keybindings.
    //keybindingContext: null,

    //contextMenuGroupId: 'file',

    //contextMenuOrder: 1.1,

    // Method that will be executed when the action is triggered.
    // @param editor The editor instance is passed in as a convenience
    //run: function (ed) {
    //self.editorControl.saveAllFile.emit();
    //return null;
    //}
    //});
    editor.addAction({
      // An unique identifier of the contributed action.
      id: 'save',

      // A label of the action that will be presented to the user.
      label: 'Save',

      // An optional array of keybindings for the action.
      keybindings: [
        // tslint:disable-next-line:no-bitwise
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS
        // chord
        // tslint:disable-next-line:no-bitwise
        // monaco.KeyMod.chord(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_M)
      ],

      // A precondition for this action.
      precondition: null,

      // A rule to evaluate on top of the precondition in order to dispatch the keybindings.
      keybindingContext: null,

      contextMenuGroupId: 'file',

      contextMenuOrder: 1.2,

      // Method that will be executed when the action is triggered.
      // @param editor The editor instance is passed in as a convenience
      run: function (ed) {
        self.saveFile();
        return null;
      }
    });
  }

  copyPermalink(event: any) {
    const lines = event.target.position.lineNumber;
    const activeFile = this.editorControl.fetchActiveFile();
    let filePath = '';
    let link = '';
    if (activeFile.model.isDataset) {
      filePath = activeFile.model.path;
      link = `${window.location.origin}${window.location.pathname}?pluginId=${this.pluginDefinition.getBasePlugin().getIdentifier()}:data:${encodeURIComponent(`{"type":"openDataset","name":"${filePath}","lines":"${lines}","toggleTree":true}`)}`;
    } else {
      filePath = activeFile.model.path + "/" + activeFile.model.name;
      link = `${window.location.origin}${window.location.pathname}?pluginId=${this.pluginDefinition.getBasePlugin().getIdentifier()}:data:${encodeURIComponent(`{"type":"openFile","name":"${filePath}","lines":"${lines}","toggleTree":true}`)}`;
    }
    navigator.clipboard.writeText(link).then(() => {
      this.log.debug("Permalink copied to clipboard");
    }).catch((error) => {
      console.error("Failed to copy permalink Error: " + error);
      this.snackBar.open("Failed to copy permalink. Error: " + error, 'Dismiss', { duration: MessageDuration.Short, panelClass: 'center' });
    });
  }

  copyLine(event: any) {
    const lines = event.target.position.lineNumber;
    const lineContent = this.editor.getModel().getLineContent(lines);
    navigator.clipboard.writeText(lineContent).then(() => {
      this.log.debug("Line copied to clipboard");
    }).catch((error) => {
      console.error("Failed to copy line. Error: " + error);
      this.snackBar.open("Failed to copy line. Error: " + error, 'Dismiss', { duration: MessageDuration.Short, panelClass: 'center' });
    });
  }

  saveFile() {
    let fileContext = this.editorControl.fetchActiveFile();
    if (!fileContext || !fileContext.model) {
      this.snackBar.open('Warning: Cannot save, no content found', 'Dismiss', { duration: MessageDuration.Medium, panelClass: 'center' });
      return;
    }
    let directory = fileContext.model.path || this.editorControl.activeDirectory;
    let sub = this.monacoService.saveFile(fileContext, directory).subscribe(() => sub.unsubscribe());
  }

  // connectToLanguageServer(lang?: string) {
  //   let languages = this.languageService.getSettings().endpoint;
  //   let connExist = this.languageService.connections.map(x => x.name);

  //   for (let language in languages) {
  //     if (lang) {
  //       if (lang === language && connExist.indexOf(language) < 0) {
  //         this.listenTo(language);
  //       } else {
  //         this.log.warn(`${language} server already started!`);
  //       }
  //     } else {
  //       if (connExist.indexOf(language) < 0) {
  //         this.listenTo(language);
  //       } else {
  //         this.log.warn(`${language} server already started!`);
  //       }
  //     }
  //   }
  // }

  closeLanguageServer(lang?: string) {
    this.languageService.connections
      .filter(c => {
        if (lang) {
          return c.name === lang;
        } else {
          return true;
        }
      })
      .forEach(c => {
        let conn = this.languageService.connections;
        c.connection.dispose();
        conn.splice(conn.indexOf(c), 1);
      });
  }

  // listenTo(lang: string) {
  //   const langUrl = this.createUrl(lang);
  //   const langWebSocket = this.createWebSocket(langUrl);
  //   const langService = createMonacoServices(this.editorControl.editor.getValue());

  //   this.log.info(`Connecting to ${lang} server`);

  //   listen({
  //     webSocket: langWebSocket,
  //     onConnection: (connection: any) => {
  //       // create and start the language client
  //       const languageClient = this.createLanguageClient(lang, connection, langService);
  //       const disposable = languageClient.start();
  //       connection.onClose(() => disposable.dispose());
  //       connection.onDispose(() => disposable.dispose());
  //       this.languageService.addConnection(lang, connection);
  //     }
  //   });
  // }

  createUrl(language: string): string {
    return this.languageService.getLanguageUrl(language);
  }

  // createLanguageClient(language: string, connection: MessageConnection, services: BaseLanguageClient.IServices): BaseLanguageClient {
  //   return new BaseLanguageClient({
  //     name: `${language} language client`,
  //     clientOptions: {
  //       // use a language id as a document selector
  //       documentSelector: [language],
  //       // disable the default error handler
  //       errorHandler: {
  //         error: () => ErrorAction.Continue,
  //         closed: () => CloseAction.DoNotRestart
  //       }
  //     },
  //     services,
  //     // create a language client connection from the JSON RPC connection on demand
  //     connectionProvider: {
  //       get: (errorHandler, closeHandler) => {
  //         return Promise.resolve(createConnection(connection, errorHandler, closeHandler));
  //       }
  //     }
  //   });
  // }

  // createWebSocket(wsUrl: string): WebSocket {
  //   const socketOptions = {
  //     maxReconnectionDelay: 10000,
  //     minReconnectionDelay: 1000,
  //     reconnectionDelayGrowFactor: 1.3,
  //     connectionTimeout: 10000,
  //     maxRetries: 20,
  //     debug: false
  //   };
  //   return new ReconnectingWebSocket(wsUrl, undefined, socketOptions);
  // }

  toggleDiffViewer(): void {
    if (this.showDiffViewer) {
      this.showDiffViewer = false;
      this.showEditor = true;
      this.diffEditor.dispose();
    }
    else {
      this.showEditor = !this.monacoService.spawnDiffViewer();
      this.showDiffViewer = !this.showEditor;
      if (this.showDiffViewer) {
        this.diffEditor = this.monacoService.getDiffEditor();
      }
    }
  }

  acceptChange(): void {
    this.showDiffViewer = false;
    this.showEditor = true;
    this.editorControl.acceptChangeEmitter.emit();
  }

  overwriteDataset(): void {
    this.showDiffViewer = false;
    this.showEditor = true;
    this.editorControl.overwriteDatasetEmitter.emit();
  }


}
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
