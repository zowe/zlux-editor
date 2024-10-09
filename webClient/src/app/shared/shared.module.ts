
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { DialogModule } from './dialog/dialog.module';
import { HttpService } from './http/http.service';
import { DataAdapterService } from './http/http.data.adapter.service';
import { UtilsService } from './utils.service';
import { ConfigService } from './config.service';
import { EditorControlService } from './editor-control/editor-control.service';
import { SnackBarService } from './snack-bar.service';
import { LanguageServerService } from './language-server/language-server.service';
import { EditorKeybindingService } from './editor-keybinding.service';

@NgModule({
  imports: [
    CommonModule,
    DialogModule,
    MatSnackBarModule,
  ],
  declarations: [],
  providers: [
    HttpService,
    DataAdapterService,
    UtilsService,
    ConfigService,
    EditorControlService,
    SnackBarService,
    LanguageServerService,
    EditorKeybindingService
  ]
})
export class SharedModule { }

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
