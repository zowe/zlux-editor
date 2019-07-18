
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit } from '@angular/core';
import { LanguageServerService } from '../../language-server/language-server.service';
import { EditorControlService } from '../../editor-control/editor-control.service';

interface ILanguages {
  id: string;
  name: string;
  serverIds: string[];
  langservers: any;
}

interface ISettings {
  [langId: string]: string;
}

@Component({
  selector: 'app-language-server',
  templateUrl: './language-server.component.html',
  styleUrls: ['./language-server.component.scss',  '../../../../styles.scss']
})

export class LanguageServerComponent implements OnInit {
  private settings: ISettings;

  private languages: ILanguages[];

  private monaco: any;

  constructor(
    private languageServer: LanguageServerService,
    private editorControl: EditorControlService,
  ) {
    this.settings = this.languageServer.getSettings();

    this.editorControl.editorCore.subscribe((monaco) => {
      if (monaco != null) {
        this.monaco = monaco;
        // This is triggered after monaco initializes & is loaded with configuration items
        this.resetLanguageList();
      }
    });
  }

  ngOnInit(): void { }

  private resetLanguageList(): void {
    const langservers = this.languageServer.getLanguageServers();

    this.languages = this.monaco.languages.getLanguages()
      .map((language) => ({
        id: language.id,
        name: language.aliases[0],
        // for some reason Object.keys wasn't working from the html template
        serverIds: Object.keys(langservers[language.id] || {}),
        langservers: langservers[language.id],
      }))
      .sort((lang1, lang2) => {
        if ((lang1.serverIds.length > 0) === (lang2.serverIds.length > 0)) {
          const name1 = lang1.name.toLowerCase();
          const name2 = lang2.name.toLowerCase();
          if (name1 < name2) {
            return -1;
          } else if (name1 > name2) {
            return 1;
          } else {
            return 0;
          }
        }
        if (lang1.serverIds.length > 0) {
          return -1;
        }
        return 1;
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
