
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit, OnDestroy, Inject, Optional, ElementRef } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HttpService } from '../../http/http.service';

interface DirEntry {
  name: string;
  path: string;
  directory: boolean;
  size: number;
  dateModified: string;
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
export class OpenFolderComponent implements OnInit, OnDestroy {

  value = '/';
  loading = false;
  entries: DirEntry[] = [];
  breadcrumbs: Breadcrumb[] = [];
  selectedEntry: DirEntry | null = null;
  errorMsg = '';
  filterText = '';
  sortField: 'name' | 'date' | 'size' = 'name';
  sortDir: 'asc' | 'desc' = 'asc';

  private history: string[] = [];
  private historyIndex = -1;
  private navigating = false;

  // Native drag state
  private dragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private overlayPane: HTMLElement | null = null;
  private overlayStartX = 0;
  private overlayStartY = 0;
  private boundDragMove = this.onDragMove.bind(this);
  private boundDragEnd = this.onDragEnd.bind(this);

  constructor(
    private http: HttpService,
    private el: ElementRef,
    private dialogRef: MatDialogRef<OpenFolderComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) private data: any
  ) { }

  ngOnInit() {
    const startDir = (this.data && this.data.directory) ? this.data.directory : '/';
    this.navigateTo(startDir);
  }

  get filteredEntries(): DirEntry[] {
    let result = this.entries;
    if (this.filterText) {
      const filter = this.filterText.toLowerCase();
      result = result.filter(e => e.name.toLowerCase().includes(filter));
    }
    return this.applySorting(result);
  }

  navigateTo(path: string) {
    if (!path || !path.startsWith('/')) {
      path = '/' + (path || '');
    }
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    this.value = path;
    this.selectedEntry = null;
    this.errorMsg = '';
    this.buildBreadcrumbs(path);
    this.fetchDirectory(path);

    if (!this.navigating) {
      if (this.historyIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.historyIndex + 1);
      }
      this.history.push(path);
      this.historyIndex = this.history.length - 1;
    }
    this.navigating = false;
  }

  navigateInto(entry: DirEntry) {
    if (entry.directory) {
      const newPath = this.value === '/' ? '/' + entry.name : this.value + '/' + entry.name;
      this.navigateTo(newPath);
    }
  }

  selectEntry(entry: DirEntry) {
    if (entry.directory) {
      this.selectedEntry = entry;
      this.value = this.getCurrentDir() === '/' ? '/' + entry.name : this.getCurrentDir() + '/' + entry.name;
    }
  }

  goBack() {
    if (this.canGoBack()) {
      this.historyIndex--;
      this.navigating = true;
      this.navigateTo(this.history[this.historyIndex]);
    }
  }

  goForward() {
    if (this.canGoForward()) {
      this.historyIndex++;
      this.navigating = true;
      this.navigateTo(this.history[this.historyIndex]);
    }
  }

  canGoBack(): boolean {
    return this.historyIndex > 0;
  }

  canGoForward(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  sortBy(field: 'name' | 'date' | 'size') {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir = 'asc';
    }
  }

  formatSize(bytes: number): string {
    if (bytes == null || bytes === 0) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }

  // Native drag implementation
  onDragStart(event: MouseEvent) {
    // Don't drag if clicking a button
    if ((event.target as HTMLElement).closest('button')) return;

    this.overlayPane = (this.el.nativeElement as HTMLElement).closest('.cdk-overlay-pane') as HTMLElement;
    if (!this.overlayPane) return;

    this.dragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;

    const transform = this.overlayPane.style.transform;
    const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
    this.overlayStartX = match ? parseFloat(match[1]) : 0;
    this.overlayStartY = match ? parseFloat(match[2]) : 0;

    document.addEventListener('mousemove', this.boundDragMove);
    document.addEventListener('mouseup', this.boundDragEnd);
    event.preventDefault();
  }

  private onDragMove(event: MouseEvent) {
    if (!this.dragging || !this.overlayPane) return;
    const dx = event.clientX - this.dragStartX;
    const dy = event.clientY - this.dragStartY;
    this.overlayPane.style.transform = `translate(${this.overlayStartX + dx}px, ${this.overlayStartY + dy}px)`;
  }

  private onDragEnd() {
    this.dragging = false;
    document.removeEventListener('mousemove', this.boundDragMove);
    document.removeEventListener('mouseup', this.boundDragEnd);
  }

  ngOnDestroy() {
    document.removeEventListener('mousemove', this.boundDragMove);
    document.removeEventListener('mouseup', this.boundDragEnd);
  }

  private getCurrentDir(): string {
    // The directory we're currently viewing (not the selected value)
    const lastCrumb = this.breadcrumbs[this.breadcrumbs.length - 1];
    return lastCrumb ? lastCrumb.path : '/';
  }

  private applySorting(entries: DirEntry[]): DirEntry[] {
    const dir = this.sortDir === 'asc' ? 1 : -1;
    return [...entries].sort((a, b) => {
      switch (this.sortField) {
        case 'name':
          return dir * a.name.localeCompare(b.name);
        case 'size':
          return dir * ((a.size || 0) - (b.size || 0));
        case 'date':
          return dir * (a.dateModified || '').localeCompare(b.dateModified || '');
        default:
          return 0;
      }
    });
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
    const requestUrl = ZoweZLUX.uriBroker.unixFileUri('contents', targetPath || '.');

    this.http.get(requestUrl).subscribe(
      (response: any) => {
        this.loading = false;
        if (response && response.entries) {
          this.entries = response.entries
            .filter((e: any) => e.directory)
            .map((e: any) => ({
              name: e.name,
              path: path,
              directory: true,
              size: e.size || 0,
              dateModified: this.formatDate(e.lastModifiedDate || e.createdAt || e.mtime)
            }));
        }
      },
      (error: any) => {
        this.loading = false;
        this.errorMsg = 'Unable to read directory';
        this.entries = [];
      }
    );
  }

  private formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
        ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr || '';
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
