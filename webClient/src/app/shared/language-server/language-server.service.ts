
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Injectable, Inject } from '@angular/core';
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';
import { LspClient } from './lsp-client';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

@Injectable()
export class LanguageServerService {

  config = { domain: 'ws://localhost:3000', endpoint: { hlasm: 'asmServer', json: 'jsonServer' } };
  enabled: boolean = true;
  private lspClients = new Map<string, LspClient>();

  constructor(@Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger) { }

  getSettings(): any {
    return this.config;
  }

  getEnabled(): boolean {
    return this.enabled;
  }

  updateSettings(langSettings: any) {
    if (langSettings === undefined) {
      this.log.debug("Settings are invalid (undefined)");
    } else {
      try {
        var serverConfig = JSON.parse(langSettings.config);
        this.config = serverConfig;
        this.enabled = langSettings.enable;
      } catch (e) {
        this.log.debug(e);
        console.log(e);
      }
    }
  }

  getLanguageUrl(lang: string): string {
    let endpoint = this.config.endpoint[lang];
    return endpoint ? `${this.config.domain}/${endpoint}` : '';
  }

  /**
   * Connect to a language server for the given language.
   * Creates an LspClient, connects via WebSocket, initializes LSP,
   * and registers Monaco providers.
   */
  async connectLanguage(lang: string): Promise<LspClient | null> {
    if (this.lspClients.has(lang)) {
      this.log.warn(`Language server for ${lang} is already connected`);
      return this.lspClients.get(lang);
    }

    const url = this.getLanguageUrl(lang);
    if (!url) {
      this.log.warn(`No language server URL configured for ${lang}`);
      return null;
    }

    const client = new LspClient(lang, this.log);
    try {
      await client.connect(url);
      await client.initialize('file:///');
      client.registerMonacoProviders();
      this.lspClients.set(lang, client);
      this.log.info(`Language server connected for ${lang}`);
      return client;
    } catch (e) {
      this.log.warn(`Failed to connect language server for ${lang}:`, e);
      client.dispose();
      return null;
    }
  }

  /**
   * Disconnect from a language server for the given language.
   */
  disconnectLanguage(lang: string): void {
    const client = this.lspClients.get(lang);
    if (client) {
      client.dispose();
      this.lspClients.delete(lang);
      this.log.info(`Language server disconnected for ${lang}`);
    }
  }

  /**
   * Disconnect all language servers.
   */
  disconnectAll(): void {
    this.lspClients.forEach((client, lang) => {
      client.dispose();
    });
    this.lspClients.clear();
  }

  /**
   * Connect to all configured language servers.
   */
  async connectAll(): Promise<void> {
    if (!this.enabled) {
      this.log.debug('Language server is disabled');
      return;
    }
    const endpoints = this.config.endpoint || {};
    for (const lang of Object.keys(endpoints)) {
      await this.connectLanguage(lang);
    }
  }

  /**
   * Get the LSP client for a given language (if connected).
   */
  getClient(lang: string): LspClient | undefined {
    return this.lspClients.get(lang);
  }

  /**
   * Notify all relevant LSP clients that a document was opened.
   */
  notifyDidOpen(uri: string, languageId: string, text: string): void {
    const client = this.lspClients.get(languageId);
    if (client && client.isConnected()) {
      client.didOpen(uri, languageId, text);
    }
  }

  /**
   * Notify all relevant LSP clients that a document changed.
   */
  notifyDidChange(uri: string, languageId: string, text: string): void {
    const client = this.lspClients.get(languageId);
    if (client && client.isConnected()) {
      client.didChange(uri, text);
    }
  }

  /**
   * Notify all relevant LSP clients that a document was saved.
   */
  notifyDidSave(uri: string, languageId: string): void {
    const client = this.lspClients.get(languageId);
    if (client && client.isConnected()) {
      client.didSave(uri);
    }
  }

  /**
   * Notify all relevant LSP clients that a document was closed.
   */
  notifyDidClose(uri: string, languageId: string): void {
    const client = this.lspClients.get(languageId);
    if (client && client.isConnected()) {
      client.didClose(uri);
    }
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
