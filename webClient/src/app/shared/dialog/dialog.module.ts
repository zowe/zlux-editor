
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
import { MatDialogModule, MatSelectModule, MatButtonModule, MatInputModule, MatIconModule, MatCheckboxModule, MatTableModule } from '@angular/material';
import { OpenProjectComponent } from './open-project/open-project.component';
import { OpenDatasetComponent } from './open-dataset/open-dataset.component';
import { HttpService } from '../http/http.service';
import { OpenFolderComponent } from './open-folder/open-folder.component';
import { DeleteFileComponent } from './delete-file/delete-file.component';
import { NewFileComponent } from './new-file/new-file.component';
import { SaveToComponent } from './save-to/save-to.component';
import { LanguageServerComponent } from './language-server/language-server.component';
import { TagComponent } from './tag/tag.component';
@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        MatInputModule,
        MatTableModule,
        MatIconModule,
        MatCheckboxModule,
        MatDialogModule,
        MatSelectModule,
        MatButtonModule,
    ],
    declarations: [
        OpenProjectComponent,
        OpenDatasetComponent,
        OpenFolderComponent,
        DeleteFileComponent,
        NewFileComponent,
        SaveToComponent,
        LanguageServerComponent,
        TagComponent
    ],
    providers: [HttpService],
    entryComponents: [
        OpenProjectComponent,
        OpenDatasetComponent,
        OpenFolderComponent,
        DeleteFileComponent,
        NewFileComponent,
        SaveToComponent,
        LanguageServerComponent,
        TagComponent
    ]
})
export class DialogModule { }

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
