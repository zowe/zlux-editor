
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Injectable, Inject } from '@angular/core';
import { MessageConnection } from 'vscode-jsonrpc';
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';
import { EditorControlService } from '../editor-control/editor-control.service';

interface ILanguageServerList {
  [language: string]: {[plugin: string]: ILanguageServer};
}

interface ILanguageServer {
  name: string;
  options: any;
}

interface ILanguageServerSettings {
  [language: string]: string;
}

@Injectable()
export class LanguageServerService {

  langservers: ILanguageServerList = {};

  settings: ILanguageServerSettings = {};

  connections: { name: string, connection: MessageConnection }[] = [];
  enabled: boolean = true;

  constructor(
    @Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger,
    private editorControl: EditorControlService,
  ) {
    const plugIterator = ZoweZLUX.pluginManager.pluginsById.keys();
    let currentPlugin;

    const langserverOptionPromises = [];

    while (!(currentPlugin = plugIterator.next()).done) {
      const pluginId = currentPlugin.value;
      if (pluginId.split('.').includes('languageserver')) {
        langserverOptionPromises.push(new Promise((resolve, reject) => {
          fetch(`${window.location.protocol}//${this.getPluginUrl(pluginId)}`)
            .then((res) => {
              if (!res.ok) {
                return resolve({});
              }

              res.json()
                .then((data) => {
                  if (data.languages) {
                    data.plugin = pluginId;
                    return resolve(data);
                  }

                  return resolve({});
                }).catch(() => {
                  resolve({});
                });
            })
            .catch((err) => resolve({}));
        }));
      }
    }

    Promise.all(langserverOptionPromises)
      .then((langserverInfos) => {
        for (const langserverInfo of langserverInfos) {
          if (!langserverInfo.plugin) {
            continue;
          }

          const { plugin, name, languages, options } = langserverInfo;
          for (const language of languages) {
            if (!this.langservers[language]) {
              this.langservers[language] = {};
            }

            this.langservers[language][plugin] = {
              name,
              options,
            };
          }
        }
      });
  }

  getLanguageServers(): ILanguageServerList {
    return this.langservers;
  }

  getSettings(): ILanguageServerSettings {
    return this.settings;
  }

  updateSettings(settings: any): void {
    this.settings = settings;
    this.editorControl.updateLS.next();
  }

  getLanguageUrl(lang: string): string {
    const pluginId = this.settings[lang];

    if (!pluginId) {
      return '';
    }

    // window.location.protocol will be either http: or https:
    const prot = window.location.protocol.replace('http', 'ws');

    return `${prot}//${this.getPluginUrl(pluginId)}`;
  }

  getPluginUrl(pluginId: string): string {
    if (!pluginId) {
      return '';
    }

    const plugin = ZoweZLUX.pluginManager.pluginsById.get(pluginId);
    const path = ZoweZLUX.uriBroker.pluginRESTUri(plugin, 'ls', '');
    const host = window.location.host;

    // loc.host includes hostname and port
    return `${host}${path}`;
  }

  getLanguageOptions(lang: string): ILanguageServer {
    const pluginId = this.settings[lang];

    return this.langservers[lang][pluginId].options;
  }

  addConnection(lang: string, connection: MessageConnection) {
    this.connections.push({
      name: lang,
      connection: connection,
    });
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
