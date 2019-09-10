
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { CommonModule } from '@angular/common';
import { HttpModule } from '@angular/http';
import { NgModule } from '@angular/core';
import { MatIconModule } from '@angular/material';
// import { NoopAnimationsModule } from '@angular/platform-browser/animations';

// import libraries modules
import { MonacoEditorModule } from 'ngx-monaco-editor';
import { MonacoConfig } from './editor/code-editor/monaco/monaco.config';

import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
// import { AppRoutingModule } from './app-routing.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EditorModule } from './editor/editor.module';
import { SharedModule } from './shared/shared.module';
import { MatSnackBarModule } from '@angular/material';
import { SnackbarComponent } from './shared/snackbar/snackbar.component'
import {MAT_SNACK_BAR_DATA} from '@angular/material';

@NgModule({
  declarations: [
    AppComponent,
    SnackbarComponent
  ],
  imports: [
    CommonModule,
    // NoopAnimationsModule,
    MatIconModule,
    HttpModule,
    CoreModule,
    // AppRoutingModule,
    DashboardModule,
    EditorModule,
    MonacoEditorModule.forRoot(new MonacoConfig().config),
    SharedModule,
    MatSnackBarModule,
  ],
  entryComponents: [SnackbarComponent],
  providers: [{ provide: MAT_SNACK_BAR_DATA, useValue: {} }],
  bootstrap: [AppComponent]
})
export class AppModule { }

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
