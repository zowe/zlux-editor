
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

interface DirEntry {
  name: string;
  path: string;
  directory: boolean;
  icon: string;
}

interface Breadcrumb {
  name: string;
  path: string;
}

@Component({
  selector: 'app-open-folder',
  templateUrl: './open-folder.component.html',
  styleUrls: ['./open-folder.component.scss']
})
export class OpenFolderComponent implements OnInit {

  value = '/';
  loading = false;
  entries: DirEntry[] = [];
  breadcrumbs: Breadcrumb[] = [];
  selectedEntry: DirEntry | null = null;

  constructor(private http: HttpService, private dialogRef: MatDialogRef<OpenFolderComponent>) { }

  ngOnInit() {
    this.navigateTo('/');
  }

  navigateTo(path: string) {
    if (!path || !path.startsWith('/')) {
      path = '/' + (path || '');
    }
    // Remove trailing slash except for root
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    this.value = path;
    this.selectedEntry = null;
    this.buildBreadcrumbs(path);
    this.fetchDirectory(path);
  }

  navigateInto(entry: DirEntry) {
    if (entry.directory) {
      this.navigateTo(entry.path + '/' + entry.name);
    }
  }

  selectEntry(entry: DirEntry) {
    if (entry.directory) {
      this.selectedEntry = entry;
      this.value = entry.path + '/' + entry.name;
    }
  }

  private buildBreadcrumbs(path: string) {
    const parts = path.split('/').filter(p => p.length > 0);
    this.breadcrumbs = [{ name: '/', path: '/' }];
    let accumulated = '';
    for (const part of parts) {
      accumulated += '/' + part;
      this.breadcrumbs.push({ name: part, path: accumulated });
    }
  }

  private fetchDirectory(path: string) {
    this.loading = true;
    this.entries = [];
    const targetPath = path.startsWith('/') ? path.substring(1) : path;
    const requestUrl = ZoweZLUX.uriBroker.unixFileUri('contents', targetPath);

    this.http.get(requestUrl).subscribe(
      (response: any) => {
        this.loading = false;
        if (response && response.entries) {
          this.entries = response.entries
            .filter((e: any) => e.directory)
            .sort((a: any, b: any) => a.name.localeCompare(b.name))
            .map((e: any) => ({
              name: e.name,
              path: path === '/' ? '' : path,
              directory: true,
              icon: 'folder'
            }));
        }
      },
      (error: any) => {
        this.loading = false;
        this.entries = [];
      }
    );
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
