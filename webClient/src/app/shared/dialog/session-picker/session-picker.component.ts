/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SessionIndexEntry } from '../../session/editor-session.service';

export interface SessionPickerData {
  sessions: SessionIndexEntry[];
  lastSessionId?: string;
}

export interface SessionPickerResult {
  action: 'restore' | 'create' | 'skip';
  sessionId?: string;
  newSessionName?: string;
}

@Component({
  selector: 'app-session-picker',
  templateUrl: './session-picker.component.html',
  styleUrls: ['./session-picker.component.scss']
})
export class SessionPickerComponent implements OnInit {
  sessions: SessionIndexEntry[] = [];
  lastSessionId: string = '';
  selectedId: string = '';
  newSessionName: string = '';

  constructor(
    public dialogRef: MatDialogRef<SessionPickerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SessionPickerData
  ) {}

  ngOnInit(): void {
    this.sessions = (this.data.sessions || []).slice().sort((a, b) => {
      // Sort by most recently updated
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    this.lastSessionId = this.data.lastSessionId || '';
    // Pre-select the last used session
    if (this.lastSessionId && this.sessions.some(s => s.id === this.lastSessionId)) {
      this.selectedId = this.lastSessionId;
    } else if (this.sessions.length > 0) {
      this.selectedId = this.sessions[0].id;
    }
  }

  select(id: string): void {
    this.selectedId = id;
  }

  onRestore(): void {
    if (this.selectedId) {
      this.dialogRef.close({ action: 'restore', sessionId: this.selectedId } as SessionPickerResult);
    }
  }

  onCreateNew(): void {
    const name = this.newSessionName.trim();
    if (name) {
      this.dialogRef.close({ action: 'create', newSessionName: name } as SessionPickerResult);
    }
  }

  onDelete(sessionId: string, event: Event): void {
    event.stopPropagation();
    this.sessions = this.sessions.filter(s => s.id !== sessionId);
    if (this.selectedId === sessionId) {
      this.selectedId = this.sessions.length > 0 ? this.sessions[0].id : '';
    }
    // Emit a custom event the parent can listen to for actual deletion
    // We store deleted IDs on the dialog data so the opener can process them
    if (!this.data['_deletedIds']) {
      this.data['_deletedIds'] = [];
    }
    this.data['_deletedIds'].push(sessionId);
  }

  onSkip(): void {
    this.dialogRef.close({ action: 'skip' } as SessionPickerResult);
  }

  formatDate(isoString: string): string {
    if (!isoString) return '';
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
