
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit, Input, ViewChild, ElementRef, Inject, Optional, OnDestroy, HostBinding } from '@angular/core';
import { Angular2InjectionTokens, Angular2PluginWindowEvents, Angular2PluginWindowActions } from 'pluginlib/inject-resources';
import { EditorControlService } from '../../shared/editor-control/editor-control.service';
import { HttpService } from '../../shared/http/http.service';
import { MonacoService } from './monaco/monaco.service';
import { ProjectStructure } from '../../shared/model/editor-project';
import { ProjectContext, ProjectContextType } from '../../shared/model/project-context';
import { CodeEditorService } from './code-editor.service';
import { EditorKeybindingService } from '../../shared/editor-keybinding.service';
import { KeyCode } from '../../shared/keycode-enum';
import { Subscription, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { EditorSessionService, EditorSession, SessionTab, SessionIndexEntry } from '../../shared/session/editor-session.service';

const DEFAULT_TITLE = 'Editor';

@Component({
  selector: 'app-code-editor',
  templateUrl: './code-editor.component.html',
  styleUrls: ['./code-editor.component.scss']
})
export class CodeEditorComponent implements OnInit, OnDestroy {
  public openFileList: ProjectContext[];
  public noOpenFile: boolean;
  public keyBindingSub: Subscription = new Subscription();
  @ViewChild('monaco')
  monacoRef: ElementRef;

  public showSettings: boolean = false;
  public compareDataset: boolean = false;

  /* IMPORTANT There are 4 sets of Monaco Editor options. Search for other occurrences the line you're reading
  1 - saved config data (not in the code)
  2 - master state (obtained from 1) 
  3 - rendered Monaco options for the code viewing Editors
  4 - rendered Monaco options for the Settings Editor 
  
  2 is obtained from 1. Either 3 OR 4 must exist, because sometimes 3 or 4 must be different than 2 (see hasEditorBeenOpened bug)
  3 and 4 must both exist because we can edit our Editor settings without applying on active tabs, we have "Apply Preview" */
  public monacoOptions; // This is set 3
  /*
    = {
    glyphMargin: true,
    lightbulb: {
      enabled: true
    },
    lineNumbers: true,
    codeLense: true,
    iconsInSuggestions: true,
    minimap: {
      enabled: false
    },
    suggestOnTriggerCharacters: true,
    quickSuggestions: true,
    theme: 'vs-dark'
  };
  */

  public editorFile: { context: ProjectContext, reload: boolean, line?: number };

  /* TODO: This can be extended to persist in future server storage mechanisms. 
  (For example, when a user re-opens the Editor they are plopped back into their workflow of tabs) */
  private previousSessionData: any = {};
  private sessionAutoSave$ = new Subject<void>();
  private sessionRestoring = false;
  public recentSessions: SessionIndexEntry[] = [];

  constructor(private http: HttpService,
    private editorControl: EditorControlService,
    private monacoService: MonacoService,
    private appKeyboard: EditorKeybindingService,
    private sessionService: EditorSessionService,
    @Optional() @Inject(Angular2InjectionTokens.WINDOW_EVENTS) private windowEvents: Angular2PluginWindowEvents,
    @Optional() @Inject(Angular2InjectionTokens.WINDOW_ACTIONS) private windowActions: Angular2PluginWindowActions,
    @Inject(Angular2InjectionTokens.PLUGIN_DEFINITION) private pluginDefinition: ZLUX.ContainerPluginDefinition,
    @Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger,
    private codeEditorService: CodeEditorService) {

    // TODO: If I wanted to spawn opened tabs from localStorage, like "Resume opened files when reopening Editor" feature
    //  this is where it would go (*before* App2App  and *after* closeAllFiles )

    if (this.windowEvents) {
      this.windowEvents.restored.subscribe(() => {
        this.focus();
      });
    }
    this.http.get(ZoweZLUX.uriBroker.pluginConfigForScopeUri(this.pluginDefinition.getBasePlugin(), 'user', 'monaco', 'editorconfig.json'))
      .subscribe((response: any) => {
        if (response && response.contents && response.contents.config) {
          this.monacoOptions = this.editorControl.sanitizeAndSetOptions(response.contents.config);
        }
      });

    //respond to the request to open
    this.editorControl.openFileEmitter.subscribe((fileNode: ProjectStructure) => {
      this.editorControl.compareDataset = false;
      if (this.showSettings) {
        this.showSettings = false;
        if (this.monacoRef) {
          (this.monacoRef as any).focus();
          (this.monacoRef as any).layout();
        }
      }
      this.openFile(fileNode);
      this.editorControl.editor.getValue().layout();
    });

    this.editorControl.openFileList.subscribe((list: ProjectContext[]) => {
      this.openFileList = list;
      list.length === 0 ? this.noOpenFile = true : this.noOpenFile = false;
      // update editor title
      this.updateEditorTitle();
      // auto-save session on tab list change
      this.scheduleSessionSave();
    });

    this.editorControl.closeFile.subscribe((fileContext: ProjectContext) => {
      this.handleCloseFile(fileContext);
    });

    this.editorControl.undoCloseFile.subscribe(() => {
      if (this.previousSessionData.noOpenFile) {
        this.noOpenFile = this.previousSessionData.noOpenFile;
      }
      if (this.previousSessionData.editorFile) {
        this.editorFile = this.previousSessionData.editorFile;

        this.editorFile.context.active = true;
        this.editorFile.context.opened = true;

        this.selectFile(this.editorFile.context, true);
        this.editorControl.openFileHandler(this.editorFile.context);
      }
      this.updateEditorTitle();
    })

    this.editorControl.closeAllFiles.subscribe(() => {
      this.previousSessionData.noOpenFile = this.noOpenFile;
      this.previousSessionData.editorFile = this.editorFile;

      this.noOpenFile = true;
      this.editorFile = undefined;
      this.updateEditorTitle();
    })

    this.editorControl.undoCloseAllFiles.subscribe(() => {
      if (this.previousSessionData.noOpenFile) {
        this.noOpenFile = this.previousSessionData.noOpenFile;
      }
      if (this.previousSessionData.editorFile) {
        this.editorFile = this.previousSessionData.editorFile;

        this.editorFile.context.active = true;
        this.editorFile.context.opened = true;

        this.selectFile(this.editorFile.context, true);
        this.editorControl.openFileHandler(this.editorFile.context);
      }
      this.updateEditorTitle();
    })

    this.editorControl.openSettings.subscribe(() => {
      if (!this.showSettings) {
        this.showSettings = true;
        this.openFileList.push({
          type: ProjectContextType.menu,
          name: "Settings",
          id: "org.zowe.editor.settings",
          model: {
            id: "org.zowe.editor.settings",
            name: "Settings",
            hasChildren: false,
            isDataset: false
          },
          opened: true,
          active: true, //TODO what happens to previously active file
          changed: false
        });
      }
    });
    this.editorControl.closeSettings.subscribe(() => {
      if (this.showSettings) {
        this.showSettings = false;
        for (let i = 0; i < this.openFileList.length; i++) {
          if (this.openFileList[i].id == 'org.zowe.editor.settings') {
            this.openFileList.splice(i, 1);
          }
        }
      }
    });

    this.keyBindingSub.add(this.appKeyboard.keydownEvent.subscribe((event) => {
      if (event.which === KeyCode.KEY_T && event.ctrlKey) {
        this.editorControl.undoCloseFile.next('');
      }
    }));

    this.keyBindingSub.add(this.appKeyboard.keyupEvent.subscribe((event) => {
      if (event.which === KeyCode.PAGE_DOWN || event.which === KeyCode.PERIOD) {
        let fileContext = this.editorControl.fetchRightOfActiveFile();
        this.selectFile(fileContext, true);
      } else if (event.which === KeyCode.PAGE_UP || event.which === KeyCode.COMMA) {
        let fileContext = this.editorControl.fetchLeftOfActiveFile();
        this.selectFile(fileContext, true);
      } else if (event.which === KeyCode.KEY_W && !event.shiftKey) { // Separate keybinding for "close all"
        let fileContext = this.editorControl.fetchActiveFile();
        this.closeFile(fileContext);
        setTimeout(() => {
          this.editorControl.getFocus();
        });
      }
    }));

    this.editorControl.compareDatasetEmitter.subscribe((fileContext: ProjectContext) => {
      this.compareContents(fileContext);
      this.editorControl.compareDataset = true;
    })

    // -- Session persistence --

    // Debounced auto-save: triggers 2s after last tab change
    this.sessionAutoSave$.pipe(debounceTime(2000)).subscribe(() => {
      this.autoSaveSession();
    });

    // Load session index for welcome screen display
    this.initSessionRestore();

  }

  ngOnInit() { }

  setMonacoOptions(monacoOptions: any) {
    if (typeof monacoOptions == 'object') {
      this.monacoOptions = this.editorControl.sanitizeAndSetOptions(monacoOptions);
    }
  }

  updateEditorTitle(): void {
    if (this.noOpenFile) {
      this.setTitle();
      return;
    }

    const fileContext = this.getActiveFile();
    if (fileContext) {
      this.setTitle(fileContext.name);
    } else {
      this.setTitle();
    }
  }

  getActiveFile() {
    return this.openFileList.find(f => f.active);
  }

  isAnySelected() {
    return typeof (this.getActiveFile()) != "undefined";
  }

  focus() {
    if (!this.showSettings) {
      (this.monacoRef as any).focus();
    }
  }

  openFile(fileNode: ProjectStructure) {
    // get file context
    let fileContext = this.editorControl.fetchFileContext(fileNode);
    if (!fileContext) { fileContext = <ProjectContext>this.editorControl.generateProjectContext(fileNode); }

    // below logic is nothing to do with code editor (monaco)
    // check if the file user want to open is already opened
    let existingFile: ProjectContext = null;

    for (const file of this.editorControl.openFileList.getValue()) {
      if (file.name === fileContext.name && file.model.path === fileContext.model.path) {
        existingFile = file;
        break;
      }
    }

    if (existingFile) {
      // Use the EXISTING object reference from the open list, not the
      // newly generated one. Using a different object reference causes
      // selectFileHandler to fail to mark the correct entry as active.
      this.selectFile(existingFile, false, fileNode.line);
    } else {
      // pass file structure to specific code editor (monaco)
      // trigger code-editor change, let code editor open file.
      // Note: openFileHandler (tab creation) is deferred to monacoService.openFile()
      // so that large-file preflight checks run before the tab appears.
      this.editorFile = { context: fileContext, reload: true, line: fileContext.model.line || fileNode.line };
    }

  }

  private handleCloseFile(fileContext: ProjectContext) {
    this.previousSessionData.noOpenFile = this.noOpenFile;
    this.previousSessionData.editorFile = this.editorFile;
    this.previousSessionData.openFileList = this.openFileList;

    if (!this.noOpenFile && !this.isAnySelected()) {
      this.selectFile(this.openFileList[0], true);
    }
  }

  closeFile(fileContext: ProjectContext) {
    if (fileContext.type == ProjectContextType.menu) {
      this.editorControl.closeSettings.next();
      this.handleCloseFile(fileContext);
      let nextFileContext = this.editorControl.fetchActiveFile();
      this.selectFile(nextFileContext, true);
    } else {
      const directory = fileContext.model.path || this.editorControl.activeDirectory;
      this.monacoService.promptToSave(fileContext).then((res) => {
        if (res !== 'Cancel') {
          this.codeEditorService.closeFile(fileContext);
        }
      });
    }
  }

  /* 
     this.editorFile instructs monaco to change, 
     which in turn invokes monacoservice.openfile, 
     which kicks off discovery involving the editor controller   
  */
  selectFile(fileContext: ProjectContext, broadcast: boolean, line?: number) {
    if (fileContext.type != ProjectContextType.menu) { //TODO revisit for other types
      this.showSettings = false;
      this.codeEditorService.selectFile(fileContext, broadcast);
    } else {
      this.showSettings = true;
      this.editorControl.selectSetting.next(fileContext);
    }
    this.editorFile = { context: fileContext, reload: false, line: line };
    this.updateEditorTitle();
  }

  refreshFile(fileContext: ProjectContext, broadcast: boolean, line?: number) {
    if (fileContext.type != ProjectContextType.menu) { //TODO revisit for other types
      this.monacoService.refreshFile(fileContext, broadcast, line)
      // We don't want to kick off openfile from the editor controller, so talk to monaco directly
    }
  }

  compareContents(fileContext: ProjectContext) {
    this.compareDataset = this.editorControl.compareDataset;
    this.editorControl.removeActiveFromAllFiles();
    fileContext.active = true;
    this.monacoService.savePreviousFileContent(fileContext);
    this.editorControl.enableDiffViewer.next('');
  }

  setTitle(title?: String): void {
    let newTitle = DEFAULT_TITLE;
    if (title) {
      newTitle = title + ' - ' + newTitle;
    }

    // for multiple app mode
    if (this.windowActions) {
      this.windowActions.setTitle(newTitle);
    } else {
      // for single app mode
      document.title = newTitle;
    }
  }

  ngOnDestroy(): void {
    // Save session before destroying
    this.autoSaveSession();
    this.keyBindingSub.unsubscribe();
  }

  // -- Session persistence methods --

  /**
   * On startup: load session index and populate the welcome screen list.
   * Does NOT auto-restore — user picks from the welcome screen.
   */
  private initSessionRestore(): void {
    this.sessionService.loadIndex().subscribe((index) => {
      // Only show sessions that actually have tabs
      this.recentSessions = (index.sessions || []).slice()
        .filter(s => s.tabCount > 0)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      // Start a fresh session with unique ID — don't persist until tabs are opened
      this.startFreshSession();
    });
  }

  /**
   * Create a fresh session with a unique ID.
   * NOT persisted until the user opens files (auto-save handles that).
   */
  private startFreshSession(): void {
    const session = this.sessionService.createSession();
    this.sessionService.setCurrentSession(session);
  }

  /**
   * Restore tabs from a session object.
   */
  private restoreSession(session: EditorSession): void {
    this.sessionRestoring = true;
    this.sessionService.setCurrentSession(session);

    // Close all current tabs
    this.editorControl.closeAllHandler();
    this.noOpenFile = true;
    this.editorFile = undefined;

    // Re-open each tab from the session
    if (session.tabs.length === 0) {
      this.sessionRestoring = false;
      return;
    }

    // Open tabs sequentially with a small delay to let monaco process each
    let tabIndex = 0;
    const openNext = () => {
      if (tabIndex >= session.tabs.length) {
        this.sessionRestoring = false;
        // Select the previously active tab
        const activeTab = session.tabs.find(t => t.active) || session.tabs[0];
        if (activeTab) {
          const match = this.editorControl.openFileList.getValue().find(
            f => f.model.fileName === activeTab.fileName && f.model.path === activeTab.path
          );
          if (match) {
            this.selectFile(match, true);
          }
        }
        return;
      }

      const tab = session.tabs[tabIndex];
      tabIndex++;

      const fileStructure: ProjectStructure = {
        id: tab.fileName + ':' + tab.path,
        name: tab.name,
        fileName: tab.fileName,
        path: tab.path,
        isDataset: tab.isDataset,
        hasChildren: false,
        language: tab.language,
        encoding: tab.encoding
      };

      this.editorControl.openFileEmitter.emit(fileStructure);

      // Small delay to let the file open before opening the next
      setTimeout(openNext, 200);
    };

    openNext();
  }

  /**
   * Auto-save the current session's tab list to the config dataservice.
   */
  private autoSaveSession(): void {
    if (this.sessionRestoring) return;

    const session = this.sessionService.currentSession;
    if (!session) return;

    session.tabs = this.sessionService.buildTabsFromOpenFiles(
      this.editorControl.openFileList.getValue()
    );

    // Don't persist empty sessions — avoids accumulating empty files on disk
    if (session.tabs.length === 0) return;

    session.name = this.sessionService.autoNameFromTabs(session.tabs);
    this.sessionService.saveSession(session).subscribe({
      error: (err) => this.log.warn('Session auto-save failed', err)
    });
  }

  /**
   * Trigger a debounced session auto-save (called when tabs change).
   */
  private scheduleSessionSave(): void {
    this.sessionAutoSave$.next();
  }

  /**
   * Restore a session by ID — called from the welcome screen.
   */
  public restoreSessionById(sessionId: string): void {
    this.sessionService.loadSession(sessionId).subscribe((session) => {
      if (session) {
        this.restoreSession(session);
      } else {
        this.sessionService.recoverSession(sessionId).subscribe((recovered) => {
          if (recovered) {
            this.log.info('Session recovered from backup');
            this.restoreSession(recovered);
          }
        });
      }
    });
  }

  /**
   * Delete a single session by ID.
   */
  public deleteSession(sessionId: string, event: Event): void {
    event.stopPropagation();
    this.sessionService.deleteSession(sessionId).subscribe(() => {
      this.recentSessions = this.recentSessions.filter(s => s.id !== sessionId);
    });
  }

  /**
   * Clear all saved sessions.
   */
  public clearAllSessions(): void {
    this.sessionService.clearAllSessions().subscribe(() => {
      this.recentSessions = [];
    });
  }

  /**
   * Format a date for display on the welcome screen.
   */
  public formatSessionDate(isoString: string): string {
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
