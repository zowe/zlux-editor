
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
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { EditorComponent } from './editor.component';
import { EditorService } from './editor.service';
// import { EditorRoutingModule } from './editor-routing.module';
import { FrameComponent } from './frame/frame.component';
import { ProjectTreeComponent } from './project-tree/project-tree.component';
import { PerfectScrollbarModule } from 'ngx-perfect-scrollbar';
import { FileTreeModule } from '@zowe/zlux-angular-file-tree/src/plugin';
import { CodeEditorModule } from './code-editor/code-editor.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatExpansionModule,
    MatSnackBarModule,
    MatInputModule,
    FileTreeModule,
    // EditorRoutingModule,
    PerfectScrollbarModule,
    CodeEditorModule,
  ],
  providers: [EditorService],
  declarations: [EditorComponent, FrameComponent, ProjectTreeComponent],
  exports: [EditorComponent],
})
export class EditorModule { }

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
