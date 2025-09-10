
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-tag',
  templateUrl: './tag.component.html'
})
export class TagComponent {
  results = {
    encoding: '',
  };

  options: string[];

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    if (this.data.canBeISO === false) {
      this.options = ['UTF-8'];
    }
    else {
      this.options = ['UTF-8', 'ISO-8859-1', 'IBM-1047'];
    }
  }

  ngOnInit() {
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
