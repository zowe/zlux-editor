
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog } from '@angular/material';
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
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';

function initMenu(menuItems) {
  menuItems.forEach(function(menuItem) {
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
    for (let i = 0; i < keys.length; i++){
      menus[keys[i]] = initMenu(menus[keys[i]]);
    }
    return menus;
  }
}

@Component({
  selector: 'app-menu-bar',
  templateUrl: './menu-bar.component.html',
  styleUrls: ['./menu-bar.component.scss',  '../../../styles.scss']
})
export class MenuBarComponent implements OnInit {
  private menuList: any = MENU.slice(0);//clone to prevent language from persisting
  private currentLang: string | undefined;
  private fileCount: number = 0;
  private monaco: any;
  private languageSelectionMenu: any = {
    name: 'Language',
    children: []
  };

  public languagesMenu: any = (Object as any).assign({}, LANGUAGE_MENUS);//clone for sanitization
  
  constructor(
    private http: HttpService,
    private editorControl: EditorControlService,
    private monacoService: MonacoService,
    private languageServer: LanguageServerService,
    private utils: UtilsService,
    private dialog: MatDialog,
    private snackBar: SnackBarService,
    @Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger,
    @Inject(Angular2InjectionTokens.PLUGIN_DEFINITION) private pluginDefinition: ZLUX.ContainerPluginDefinition
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
    this.languagesMenu = initMenus(this.languagesMenu);

    this.editorControl.languageRegistered.subscribe((languageDefinition)=> {
      this.resetLanguageSelectionMenu();
    });
    
    this.editorControl.selectFile.subscribe((fileContext)=> {
      if (this.fileCount != 0){this.showLanguageMenu(fileContext.model.language);}
    });

    this.editorControl.initializedFile.subscribe((fileContext)=> {
      this.showLanguageMenu(fileContext.model.language);
      this.fileCount++;
      this.log.debug(`fileCount now=`,this.fileCount);
    });

    this.editorControl.closeFile.subscribe(()=> {
      if (this.fileCount != 0) {
        this.fileCount--;
        this.log.debug(`fileCount now=`,this.fileCount);
      } else {
        this.log.warn(`Open file count cannot be made negative`);
      }
      this.removeLanguageMenu();
    });

    this.editorControl.changeLanguage.subscribe((obj:{context: any, language: string})=> {
      this.showLanguageMenu(obj.language);
    });

    this.editorControl.editorCore.subscribe((monaco) => {
      if (monaco != null) {
        this.monaco = monaco;
        //This is triggered after monaco initializes & is loaded with configuration items
        this.resetLanguageSelectionMenu();
      }
    });

    // this.editorControl.saveAllFile.subscribe(x => {
    //   this.saveAll();
    // });

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
    this.languageSelectionMenu.children = this.monaco.languages.getLanguages().sort(function(lang1, lang2) {
      let name1 = lang1.aliases[0].toLowerCase();
      let name2 = lang2.aliases[0].toLowerCase();
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
    const removeSelectionMenu = this.fileCount===0;
    for (let i = 0; i < this.menuList.length; i++) {
      if (this.currentLang && this.menuList[i].name === this.currentLang) {
        this.menuList.splice(i,1);
        if (!removeSelectionMenu) {
          break;
        }
        i = -1;
      } else if (removeSelectionMenu && this.menuList[i].name === 'Language') {
        this.menuList.splice(i,1);
        i = -1;
      }  
    }
  }

  showLanguageMenu(language) {
    let menus = [];
    if (this.fileCount===0) {//will become 1 after
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
    if (menus.length>0) {
      this.menuList.splice(this.fileCount===0 ? 1 : 2 ,0,...menus);
    }
  }
  
  ngOnInit() {
    if (this.editorControl._isTestLangMode) {
      this.log.info(`Adding test language menu`);
      this.languagesMenu['TEST_LANGUAGE'] = TEST_LANGUAGE_MENU;
    }
  }

  menuAction(menuItem: any): any {
    if (!menuItem) {
      return;
    }
    const editor = this.editorControl.editor.getValue();
    if (editor) {
      const context = { editor: editor,
                        controller: this.editorControl,
                        log: this.log };

      if (menuItem.internalName != null) {
        return this[menuItem.internalName].apply(this, menuItem.params ? menuItem.params : []);
      } else if (menuItem.func) {
        menuItem.func(context, ...menuItem.params);
        return;
      } else {
        this.log.warn(`Cant do menu action, no function to execute.`);
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
        this.editorControl.projectName = result;
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
        this.editorControl.projectName = result;
        this.editorControl.openDataset.next(result);
      }
    });
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
    if (!fileContext) {
      this.snackBar.open('Warning: Cannot save, no file found', 'Dismiss', {duration: MessageDuration.Medium, panelClass: 'center'});
    } else if (fileContext.model.isDataset) {
      this.snackBar.open('Dataset saving not yet supported', 'Dismiss', {duration: MessageDuration.Short, panelClass: 'center'});
    } else {
      let sub = this.monacoService.saveFile(fileContext).subscribe(() => { sub.unsubscribe(); });
    }   
  }

  //saveAll() {
   // this.editorControl.saveAllFile.emit();
  //}

  menuLabel(item) {
    return `${item.name} ${item.keyMap ? item.keyMap : ''}`;
  }

  graphicDiagram() {
    let file = this.editorControl.openFileList.getValue().filter(x => x.active === true)[0];
    if (!file) {
      this.snackBar.open(`Please open a file before you generate a diagram.`, 'Close', { duration: MessageDuration.Long, panelClass: 'center' });
    }
    this.http.post(ENDPOINTS.diagram, { member: file.name, content: file.model.contents }).subscribe(r => {
      window.open(r.url, '_blank');
    });
    this.snackBar.open(`A new window will open after the diagram generated`, 'Close', { duration: MessageDuration.Long, panelClass: 'center' });
  }

  submitJob() {
    let file = this.editorControl.openFileList.getValue().filter(x => x.active === true)[0];
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
    this.editorControl.createFile("(new)");
    /*
    let newFileRef = this.dialog.open(NewFileComponent, {
      width: '500px'
    });

    newFileRef.afterClosed().subscribe(result => {
      if (result) {
        this.editorControl.createFile(result);
      }
    });
    */
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

  languageServerSetting() {
    let newFileRef = this.dialog.open(LanguageServerComponent, {
      width: '500px'
    });

    newFileRef.afterClosed().subscribe(result => {
      if (result) {
        this.languageServer.updateSettings(JSON.parse(result.config));
        if (result.enable) {
          this.editorControl.connToLS.next();
        } else {
          this.editorControl.disFromLS.next();
        }
      }
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
