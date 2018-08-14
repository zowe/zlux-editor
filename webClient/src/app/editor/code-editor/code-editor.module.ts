
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
import { MatIconModule, MatDialogModule } from '@angular/material';

import { MonacoComponent } from './monaco/monaco.component';
import { MonacoService } from './monaco/monaco.service';
import { CodeEditorComponent } from './code-editor.component';
import { FileTabsComponent, MouseMiddleClickDirective } from './file-tabs/file-tabs.component';
import { PerfectScrollbarModule } from 'ngx-perfect-scrollbar';

import { MonacoEditorModule } from 'ngx-monaco-editor';
import { CodeEditorService } from './code-editor.service';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatDialogModule,
    MonacoEditorModule,
    PerfectScrollbarModule,
  ],
  providers: [MonacoService, CodeEditorService],
  exports: [CodeEditorComponent],
  declarations: [MonacoComponent, CodeEditorComponent, FileTabsComponent, MouseMiddleClickDirective]
})
export class CodeEditorModule { }

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
