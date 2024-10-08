
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
import { ProjectDef } from '../../model/project';
@Component({
  selector: 'app-open-project',
  templateUrl: './open-project.component.html'
})
export class OpenProjectComponent implements OnInit {
  projectList: ProjectDef[] = [];
  selected: ProjectDef;
  fetching = false;

  constructor(private http: HttpService, private dialogRef: MatDialogRef<OpenProjectComponent>) { }

  ngOnInit() {
    this.fetchProjects();
  }

  fetchProjects() {
    this.fetching = true;
    this.http.get(ENDPOINTS.project).subscribe((response: any) => {
      this.projectList = response;
      this.fetching = false;
    });
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
