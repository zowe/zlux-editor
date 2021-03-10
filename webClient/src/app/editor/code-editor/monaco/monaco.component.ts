
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit, Input, OnChanges, SimpleChanges, Inject, ViewChild, ElementRef } from '@angular/core';
import { listen, MessageConnection } from 'vscode-ws-jsonrpc/lib';
import {
  BaseLanguageClient, CloseAction, ErrorAction,
  createMonacoServices, createConnection,
} from 'monaco-languageclient/lib';
import { MonacoService } from './monaco.service';
import { MonacoConfig } from './monaco.config';
import { EditorControlService } from '../../../shared/editor-control/editor-control.service';
import { LanguageServerService } from '../../../shared/language-server/language-server.service';
import { Angular2InjectionTokens, Angular2PluginViewportEvents } from 'pluginlib/inject-resources';
import * as monaco from 'monaco-editor';
const ReconnectingWebSocket = require('reconnecting-websocket');

@Component({
  selector: 'app-monaco',
  templateUrl: './monaco.component.html',
  styleUrls: ['./monaco.component.scss']
})
export class MonacoComponent implements OnInit, OnChanges {
  private _options: any;
  
  @Input()
  get options(): any { return this._options; }
  set options(options: any) {
    if (!options) {return;}
    this._options = options;
    if (this.editor) {
      if (options.theme) {
        this.editorControl._setDefaultTheme(options.theme);
        this.editorControl.setTheme(options.theme);
      }
      
      this.editor.updateOptions(options);
    } else {
      this.log.debug("Editor options passed prior to editor init. Cached.");
    }
  };
  
  @Input() editorFile;
  @ViewChild('monacoEditor')
  monacoEditorRef: ElementRef;
  private editor: any;
  private monacoConfig: MonacoConfig;

  constructor(
    private monacoService: MonacoService,
    private editorControl: EditorControlService,
    private languageService: LanguageServerService,
    @Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger,
    @Inject(Angular2InjectionTokens.VIEWPORT_EVENTS) private viewportEvents: Angular2PluginViewportEvents) {
  }

  ngOnInit() {
    this.monacoConfig = new MonacoConfig();
    let options = this._options ? Object.assign({}, this._options) : {};
    const hasModel = !!options.model;
    
    if (hasModel) {
      const model = monaco.editor.getModel(options.model.uri || '');
      if(model) {
        options.model = model;
        options.model.setValue('');
      } else {
        options.model = monaco.editor.createModel(options.model.value, options.model.language, options.model.uri);
      }
    }
    this.log.debug("New editor with options=",options);
    let editor = monaco.editor.create(this.monacoEditorRef.nativeElement, options);
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
  }

  focus(e: any) {
    this.editor.focus();
  }
  layout(e: any) {
    this.editor.layout();
  }


  ngOnChanges(changes: SimpleChanges) {
    for (const input in changes) {
      if (input === 'editorFile' && changes[input].currentValue != null) {
        this.monacoService.openFile(
          changes[input].currentValue['context'],
          changes[input].currentValue['reload'],
          changes[input].currentValue['line']);
      }
    }
  }

  onMonacoInit(editor) {
    this.editorControl.editor.next(editor);
    this.keyBinds(editor);
    this.viewportEvents.resized.subscribe(()=> {
      editor.layout()
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
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S
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
        let fileContext = self.editorControl.fetchActiveFile();
        if (fileContext.model.isDataset){
          let sub = self.monacoService.saveDataset(fileContext, self.editorControl.activeDirectory).subscribe(() => sub.unsubscribe());
        } else {
          let sub = self.monacoService.saveFile(fileContext, self.editorControl.activeDirectory).subscribe(() => sub.unsubscribe());
        }        
        return null;
      }
    });
  }

  connectToLanguageServer(lang?: string) {
    let languages = this.languageService.getSettings().endpoint;
    let connExist = this.languageService.connections.map(x => x.name);

    for (let language in languages) {
      if (lang) {
        if (lang === language && connExist.indexOf(language) < 0) {
          this.listenTo(language);
        } else {
          this.log.warn(`${language} server already started!`);
        }
      } else {
        if (connExist.indexOf(language) < 0) {
          this.listenTo(language);
        } else {
          this.log.warn(`${language} server already started!`);
        }
      }
    }
  }

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

  listenTo(lang: string) {
    const langUrl = this.createUrl(lang);
    const langWebSocket = this.createWebSocket(langUrl);
    const langService = createMonacoServices(this.editorControl.editor.getValue());

    this.log.info(`Connecting to ${lang} server`);

    listen({
      webSocket: langWebSocket,
      onConnection: connection => {
        // create and start the language client
        const languageClient = this.createLanguageClient(lang, connection, langService);
        const disposable = languageClient.start();
        connection.onClose(() => disposable.dispose());
        connection.onDispose(() => disposable.dispose());
        this.languageService.addConnection(lang, connection);
      }
    });
  }

  createUrl(language: string): string {
    return this.languageService.getLanguageUrl(language);
  }

  createLanguageClient(language: string, connection: MessageConnection, services: BaseLanguageClient.IServices): BaseLanguageClient {
    return new BaseLanguageClient({
      name: `${language} language client`,
      clientOptions: {
        // use a language id as a document selector
        documentSelector: [language],
        // disable the default error handler
        errorHandler: {
          error: () => ErrorAction.Continue,
          closed: () => CloseAction.DoNotRestart
        }
      },
      services,
      // create a language client connection from the JSON RPC connection on demand
      connectionProvider: {
        get: (errorHandler, closeHandler) => {
          return Promise.resolve(createConnection(connection, errorHandler, closeHandler));
        }
      }
    });
  }

  createWebSocket(wsUrl: string): WebSocket {
    const socketOptions = {
      maxReconnectionDelay: 10000,
      minReconnectionDelay: 1000,
      reconnectionDelayGrowFactor: 1.3,
      connectionTimeout: 10000,
      maxRetries: 20,
      debug: false
    };
    return new ReconnectingWebSocket(wsUrl, undefined, socketOptions);
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
