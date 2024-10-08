
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit, Inject, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MENU, TEST_LANGUAGE_MENU, LANGUAGE_MENUS } from './menu-bar.config';
import { EditorControlService } from '../../shared/editor-control/editor-control.service';
import { OpenProjectComponent } from '../../shared/dialog/open-project/open-project.component';
import { OpenFolderComponent } from '../../shared/dialog/open-folder/open-folder.component';
import { OpenDatasetComponent } from '../../shared/dialog/open-dataset/open-dataset.component';
import { NewFileComponent } from '../../shared/dialog/new-file/new-file.component';
import { LanguageServerComponent } from '../../shared/dialog/language-server/language-server.component';
import { HttpService } from '../../shared/http/http.service';
import { ENDPOINTS } from '../../../environments/environment';
import { UtilsService } from '../../shared/utils.service';
import { SnackBarService } from '../../shared/snack-bar.service';
import { MonacoService } from '../../editor/code-editor/monaco/monaco.service';
import { LanguageServerService } from '../../shared/language-server/language-server.service';
import { MessageDuration } from "../../shared/message-duration";
import { DeleteFileComponent } from '../../shared/dialog/delete-file/delete-file.component';
import { Angular2InjectionTokens, Angular2PluginSessionEvents } from 'pluginlib/inject-resources';
import { Subscription } from 'rxjs';
import { EditorKeybindingService } from '../../shared/editor-keybinding.service';
import { KeyCode } from '../../shared/keycode-enum';
import * as _ from 'lodash';
import { ProjectContext, ProjectContextType } from '../../shared/model/project-context';

function initMenu(menuItems) {
  menuItems.forEach(function (menuItem) {
    if (menuItem.action && !menuItem.action.func && menuItem.action.functionString) {
      menuItem.action.func = new Function('context', menuItem.action.functionString);
    }
    if (!menuItem.isDisabled && menuItem.isDisabledString) {
      menuItem.isDisabled = new Function('context', menuItem.isDisabledString);
    }
  });
  return menuItems;
}
function initMenus(menus) {
  if (menus.isArray) {
    return initMenu(menus);
  } else {
    const keys = (Object as any).keys(menus);
    for (let i = 0; i < keys.length; i++) {
      menus[keys[i]] = initMenu(menus[keys[i]]);
    }
    return menus;
  }
}

// Where el is the DOM element you'd like to test for visibility
function isHidden(el) {
  return (el.offsetParent === null)
}

@Component({
  selector: 'app-menu-bar',
  templateUrl: './menu-bar.component.html',
  styleUrls: ['./menu-bar.component.scss']
})
export class MenuBarComponent implements OnInit, OnDestroy {

  @ViewChild('menubar', { static: true }) menuBarRef: ElementRef<any>;

  menuList: any = _.cloneDeep(MENU);
  //  MENU.slice(0);//clone to prevent language from persisting
  private currentLang: string | undefined;
  private fileCount: number = 0;
  private monaco: any;
  private languageSelectionMenu: any = {
    name: 'Language',
    children: []
  };

  private keyBindingSub: Subscription = new Subscription();
  public languagesMenu: any = (Object as any).assign({}, LANGUAGE_MENUS);//clone for sanitization

  /* TODO: This can be extended to persist in future server storage mechanisms. 
  (For example, when a user re-opens the Editor they are plopped back into their workflow) */
  private previousSessionData: any = {};

  constructor(
    private http: HttpService,
    private editorControl: EditorControlService,
    private monacoService: MonacoService,
    private languageServer: LanguageServerService,
    private utils: UtilsService,
    private dialog: MatDialog,
    private snackBar: SnackBarService,
    private appKeyboard: EditorKeybindingService,
    @Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger,
    @Inject(Angular2InjectionTokens.PLUGIN_DEFINITION) private pluginDefinition: ZLUX.ContainerPluginDefinition,
    @Inject(Angular2InjectionTokens.SESSION_EVENTS) private sessionEvents: Angular2PluginSessionEvents
  ) {

    /*
    //Ideas: load languages at this time, if response occurs after file open, append results to monaco and try to reset it to the language
    this.httpClient.get(ZoweZLUX.uriBroker.pluginConfigUri(this.pluginDefinition, 'languages/definitions')).subscribe(data=> {
      monaco.languages.register(language);
      if (language) {
        setLanguage()
        monaco.languages.setMonarchTokensProvider('hlasm', <any>HLASM_HILITE);
      }
    });
    this.httpClient.get(ZoweZLUX.uriBroker.pluginConfigUri(this.pluginDefinition, 'languages/menus')).subscribe(data=> {
      
    });
    */
    this.addFileTreeMenus(this.menuList);
    this.addDiffViewerMenus(this.menuList);
    this.addToggleTreeMenus(this.menuList);
    this.languagesMenu = initMenus(this.languagesMenu);

    this.editorControl.languageRegistered.subscribe((languageDefinition) => {
      this.resetLanguageSelectionMenu();
    });

    this.editorControl.openSettings.subscribe(() => {
      this.hideFileMenus();
    });

    this.editorControl.selectMenu.subscribe((fileContext) => {
      this.setMenus(fileContext);
    });

    this.editorControl.selectFile.subscribe((fileContext) => {
      if (this.fileCount != 0) { this.showFileMenus(fileContext); }
      // get focus of editor
      setTimeout(() => {
        this.editorControl.getFocus();
      });
    });

    this.editorControl.initializedFile.subscribe((fileContext) => {
      this.showFileMenus(fileContext);
      this.fileCount++;
      this.log.debug(`fileCount now=`, this.fileCount);
    });

    this.editorControl.closeFile.subscribe(() => {
      this.previousSessionData.fileCount = this.fileCount;
      if (this.fileCount != 0) {
        this.fileCount--;
        this.log.debug(`fileCount now=`, this.fileCount);
      } else {
        this.log.warn(`Open file count cannot be made negative`);
      }
      this.hideFileMenus();
    });

    this.editorControl.undoCloseFile.subscribe(() => {
      if (this.previousSessionData.fileCount) {
        if (this.fileCount == 0) {
          // Reactivate languages menu. Select file selects correct language down stream
          let menus = [];
          menus.push(this.languageSelectionMenu);
          this.menuList.splice(this.fileCount === 0 ? 1 : 2, 0, ...menus);
        }
        this.fileCount = this.previousSessionData.fileCount;
      }
      this.snackBar.dismiss(); // Removes a bug where you can use an undo hotkey, then undo again via snackbar still showing

      this.log.debug('Attempted to restore session with data: ' + this.previousSessionData + " " + this.currentLang)
    });

    this.editorControl.closeAllFiles.subscribe(() => {
      this.previousSessionData.fileCount = this.fileCount;

      this.fileCount = 0;
      this.log.debug('fileCount emptied');
      this.hideFileMenus();
    })

    // TODO: Undoing Close All has a regression in it that breaks tabs
    this.editorControl.undoCloseAllFiles.subscribe(() => {
      if (this.previousSessionData.fileCount) {
        this.fileCount = this.previousSessionData.fileCount;
      }
      // Reactivate languages menu. Select file selects correct language down stream
      let menus = [];
      menus.push(this.languageSelectionMenu);
      this.menuList.splice(this.fileCount === 0 ? 1 : 2, 0, ...menus);

      this.log.debug('Attempted to restore session with data: ' + this.previousSessionData + " " + this.currentLang)
    });

    this.editorControl.changeLanguage.subscribe((obj: { context: any, language: string }) => {
      this.showLanguageMenu(obj.language);
    });

    this.editorControl.editorCore.subscribe((monaco) => {
      if (monaco != null) {
        this.monaco = monaco;
        //This is triggered after monaco initializes & is loaded with configuration items
        this.resetLanguageSelectionMenu();
      }
    });

    sessionEvents.sessionExpire.subscribe(() => {
      this.dialog.closeAll();
    })

    // this.editorControl.saveAllFile.subscribe(x => {
    //   this.saveAll();
    // });

  }

  private hideFileMenus() {
    this.removeLanguageMenu();
    this.hideEditOptions();
  }

  private setMenus(fileContext: ProjectContext) {
    if (fileContext.type == ProjectContextType.menu) {
      this.hideFileMenus();
    } else {
      this.showFileMenus(fileContext);
    }
  }

  private showFileMenus(fileContext: ProjectContext) {
    this.showLanguageMenu(fileContext.model.language);
    this.showEditOptions();
  }

  private showEditOptions() {
    for (let i = 0; i < this.menuList.length; i++) {
      let menu = this.menuList[i];
      if (menu.name == 'Edit' && menu.children.length == 1) {
        menu.children.unshift({
          name: 'Undo',
          action: {
            internalName: 'undo'
          }
        });
        menu.children.unshift({
          name: 'Redo',
          action: {
            internalName: 'redo'
          }
        });
        return;
      }
    }
  }

  private hideEditOptions() {
    for (let i = 0; i < this.menuList.length; i++) {
      let menu = this.menuList[i];
      if (menu.name == 'Edit' && menu.children.length > 1) {
        menu.children.shift();//redo
        menu.children.shift();//undo
        return;
      }
    }
  }

  private showSettings() {
    this.editorControl.openSettings.next();
  }


  getMenuSectionElements() {
    return this.menuBarRef.nativeElement.getElementsByClassName("gz-menu-section");
  }


  public getMenuItemStyle(menuItem) {
    let style = [];
    if (menuItem.name === 'group-end') {
      style.push('group-line');
    }
    const editor = this.editorControl.editor.getValue();
    if (editor) {
      if (menuItem.isDisabled
        && menuItem.isDisabled({
          editor: editor,
          controller: this.editorControl,
          log: this.log
        })) {
        style.push('disabled');
      }
    }
    return style;
  }

  private resetLanguageSelectionMenu() {
    this.languageSelectionMenu.children = this.monaco.languages.getLanguages().sort(function (lang1, lang2) {
      let name1 = lang1 && lang1?.aliases?.length && lang1?.aliases[0]?.toLowerCase();
      let name2 = lang2 && lang1?.aliases?.length && lang2?.aliases[0]?.toLowerCase();
      if (name1 < name2) {
        return -1;
      } else if (name1 > name2) {
        return 1;
      } else {
        return 0;
      }
    }).map(language => {
      return {
        name: language.aliases[0],
        type: 'checkbox',
        action: {
          internalName: 'setEditorLanguage',
          params: [language.id]
        },
        active: {
          internalName: 'languageActiveCheck',
          params: [language.id]
        }
      }
    });
  }

  private getReadableLangName(languageId) {
    const languages = this.monaco.languages.getLanguages();
    for (let language of languages) {
      if (language.id === languageId) {
        return language.aliases ? language.aliases[0] : languageId;
      }
    }
    return languageId;
  }

  removeLanguageMenu() {
    const removeSelectionMenu = this.fileCount === 0;
    for (let i = 0; i < this.menuList.length; i++) {
      if (this.currentLang && this.menuList[i].name === this.currentLang) {
        this.menuList.splice(i, 1);
        if (!removeSelectionMenu) {
          break;
        }
        i = -1;
      } else if (removeSelectionMenu && this.menuList[i].name === 'Language') {
        this.menuList.splice(i, 1);
        i = -1;
      }
    }
  }

  showLanguageMenu(language) {
    let menus = [];
    if (this.fileCount === 0) {//will become 1 after
      //add language selection menu, too
      menus.push(this.languageSelectionMenu);
    }

    this.removeLanguageMenu();
    if (language) {
      let menuChildren = this.languagesMenu[language];
      if (menuChildren) {
        let readableLanguage = this.getReadableLangName(language)
        menus.push({
          name: readableLanguage,
          children: menuChildren
        });
        this.currentLang = readableLanguage;
      }
    }
    if (menus.length > 0) {
      this.menuList.splice(this.fileCount === 0 ? 1 : 2, 0, ...menus);
    }
  }

  addFileTreeMenus(list) {
    list[0].children.push({
      name: 'Show/Hide Tree Search',
      action: {
        internalName: 'toggleFileTreeSearch'
      },
      keyMap: 'Alt+P'
    });
  }

  addDiffViewerMenus(list) {
    list[0].children.push({
      name: 'Show/Hide Compare (Diff)',
      action: {
        internalName: 'toggleDiffViewer'
      },
      keyMap: 'Alt+V'
    });
  }

  addToggleTreeMenus(list) {
    list[0].children.push({
      name: 'Show/Hide File Explorer',
      action: {
        internalName: 'toggleTree'
      },
      keyMap: 'Alt+B'
    });
  }

  ngOnInit() {
    if (this.editorControl._isTestLangMode) {
      this.log.info(`Adding test language menu`);
      this.languagesMenu['TEST_LANGUAGE'] = TEST_LANGUAGE_MENU;
    }

    this.keyBindingSub.add(this.appKeyboard.keydownEvent
      .subscribe((event) => {
        if (event.which === KeyCode.KEY_N) {
          this.createFile();
        } else if (event.which === KeyCode.KEY_M) {
          this.getMenuSectionElements()[0].focus();
        } else if (event.which === KeyCode.KEY_O) {
          this.openDirectory();
        } else if (event.which === KeyCode.KEY_K) {
          this.openDatasets();
        } else if (event.which === KeyCode.KEY_P && event.ctrlKey) {
          this.getSearchFocus();
        } else if (event.which === KeyCode.KEY_1) {
          this.getEditorFocus();
        } else if (event.which === KeyCode.KEY_W && event.shiftKey) {
          this.closeAll();
        } else if (event.which === KeyCode.KEY_R && event.shiftKey) {
          this.refreshFile();
        } else if (event.which === KeyCode.KEY_S && event.shiftKey) {
          this.saveAsFile();
        }
        // else if (event.which === KeyCode.KEY_S && event.ctrlKey) { TODO
        //   this.saveAll();
        // }
      }));
  }

  onMouseOver(event) {
    event.stopImmediatePropagation();
    const elm = event.target.focus();
  }

  getEditorFocus() {
    setTimeout(() => {
      this.editorControl.getFocus();
    });
  }

  getSearchFocus() {
    let elm = null;
    elm = document.querySelector('.filebrowseruss-search-input');
    if (isHidden(elm)) {
      elm = document.querySelector('.filebrowsermvs-search-input');
    }
    elm.focus();
  }

  moveSelection(event) {
    event.stopImmediatePropagation();
    const currentEventTarget = event.target;
    const currentTarget = event.currentTarget || document.activeElement;
    let nextFocusElement = null;
    switch (event.which) {
      case KeyCode.RIGHT_ARROW:
        nextFocusElement = currentTarget.nextElementSibling || currentTarget.parentNode.firstElementChild;
        break;
      case KeyCode.LEFT_ARROW:
        nextFocusElement = currentTarget.previousElementSibling || currentTarget.parentNode.lastElementChild;
        break;
      case KeyCode.DOWN_ARROW:
        if (document.activeElement !== currentTarget) {
          nextFocusElement = document.activeElement.nextElementSibling;
          if (nextFocusElement && nextFocusElement.getAttribute('type') === '') {
            nextFocusElement = nextFocusElement.nextElementSibling;
          }
        }

        if (!nextFocusElement) {
          nextFocusElement = currentTarget.querySelector('li');
        }
        break;
      case KeyCode.UP_ARROW:
        if (document.activeElement != currentTarget) {
          nextFocusElement = document.activeElement.previousElementSibling;
          if (nextFocusElement && nextFocusElement.getAttribute('type') === '') {
            nextFocusElement = nextFocusElement.previousElementSibling;
          }
        }

        if (!nextFocusElement) {
          const nodes = currentTarget.querySelectorAll('li');
          nextFocusElement = nodes[nodes.length - 1];
        }
        break;

      default:
        break;
    }

    if (nextFocusElement) {
      nextFocusElement.focus();
    }
  }

  menuAction(menuItem: any): any {
    if (!menuItem) {
      return;
    }
    const editor = this.editorControl.editor.getValue();
    if (editor) {
      const context = {
        editor: editor,
        controller: this.editorControl,
        log: this.log
      };

      if (menuItem.internalName != null) {
        return this[menuItem.internalName].apply(this, menuItem.params ? menuItem.params : []);
      } else if (menuItem.func) {
        menuItem.func(context, ...menuItem.params);
        return;
      } else {
        this.log.warn(`Cannnot do menu action, no function to execute.`);
        return;
      }
    }
  }

  openProject() {
    let openProjectRef = this.dialog.open(OpenProjectComponent, {
      width: '500px'
    });

    openProjectRef.afterClosed().subscribe(result => {
      if (result) {
        this.editorControl.projectName = result.name;
        this.editorControl.openProject.next(result.name);
      }
    });
  }

  openDirectory() {
    let openDirRef = this.dialog.open(OpenFolderComponent, {
      width: '500px'
    });

    openDirRef.afterClosed().subscribe(result => {
      if (result) {
        this.editorControl.openDirectory.next(result);
      }
    });
  }

  openDatasets() {
    let openDirRef = this.dialog.open(OpenDatasetComponent, {
      width: '500px'
    });

    openDirRef.afterClosed().subscribe(result => {
      if (result) {
        this.editorControl.openDataset.next({ datasetName: result });
      }
    });
  }

  toggleFileTreeSearch() {
    this.editorControl.toggleFileTreeSearch.next('');
  }

  toggleDiffViewer() {
    this.editorControl.toggleDiffViewer.next('');
  }

  toggleTree() {
    this.editorControl.toggleTree.next('');
  }

  async closeAll() {
    //TODO: Enhance such that closeAll not visible if no tabs are open
    let closeAllRef;
    if (this.fileCount == 0) {
      closeAllRef = this.snackBar.open('No tabs are open.', 'Close', { duration: MessageDuration.Short, panelClass: 'center' });
    } else {
      this.editorControl.closeAllFiles.next('');
      // closeAllRef = this.snackBar.open('Closed.', 'Undo?', { duration: MessageDuration.Medium, panelClass: 'center' })
    }

    // TODO: Undoing Close All has a regression in it that breaks tabs
    // closeAllRef.onAction().subscribe(() => {
    //   this.editorControl.undoCloseAllFiles.next();
    // });
    this.editorControl.fetchActiveFile()
  }

  refreshFile() {
    if (this.fileCount == 0) {
      this.snackBar.open('No files are open.', 'Close', { duration: MessageDuration.Short, panelClass: 'center' });
    } else { // TODO: This needs a confirmation modal
      let activeFile = this.editorControl.fetchActiveFile();
      this.monacoService.refreshFile(activeFile, true);
    }
  }

  // saveAll() {
  //   const _openFile = this.editorControl.openFileList.getValue();
  //   let promiseList = [];
  //   let requestUrl = ENDPOINTS.saveFile;

  //   for (let file of _openFile) {
  //     let saveUrl = this.utils.formatUrl(requestUrl, { dataset: file.parent.name, member: file.name });
  //     let savePromise = this.http.put(saveUrl, { contents: file.model.contents }).toPromise();
  //     promiseList.push(savePromise);
  //   }

  //   Promise.all(promiseList).then(r => {
  //     this.snackBar.open(`All Saved!`, 'Close', { duration: 1000, panelClass: 'center' });
  //     let fileList = this.editorControl.openFileList.getValue().map(file => {
  //       file.changed = false;
  //       return file;
  //     });
  //     this.editorControl.openFileList.next(fileList);
  //     console.log(this.editorControl.openFileList.getValue());
  //     r.forEach(x => {
  //       console.log(x.message);
  //     });
  //   });
  // }

  saveFile() {
    let fileContext = this.editorControl.fetchActiveFile();
    let directory = fileContext.model.path || this.editorControl.activeDirectory;
    if (!fileContext) {
      this.snackBar.open('Warning: Cannot save, no content found', 'Dismiss', { duration: MessageDuration.Medium, panelClass: 'center' });
    } else {
      let sub = this.monacoService.saveFile(fileContext, directory).subscribe(() => { sub.unsubscribe(); });
    }
  }

  saveAsFile() {
    let fileContext = this.editorControl.fetchActiveFile();
    let directory = fileContext.model.path || this.editorControl.activeDirectory;
    if (!fileContext) {
      this.snackBar.open('Warning: Cannot save, no content found', 'Dismiss', { duration: MessageDuration.Medium, panelClass: 'center' });
    } else {
      let sub = this.monacoService.saveFile(fileContext, directory, true).subscribe(() => { sub.unsubscribe(); });
    }
  }

  //saveAll() {
  // this.editorControl.saveAllFile.emit();
  //}

  menuLabel(item) {
    return `${item.name}`;
  }

  graphicDiagram() {
    let file = this.editorControl.fetchActiveFile();
    if (!file) {
      this.snackBar.open(`Please open a file before you generate a diagram.`, 'Close', { duration: MessageDuration.Long, panelClass: 'center' });
    }
    this.http.post(ENDPOINTS.diagram, { member: file.name, content: file.model.contents }).subscribe(r => {
      window.open(r.url, '_blank');
    });
    this.snackBar.open(`A new window will open after the diagram generated.`, 'Close', { duration: MessageDuration.Long, panelClass: 'center' });
  }

  submitJob() {
    let file = this.editorControl.fetchActiveFile();
    if (!file || (file.model.language !== 'jcl')) {
      this.snackBar.open(`Please open a JCL file before you submit job.`, 'Close', { duration: MessageDuration.Long, panelClass: 'center' });
    } this.http.post(ENDPOINTS.jobs, { contents: file.model.contents }).subscribe(r => {
      let jobId = r.jobid;
      const input = document.createElement('input');
      input.type = 'text';
      input.name = 'copy';
      input.value = jobId;
      input.style.position = 'absolute';
      input.style.left = '-9999px';
      document.body.appendChild(input);
      // open snack bar
      let snackBarRef = this.snackBar.open(
        `Please copy this job id (${jobId}) and check it in terminal.`,
        'Copy',
        {
          duration: MessageDuration.ExtraLong, panelClass: 'center'
        });
      // get snack bar button
      const button = document.getElementsByClassName('mat-simple-snackbar-action')[0];
      button.addEventListener('click', () => {
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      });
      snackBarRef.afterDismissed().subscribe(action => {
        if (action.dismissedByAction) {
          // do something
        }
      });
    });
  }

  setEditorLanguage(language: string) {
    let fileContext = this.editorControl.fetchActiveFile();
    this.editorControl.setHighlightingModeForBuffer(fileContext, language);
    this.editorControl.setThemeForLanguage(language);
  }

  languageActiveCheck(language: string): boolean {
    let fileContext = this.editorControl.fetchActiveFile();
    // check if there is a file opened in editor
    if (fileContext) {
      return fileContext.model.language && fileContext.model.language.toLowerCase() === language.toLowerCase();
    } else {
      return false;
    }
  }

  createFile() {
    setTimeout(() => {
      this.editorControl.createFile();
    });
  }

  createDirectory() {
    setTimeout(() => {
      this.editorControl.createDirectory.next('');
    });
  }

  deleteFile() {
    let deleteFileRef = this.dialog.open(DeleteFileComponent, {
      width: '500px'
    });

    deleteFileRef.afterClosed().subscribe(result => {
      if (result) {
        this.log.debug("Deleting: " + result);
        this.editorControl.deleteFile.next(result);
      }
    });
  }

  undo() {
    this.editorControl.editor.getValue().getModel(this.editorControl.fetchActiveFile().model).undo();
  }

  redo() {
    this.editorControl.editor.getValue().getModel(this.editorControl.fetchActiveFile().model).redo();
  }

  languageServerSetting() {
    let newFileRef = this.dialog.open(LanguageServerComponent, {
      width: '500px'
    });

    newFileRef.afterClosed().subscribe(result => {
      if (result) {
        this.languageServer.updateSettings(result);
        if (result.enable) {
          this.editorControl.connToLS.next('');
        } else {
          this.editorControl.disFromLS.next('');
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.keyBindingSub.unsubscribe();
    this.dialog.closeAll();
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
