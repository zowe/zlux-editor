
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { HttpService } from '../../http/http.service';
import { ENDPOINTS } from '../../../../environments/environment';

@Component({
  selector: 'app-open-dataset',
  templateUrl: './open-dataset.component.html'
})
export class OpenDatasetComponent implements OnInit {

  fetching = false;
  value = '';

  constructor(private http: HttpService, private dialogRef: MatDialogRef<OpenDatasetComponent>) { }

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
