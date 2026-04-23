/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
import { Injectable, Inject } from '@angular/core';
import { HttpService } from '../http/http.service';
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

/**
 * Represents a single tab's persistent state — enough info to re-open the file.
 */
export interface SessionTab {
  name: string;
  fileName: string;
  path: string;
  isDataset: boolean;
  language?: string;
  encoding?: number;
  active?: boolean;
}

/**
 * Metadata for a saved session.
 */
export interface EditorSession {
  _objectType: string;
  _metaDataVersion: string;
  id: string;
  name: string;
  tabs: SessionTab[];
  activeTabPath?: string;
  updatedAt: string;     // ISO timestamp
  createdAt: string;     // ISO timestamp
}

/**
 * The index file that lists all sessions.
 */
export interface SessionIndex {
  _objectType: string;
  _metaDataVersion: string;
  sessions: SessionIndexEntry[];
  lastSessionId?: string;
}

export interface SessionIndexEntry {
  id: string;
  name: string;
  tabCount: number;
  updatedAt: string;
}

const SESSION_OBJECT_TYPE = 'org.zowe.editor.session';
const INDEX_OBJECT_TYPE = 'org.zowe.editor.session.index';
const META_VERSION = '1.0.0';
const DEFAULT_SESSION_ID = 'default';
const DEFAULT_SESSION_NAME = 'Default Session';

@Injectable({
  providedIn: 'root',
})
export class EditorSessionService {
  private _currentSession: BehaviorSubject<EditorSession | null> = new BehaviorSubject(null);
  private _sessionIndex: BehaviorSubject<SessionIndex | null> = new BehaviorSubject(null);

  constructor(
    private http: HttpService,
    @Inject(Angular2InjectionTokens.PLUGIN_DEFINITION) private pluginDefinition: ZLUX.ContainerPluginDefinition,
    @Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger
  ) {}

  get currentSession$(): Observable<EditorSession | null> {
    return this._currentSession.asObservable();
  }

  get currentSession(): EditorSession | null {
    return this._currentSession.getValue();
  }

  get sessionIndex$(): Observable<SessionIndex | null> {
    return this._sessionIndex.asObservable();
  }

  // -- Config dataservice URI helpers --

  private configUri(resource: string): string {
    return ZoweZLUX.uriBroker.pluginConfigForScopeUri(
      this.pluginDefinition.getBasePlugin(), 'user', 'sessions', resource
    );
  }

  // -- Session Index --

  /**
   * Load the session index from the config dataservice.
   */
  loadIndex(): Observable<SessionIndex> {
    return this.http.get(this.configUri('index.json')).pipe(
      map((response: any) => {
        if (response && response.contents) {
          const index = response.contents as SessionIndex;
          this._sessionIndex.next(index);
          return index;
        }
        return this.createDefaultIndex();
      }),
      catchError((err) => {
        this.log.debug('No session index found, creating default', err);
        return of(this.createDefaultIndex());
      })
    );
  }

  private createDefaultIndex(): SessionIndex {
    const index: SessionIndex = {
      _objectType: INDEX_OBJECT_TYPE,
      _metaDataVersion: META_VERSION,
      sessions: [],
      lastSessionId: undefined
    };
    this._sessionIndex.next(index);
    return index;
  }

  /**
   * Save the session index to the config dataservice.
   */
  private saveIndex(index: SessionIndex): Observable<any> {
    this._sessionIndex.next(index);
    return this.http.put(this.configUri('index.json'), index);
  }

  // -- Session CRUD --

  /**
   * Load a session by ID from the config dataservice.
   */
  loadSession(sessionId: string): Observable<EditorSession | null> {
    return this.http.get(this.configUri(`session-${sessionId}.json`)).pipe(
      map((response: any) => {
        if (response && response.contents) {
          return response.contents as EditorSession;
        }
        return null;
      }),
      catchError((err) => {
        this.log.warn(`Failed to load session ${sessionId}`, err);
        return of(null);
      })
    );
  }

  /**
   * Save a session to the config dataservice.
   * Also writes a .bkp file first for recovery.
   */
  saveSession(session: EditorSession): Observable<any> {
    session.updatedAt = new Date().toISOString();
    this._currentSession.next(session);

    const mainUri = this.configUri(`session-${session.id}.json`);
    const bkpUri = this.configUri(`session-${session.id}.bkp.json`);

    // Write backup first, then main file, then update index
    return new Observable(observer => {
      // Step 1: Write backup
      this.http.put(bkpUri, session).subscribe({
        next: () => {
          // Step 2: Write main file
          this.http.put(mainUri, session).subscribe({
            next: () => {
              // Step 3: Update index
              this.updateIndexEntry(session);
              observer.next(session);
              observer.complete();
            },
            error: (err) => {
              this.log.warn('Failed to write session file, backup is available', err);
              // Backup was written, so we're not in a totally broken state
              this.updateIndexEntry(session);
              observer.next(session);
              observer.complete();
            }
          });
        },
        error: (err) => {
          this.log.warn('Failed to write session backup', err);
          // Try writing main file anyway
          this.http.put(mainUri, session).subscribe({
            next: () => {
              this.updateIndexEntry(session);
              observer.next(session);
              observer.complete();
            },
            error: (err2) => {
              this.log.warn('Failed to write session', err2);
              observer.error(err2);
            }
          });
        }
      });
    });
  }

  /**
   * Update the index entry for a session and persist the index.
   */
  private updateIndexEntry(session: EditorSession): void {
    let index = this._sessionIndex.getValue();
    if (!index) {
      index = this.createDefaultIndex();
    }
    const existingIdx = index.sessions.findIndex(s => s.id === session.id);
    const entry: SessionIndexEntry = {
      id: session.id,
      name: session.name,
      tabCount: session.tabs.length,
      updatedAt: session.updatedAt
    };
    if (existingIdx >= 0) {
      index.sessions[existingIdx] = entry;
    } else {
      index.sessions.push(entry);
    }
    index.lastSessionId = session.id;
    this.saveIndex(index).subscribe({
      error: (err) => this.log.warn('Failed to save session index', err)
    });
  }

  /**
   * Delete a session by ID.
   */
  deleteSession(sessionId: string): Observable<any> {
    const uri = this.configUri(`session-${sessionId}.json`);
    const bkpUri = this.configUri(`session-${sessionId}.bkp.json`);
    return new Observable(observer => {
      // Delete main file
      this.http.delete(uri).subscribe({
        next: () => {
          // Delete backup (best effort)
          this.http.delete(bkpUri).subscribe({ error: () => {} });
          // Remove from index
          let index = this._sessionIndex.getValue();
          if (index) {
            index.sessions = index.sessions.filter(s => s.id !== sessionId);
            if (index.lastSessionId === sessionId) {
              index.lastSessionId = index.sessions.length > 0 ? index.sessions[0].id : undefined;
            }
            this.saveIndex(index).subscribe();
          }
          if (this._currentSession.getValue()?.id === sessionId) {
            this._currentSession.next(null);
          }
          observer.next(true);
          observer.complete();
        },
        error: (err) => {
          this.log.warn(`Failed to delete session ${sessionId}`, err);
          observer.error(err);
        }
      });
    });
  }

  /**
   * Try to recover a session from its backup.
   */
  recoverSession(sessionId: string): Observable<EditorSession | null> {
    const bkpUri = this.configUri(`session-${sessionId}.bkp.json`);
    return this.http.get(bkpUri).pipe(
      map((response: any) => {
        if (response && response.contents) {
          return response.contents as EditorSession;
        }
        return null;
      }),
      catchError(() => of(null))
    );
  }

  // -- Convenience --

  /**
   * Create a new empty session with the given name.
   */
  createSession(name?: string): EditorSession {
    const now = new Date().toISOString();
    return {
      _objectType: SESSION_OBJECT_TYPE,
      _metaDataVersion: META_VERSION,
      id: this.generateId(),
      name: name || DEFAULT_SESSION_NAME,
      tabs: [],
      updatedAt: now,
      createdAt: now
    };
  }

  /**
   * Create the default session.
   */
  createDefaultSession(): EditorSession {
    const now = new Date().toISOString();
    return {
      _objectType: SESSION_OBJECT_TYPE,
      _metaDataVersion: META_VERSION,
      id: DEFAULT_SESSION_ID,
      name: DEFAULT_SESSION_NAME,
      tabs: [],
      updatedAt: now,
      createdAt: now
    };
  }

  /**
   * Set the current active session (in memory only — call saveSession to persist).
   */
  setCurrentSession(session: EditorSession): void {
    this._currentSession.next(session);
  }

  /**
   * Build the tabs snapshot from the current open file list.
   */
  buildTabsFromOpenFiles(openFiles: any[]): SessionTab[] {
    return openFiles
      .filter(f => f && f.model)
      .map(f => ({
        name: f.name || f.model.name,
        fileName: f.model.fileName || f.model.name,
        path: f.model.path || '',
        isDataset: f.model.isDataset || false,
        language: f.model.language,
        encoding: f.model.encoding,
        active: f.active || false
      }));
  }

  /**
   * Auto-generate a session name from the open tabs.
   * Shows up to 3 file names, like "file1.ts, file2.js +2 more".
   */
  autoNameFromTabs(tabs: SessionTab[]): string {
    if (tabs.length === 0) return DEFAULT_SESSION_NAME;
    const names = tabs.map(t => t.name);
    if (names.length <= 3) {
      return names.join(', ');
    }
    return names.slice(0, 3).join(', ') + ` +${names.length - 3} more`;
  }

  /**
   * Get the last used session ID, or 'default'.
   */
  getLastSessionId(): string {
    const index = this._sessionIndex.getValue();
    return index?.lastSessionId || DEFAULT_SESSION_ID;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
