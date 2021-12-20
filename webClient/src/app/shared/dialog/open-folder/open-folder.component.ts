
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material';
import { HttpService } from '../../http/http.service';
import { ENDPOINTS } from '../../../../environments/environment';

@Component({
  selector: 'app-open-folder',
  templateUrl: './open-folder.component.html',
  styleUrls: ['../../../../styles.scss']
})
export class OpenFolderComponent implements OnInit {

  private fetching = false;
  private value = '/';

  constructor(private http: HttpService, private dialogRef: MatDialogRef<OpenFolderComponent>) { }

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
