
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Injectable } from '@angular/core';
import { MessageConnection } from 'vscode-jsonrpc';

@Injectable()
export class LanguageServerService {

  config = { domain: 'ws://localhost:3000', endpoint: { hlasm: 'asmServer', json: 'jsonServer' } };
  connections: { name: string, connection: MessageConnection }[] = [];

  constructor() { }

  getSettings(): any {
    return this.config;
  }

  updateSettings(config: any) {
    this.config = config;
  }

  getLanguageUrl(lang: string): string {
    let endpoint = this.config.endpoint[lang];
    return endpoint ? `${this.config.domain}/${endpoint}` : '';
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
