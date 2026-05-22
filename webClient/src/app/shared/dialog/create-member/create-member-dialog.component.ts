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
  selector: 'app-create-member-dialog',
  templateUrl: './create-member-dialog.component.html'
})
export class CreateMemberDialogComponent {

  memberName = '';
  datasetName = '';
  memberNamePattern = '^[a-zA-Z#$@][a-zA-Z0-9#$@]{0,7}$';

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    this.datasetName = data.datasetName || '';
  }

  get isValid(): boolean {
    return new RegExp(this.memberNamePattern).test(this.memberName);
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
