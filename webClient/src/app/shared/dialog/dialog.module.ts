
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
import { MatDialogModule, MatSelectModule, MatButtonModule, MatInputModule, MatIconModule, MatCheckboxModule } from '@angular/material';
import { OpenProjectComponent } from './open-project/open-project.component';
import { OpenDataSetComponent } from './open-dataset/open-dataset.component';
import { AboutProjectComponent } from './about-project/about-project.component';
import { HttpService } from '../http/http.service';
import { OpenFolderComponent } from './open-folder/open-folder.component';
import { NewFileComponent } from './new-file/new-file.component';
import { SaveToComponent } from './save-to/save-to.component';
import { LanguageServerComponent } from './language-server/language-server.component';
@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        MatInputModule,
        MatIconModule,
        MatCheckboxModule,
        MatDialogModule,
        MatSelectModule,
        MatButtonModule,
    ],
    declarations: [
        OpenProjectComponent,
        OpenDataSetComponent,
        AboutProjectComponent,
        OpenFolderComponent,
        NewFileComponent,
        SaveToComponent,
        LanguageServerComponent
    ],
    providers: [HttpService],
    entryComponents: [
        OpenProjectComponent,
        OpenDataSetComponent,
        AboutProjectComponent,
        OpenFolderComponent,
        NewFileComponent,
        SaveToComponent,
        LanguageServerComponent
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
