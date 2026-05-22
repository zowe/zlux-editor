
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-save-to',
  templateUrl: './save-to.component.html',
})
export class SaveToComponent {
  saveAsDataset = false;

  results = {
    directory: '',
    fileName: '',
    encoding: '',
  };

  datasetResults = {
    datasetName: '',
    memberName: '',
  };

  options: string[];

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    if (this.data.canBeISO === false) {
      this.options = ['UTF-8'];
    }
    else {
      this.options = ['UTF-8', 'ISO-8859-1', 'IBM-1047'];
    }
    if (this.data.fileName) {
      this.results.fileName = this.data.fileName;
    }
    if (this.data.fileDirectory) {
      this.results.directory = this.data.fileDirectory;
    }
  }

  isValid(): boolean {
    if (!this.saveAsDataset) {
      return !!(this.results.fileName && this.results.directory && this.results.encoding);
    } else {
      return !!(this.datasetResults.datasetName);
    }
  }

  getDialogResult(): any {
    if (!this.saveAsDataset) {
      return this.results;
    } else {
      return {
        saveType: 'dataset',
        datasetName: this.datasetResults.datasetName,
        memberName: this.datasetResults.memberName
      };
    }
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
