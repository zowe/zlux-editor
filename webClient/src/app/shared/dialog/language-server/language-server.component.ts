
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit } from '@angular/core';
import { LanguageServerService } from '../../language-server/language-server.service';

@Component({
  selector: 'app-language-server',
  templateUrl: './language-server.component.html'
})
export class LanguageServerComponent implements OnInit {
  settings = {
    config: '',
    enable: true,
  };

  constructor(private languageServer: LanguageServerService) {
    this.settings.config = JSON.stringify(this.languageServer.getSettings());
    this.settings.enable = this.languageServer.getEnabled();
  }

  ngOnInit() {
  }

}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
