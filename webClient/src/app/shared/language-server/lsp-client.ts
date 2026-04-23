/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
const ReconnectingWebSocket = require('reconnecting-websocket');

/**
 * Lightweight LSP client that connects to a language server over WebSocket
 * using JSON-RPC 2.0 protocol. Registers Monaco editor providers for
 * completion, hover, and diagnostics.
 */
export class LspClient {
  private ws: any;
  private nextId = 1;
  private pending = new Map<number, { resolve: Function, reject: Function }>();
  private notificationHandlers = new Map<string, Function>();
  private serverCapabilities: any = null;
  private disposables: monaco.IDisposable[] = [];
  private documentVersions = new Map<string, number>();
  private connected = false;

  constructor(
    private language: string,
    private logger: any
  ) {}

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const socketOptions = {
        maxReconnectionDelay: 10000,
        minReconnectionDelay: 1000,
        reconnectionDelayGrowFactor: 1.3,
        connectionTimeout: 10000,
        maxRetries: 10,
        debug: false
      };
      this.ws = new ReconnectingWebSocket(url, undefined, socketOptions);

      this.ws.onopen = () => {
        this.connected = true;
        this.logger.info(`LSP WebSocket connected for ${this.language}`);
        resolve();
      };

      this.ws.onerror = (e: any) => {
        this.logger.warn(`LSP WebSocket error for ${this.language}:`, e);
        if (!this.connected) {
          reject(e);
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.logger.info(`LSP WebSocket closed for ${this.language}`);
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          this.handleMessage(event.data);
        } catch (e) {
          this.logger.warn(`LSP message parse error for ${this.language}:`, e);
        }
      };
    });
  }

  private sendRequest(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected'));
        return;
      }
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      this.send({ jsonrpc: '2.0', id, method, params });

      // Timeout pending requests after 30s
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`LSP request ${method} timed out`));
        }
      }, 30000);
    });
  }

  private sendNotification(method: string, params: any): void {
    if (!this.connected) { return; }
    this.send({ jsonrpc: '2.0', method, params });
  }

  private send(msg: any): void {
    const content = JSON.stringify(msg);
    this.ws.send(content);
  }

  private handleMessage(data: string): void {
    const msg = JSON.parse(data);
    if (msg.id !== undefined && this.pending.has(msg.id)) {
      const handler = this.pending.get(msg.id);
      this.pending.delete(msg.id);
      if (msg.error) {
        handler.reject(msg.error);
      } else {
        handler.resolve(msg.result);
      }
    } else if (msg.method) {
      const handler = this.notificationHandlers.get(msg.method);
      if (handler) {
        handler(msg.params);
      }
    }
  }

  onNotification(method: string, handler: Function): void {
    this.notificationHandlers.set(method, handler);
  }

  async initialize(rootUri: string): Promise<any> {
    const result = await this.sendRequest('initialize', {
      processId: null,
      rootUri: rootUri,
      capabilities: {
        textDocument: {
          completion: {
            completionItem: {
              snippetSupport: true,
              documentationFormat: ['markdown', 'plaintext']
            }
          },
          hover: {
            contentFormat: ['markdown', 'plaintext']
          },
          signatureHelp: {
            signatureInformation: {
              parameterInformation: { labelOffsetSupport: true }
            }
          },
          synchronization: {
            didSave: true
          },
          publishDiagnostics: {
            relatedInformation: true
          }
        }
      }
    });
    this.serverCapabilities = result.capabilities;
    this.sendNotification('initialized', {});
    this.logger.info(`LSP initialized for ${this.language}, capabilities:`, this.serverCapabilities);
    return result;
  }

  didOpen(uri: string, languageId: string, text: string): void {
    const version = 1;
    this.documentVersions.set(uri, version);
    this.sendNotification('textDocument/didOpen', {
      textDocument: { uri, languageId, version, text }
    });
  }

  didChange(uri: string, text: string): void {
    const version = (this.documentVersions.get(uri) || 0) + 1;
    this.documentVersions.set(uri, version);
    this.sendNotification('textDocument/didChange', {
      textDocument: { uri, version },
      contentChanges: [{ text }]
    });
  }

  didSave(uri: string): void {
    this.sendNotification('textDocument/didSave', {
      textDocument: { uri }
    });
  }

  didClose(uri: string): void {
    this.documentVersions.delete(uri);
    this.sendNotification('textDocument/didClose', {
      textDocument: { uri }
    });
  }

  async completion(uri: string, line: number, character: number): Promise<any> {
    return this.sendRequest('textDocument/completion', {
      textDocument: { uri },
      position: { line, character }
    });
  }

  async hover(uri: string, line: number, character: number): Promise<any> {
    return this.sendRequest('textDocument/hover', {
      textDocument: { uri },
      position: { line, character }
    });
  }

  getCapabilities(): any {
    return this.serverCapabilities;
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Register Monaco editor providers for this language server connection.
   * Returns an array of disposables.
   */
  registerMonacoProviders(): monaco.IDisposable[] {
    const caps = this.serverCapabilities || {};

    // Completion provider
    if (caps.completionProvider) {
      const triggerChars = caps.completionProvider.triggerCharacters || ['.'];
      this.disposables.push(
        monaco.languages.registerCompletionItemProvider(this.language, {
          triggerCharacters: triggerChars,
          provideCompletionItems: async (model, position) => {
            const uri = this.modelToUri(model);
            if (!uri) { return { suggestions: [] }; }
            try {
              const result = await this.completion(uri, position.lineNumber - 1, position.column - 1);
              const items = result ? (Array.isArray(result) ? result : result.items || []) : [];
              return {
                suggestions: items.map((item: any) => this.convertCompletionItem(item, model))
              };
            } catch (e) {
              this.logger.debug(`LSP completion error:`, e);
              return { suggestions: [] };
            }
          }
        })
      );
    }

    // Hover provider
    if (caps.hoverProvider) {
      this.disposables.push(
        monaco.languages.registerHoverProvider(this.language, {
          provideHover: async (model, position) => {
            const uri = this.modelToUri(model);
            if (!uri) { return null; }
            try {
              const result = await this.hover(uri, position.lineNumber - 1, position.column - 1);
              if (!result) { return null; }
              const contents = Array.isArray(result.contents)
                ? result.contents.map((c: any) => this.convertMarkupContent(c))
                : [this.convertMarkupContent(result.contents)];
              return {
                contents,
                range: result.range ? this.convertRange(result.range) : undefined
              };
            } catch (e) {
              this.logger.debug(`LSP hover error:`, e);
              return null;
            }
          }
        })
      );
    }

    // Diagnostics handler
    this.onNotification('textDocument/publishDiagnostics', (params: any) => {
      const uri = params.uri;
      const monacoUri = monaco.Uri.parse(uri);
      const model = monaco.editor.getModel(monacoUri);
      if (model) {
        const markers = (params.diagnostics || []).map((d: any) => ({
          severity: this.convertSeverity(d.severity),
          startLineNumber: d.range.start.line + 1,
          startColumn: d.range.start.character + 1,
          endLineNumber: d.range.end.line + 1,
          endColumn: d.range.end.character + 1,
          message: d.message,
          source: d.source || this.language
        }));
        monaco.editor.setModelMarkers(model, this.language, markers);
      }
    });

    return this.disposables;
  }

  private modelToUri(model: monaco.editor.ITextModel): string | null {
    const uri = model.uri.toString();
    if (this.documentVersions.has(uri)) {
      return uri;
    }
    return null;
  }

  private convertCompletionItem(item: any, model: monaco.editor.ITextModel): monaco.languages.CompletionItem {
    const kind = item.kind ? this.convertCompletionItemKind(item.kind) : monaco.languages.CompletionItemKind.Text;
    const range = model.getFullModelRange();
    const word = model.getWordUntilPosition(model.getPositionAt(0));
    return {
      label: item.label,
      kind,
      detail: item.detail,
      documentation: item.documentation ? this.convertMarkupContentToString(item.documentation) : undefined,
      insertText: item.insertText || (typeof item.label === 'string' ? item.label : item.label.label),
      range: undefined
    };
  }

  private convertCompletionItemKind(kind: number): monaco.languages.CompletionItemKind {
    const mapping: { [key: number]: monaco.languages.CompletionItemKind } = {
      1: monaco.languages.CompletionItemKind.Text,
      2: monaco.languages.CompletionItemKind.Method,
      3: monaco.languages.CompletionItemKind.Function,
      4: monaco.languages.CompletionItemKind.Constructor,
      5: monaco.languages.CompletionItemKind.Field,
      6: monaco.languages.CompletionItemKind.Variable,
      7: monaco.languages.CompletionItemKind.Class,
      8: monaco.languages.CompletionItemKind.Interface,
      9: monaco.languages.CompletionItemKind.Module,
      10: monaco.languages.CompletionItemKind.Property,
      11: monaco.languages.CompletionItemKind.Unit,
      12: monaco.languages.CompletionItemKind.Value,
      13: monaco.languages.CompletionItemKind.Enum,
      14: monaco.languages.CompletionItemKind.Keyword,
      15: monaco.languages.CompletionItemKind.Snippet,
      16: monaco.languages.CompletionItemKind.Color,
      17: monaco.languages.CompletionItemKind.File,
      18: monaco.languages.CompletionItemKind.Reference,
      19: monaco.languages.CompletionItemKind.Folder,
      20: monaco.languages.CompletionItemKind.EnumMember,
      21: monaco.languages.CompletionItemKind.Constant,
      22: monaco.languages.CompletionItemKind.Struct,
      23: monaco.languages.CompletionItemKind.Event,
      24: monaco.languages.CompletionItemKind.Operator,
      25: monaco.languages.CompletionItemKind.TypeParameter,
    };
    return mapping[kind] || monaco.languages.CompletionItemKind.Text;
  }

  private convertMarkupContent(content: any): monaco.IMarkdownString {
    if (typeof content === 'string') {
      return { value: content };
    }
    if (content.kind === 'markdown') {
      return { value: content.value };
    }
    if (content.language) {
      return { value: '```' + content.language + '\n' + content.value + '\n```' };
    }
    return { value: content.value || String(content) };
  }

  private convertMarkupContentToString(content: any): string {
    if (typeof content === 'string') { return content; }
    return content.value || String(content);
  }

  private convertRange(range: any): monaco.IRange {
    return {
      startLineNumber: range.start.line + 1,
      startColumn: range.start.character + 1,
      endLineNumber: range.end.line + 1,
      endColumn: range.end.character + 1
    };
  }

  private convertSeverity(severity: number): monaco.MarkerSeverity {
    switch (severity) {
      case 1: return monaco.MarkerSeverity.Error;
      case 2: return monaco.MarkerSeverity.Warning;
      case 3: return monaco.MarkerSeverity.Info;
      case 4: return monaco.MarkerSeverity.Hint;
      default: return monaco.MarkerSeverity.Info;
    }
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    this.documentVersions.clear();
    this.pending.clear();
    this.notificationHandlers.clear();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
