
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, Inject, AfterViewInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';
import { TabbingComponent } from '../tabbing/tabbing.component';

@Component({
  selector: 'app-save-to',
  templateUrl: './save-to.component.html',
  styleUrls: ['./save-to.component.scss',  '../../../../styles.scss']
})
export class SaveToComponent implements AfterViewInit {
  private results = {
    directory: '',
    fileName: '',
    encoding: '',
  };
  @ViewChild(TabbingComponent)
  private tabbingComponent: TabbingComponent;
  private options: string[];

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    if (this.data.canBeISO === false) {
      this.options = ['UTF-8'];
    }
    else {
      this.options = ['UTF-8','ISO-8859-1','IBM-1047'];
    }
    if (this.data.fileName) {
      this.results.fileName = this.data.fileName;
    }
    if (this.data.fileDirectory) {
      this.results.directory = this.data.fileDirectory;
    }
  }

  ngAfterViewInit() {
    this.tabbingComponent.setTotalTabs(5);
  }

  setActiveTab(i: number) {
    this.tabbingComponent.activeTab = i;
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
