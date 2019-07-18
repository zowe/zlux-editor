
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit, Input, OnChanges, SimpleChanges, Inject } from '@angular/core';
import { listen, MessageConnection } from 'vscode-ws-jsonrpc/lib';
import {
  BaseLanguageClient, CloseAction, ErrorAction,
  createMonacoServices, createConnection,
} from 'monaco-languageclient/lib';
import { MonacoService } from './monaco.service';
import { EditorControlService } from '../../../shared/editor-control/editor-control.service';
import { LanguageServerService } from '../../../shared/language-server/language-server.service';
import { Angular2InjectionTokens, Angular2PluginViewportEvents } from 'pluginlib/inject-resources';
import ReconnectingWebSocket from 'reconnecting-websocket';
import * as merge from 'deepmerge';

@Component({
  selector: 'app-monaco',
  templateUrl: './monaco.component.html',
  styleUrls: ['./monaco.component.scss']
})
export class MonacoComponent implements OnInit, OnChanges {
  @Input() options;
  @Input() editorFile;

  private currentLanguage = '';

  constructor(
    private monacoService: MonacoService,
    private editorControl: EditorControlService,
    private languageService: LanguageServerService,
    @Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger,
    @Inject(Angular2InjectionTokens.VIEWPORT_EVENTS) private viewportEvents: Angular2PluginViewportEvents) {
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    for (const input in changes) {
      if (input === 'editorFile' && changes[input].currentValue != null) {
        this.monacoService.openFile(
          changes[input].currentValue['context'],
          changes[input].currentValue['reload'],
          changes[input].currentValue['line']);
      }
    }
  }

  onMonacoInit(editor): void {
    this.editorControl.editor.next(editor);
    this.keyBinds(editor);
    this.viewportEvents.resized.subscribe(() => {
      editor.layout()
    });

    this.editorControl.updateLS.subscribe(() => {
      const lang = this.currentLanguage;
      this.onLanguageChange(undefined);
      this.onLanguageChange(lang);
    });
    this.editorControl.fileOpened.subscribe(f => {
      this.onLanguageChange(f.buffer.model.language);
    });
    this.editorControl.changeLanguage.subscribe(f => {
      this.onLanguageChange(f.language);
    });
    this.editorControl.closeFile.subscribe(f => {
      // fileOpened handles file closes as well, as long as there is another
      // open file for the editor to switch to. This listener handles when files
      // are closed without another open file

      if (this.editorControl.fetchActiveFile() === undefined) {
        this.onLanguageChange(undefined);
      }
    });
  }

  onLanguageChange(lang: string): void {
    if (this.currentLanguage === lang) {
      return;
    }

    if (this.currentLanguage) {
      this.closeLanguageServer(this.currentLanguage);
    }

    this.connectToLanguageServer(lang);
    this.currentLanguage = lang;
  }

  keyBinds(editor: any): void {
    const self = this;
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
        let sub = self.monacoService.saveFile(fileContext).subscribe(() => sub.unsubscribe());
        return null;
      }
    });
  }

  connectToLanguageServer(lang: string): void {
    const connExist = this.languageService.connections.map(x => x.name);

    if (connExist.indexOf(lang) < 0) {
      this.listenTo(lang);
    } else {
      this.log.warn(`${lang} server already started!`);
    }
  }

  closeLanguageServer(lang: string): void {
    this.languageService.connections
      .filter(c => {
        if (lang) {
          return c.name === lang;
        } else {
          return true;
        }
      })
      .forEach(c => {
        const conn = this.languageService.connections;
        c.connection.dispose();
        conn.splice(conn.indexOf(c), 1);
      });
  }

  listenTo(lang: string): void {
    const langUrl = this.createUrl(lang);

    if (!langUrl) {
      return;
    }

    const langWebSocket = this.createWebSocket(langUrl);
    const langService = createMonacoServices(this.editorControl.editor.getValue());

    this.log.info(`Connecting to ${lang} server`);

    listen({
      // langWebSocket should be casted to WebSocket but it doesn't work
      webSocket: langWebSocket as any,
      onConnection: connection => {
        // create and start the language client
        const languageClient = this.createLanguageClient(lang, connection, langService);
        const disposable = languageClient.start();
        connection.onClose(() => {
          connection.dispose()
        });
        connection.onDispose(() => {
          disposable.dispose();
          langWebSocket.close();
        });
        this.languageService.addConnection(lang, connection);
      }
    });
  }

  createUrl(language: string): string {
    return this.languageService.getLanguageUrl(language);
  }

  createLanguageClient(language: string, connection: MessageConnection, services: BaseLanguageClient.IServices): BaseLanguageClient {
    let options = {
      name: `${language} language client`,
      clientOptions: {
        // use a language id as a document selector
        documentSelector: [language],
        // disable the default error handler
        errorHandler: {
          error: () => ErrorAction.Continue,
          closed: () => CloseAction.DoNotRestart
        }
      } as any,
      // create a language client connection from the JSON RPC connection on demand
      connectionProvider: {
        get: (errorHandler, closeHandler) => {
          return Promise.resolve(createConnection(connection, errorHandler, closeHandler));
        }
      }
    } as any;

    options = merge(
      options,
      this.languageService.getLanguageOptions(language),
    );

    // services breaks merge with "too many recursions" so it is added after
    options.services = services;

    return new BaseLanguageClient(options);
  }

  createWebSocket(wsUrl: string): ReconnectingWebSocket {
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
