
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MonacoComponent } from './monaco/monaco.component';
import { MonacoSettingsComponent } from './monaco-settings/monaco-settings.component';
import { MonacoService } from './monaco/monaco.service';
import { CodeEditorComponent } from './code-editor.component';
import { FileTabsComponent, MouseMiddleClickDirective } from './file-tabs/file-tabs.component';
// import { NgScrollbarModule } from 'ngx-scrollbar';

import { CodeEditorService } from './code-editor.service';
import { LoadingIndicatorComponent } from './loading-indicator/loading-indicator.component';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatDialogModule,
    MatButtonModule,
    MatSelectModule,
    MatInputModule,
    MatCheckboxModule,
    // NgScrollbarModule
  ],
  providers: [MonacoService, CodeEditorService],
  exports: [CodeEditorComponent],
  declarations: [
    CodeEditorComponent,
    FileTabsComponent,
    LoadingIndicatorComponent,
    MonacoComponent,
    MonacoSettingsComponent,
    MouseMiddleClickDirective,
  ]
})
export class CodeEditorModule { }

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
