
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
import { OpenProjectComponent } from './open-project/open-project.component';
import { OpenDatasetComponent } from './open-dataset/open-dataset.component';
import { HttpService } from '../http/http.service';
import { OpenFolderComponent } from './open-folder/open-folder.component';
import { DeleteFileComponent } from './delete-file/delete-file.component';
import { NewFileComponent } from './new-file/new-file.component';
import { SaveToComponent } from './save-to/save-to.component';
import { ConfirmAction } from './confirm-action/confirm-action-component';
import { LanguageServerComponent } from './language-server/language-server.component';
import { TagComponent } from './tag/tag.component';
import { ZluxTabbingModule } from '@zlux/widgets';
import { OverwriteDatasetComponent } from './overwrite-dataset/overwrite-dataset.component';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

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
        ZluxTabbingModule,
    ],
    declarations: [
        OpenProjectComponent,
        OpenDatasetComponent,
        OpenFolderComponent,
        DeleteFileComponent,
        NewFileComponent,
        SaveToComponent,
        ConfirmAction,
        LanguageServerComponent,
        TagComponent,
        OverwriteDatasetComponent,
    ],
    providers: [HttpService]
})
export class DialogModule { }

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
