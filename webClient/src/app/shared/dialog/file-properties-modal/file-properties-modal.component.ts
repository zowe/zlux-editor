
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatTableDataSource } from '@angular/material';

@Component({
  selector: 'file-properties-modal',
  templateUrl: './file-properties-modal.component.html',
  styleUrls: ['./file-properties-modal.component.scss']
})
export class FilePropertiesModal implements OnInit {

  private fileName = '';
  private fileCreatedAt = '';
  private fileType = '';
  private filePath = '';
  private fileMode = 0;
  private fileSize = 0;
  private fileIcon = '';
  private DATA: any[] = [];
  private displayedColumns: string[];
  private dataSource;

  constructor(
    @Inject(MAT_DIALOG_DATA) data,
  ) 
  {
    const node = data.event;
    this.fileName = node.name;
    this.fileCreatedAt = node.createdAt;
    this.fileType = node.data;
    this.filePath = node.path;
    this.fileMode = node.mode;
    this.fileSize = node.size;
    if (node.icon) {
      this.fileIcon = node.icon;
    } else if (node.collapsedIcon) {
      this.fileIcon = node.collapsedIcon;
    }

    this.DATA = [
      { fileCreatedAt: this.fileCreatedAt, 
        fileType: this.fileType, 
        filePath: this.filePath,
        fileMode: this.fileMode,
        fileSize: this.fileSize,
      },
    ]
    this.displayedColumns = ['fileCreatedAt', 'fileType', 'filePath', 'fileMode', 'fileSize'];
    this.dataSource = new MatTableDataSource(this.DATA);
  }

  ngOnInit() {
  }

  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
