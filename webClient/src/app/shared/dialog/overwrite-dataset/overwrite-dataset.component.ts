
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';

@Component({
  selector: 'app-overwrite-dataset',
  templateUrl: './overwrite-dataset.component.html',
  styleUrls: ['../../../../styles.scss']
})
export class OverwriteDatasetComponent{

  private force: boolean;
  private datasetName: string;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) { 
    this.force = true;
    this.datasetName = data.fileName;
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
