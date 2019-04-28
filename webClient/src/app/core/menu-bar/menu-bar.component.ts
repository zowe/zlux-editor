
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material';
import { MENU } from './menu-bar.config';
import { EditorControlService } from '../../shared/editor-control/editor-control.service';
import { OpenProjectComponent } from '../../shared/dialog/open-project/open-project.component';
import { OpenFolderComponent } from '../../shared/dialog/open-folder/open-folder.component';
import { NewFileComponent } from '../../shared/dialog/new-file/new-file.component';
import { LanguageServerComponent } from '../../shared/dialog/language-server/language-server.component';
import { HttpService } from '../../shared/http/http.service';
import { ENDPOINTS } from '../../../environments/environment';
import { UtilsService } from '../../shared/utils.service';
import { SnackBarService } from '../../shared/snack-bar.service';
import { MonacoService } from '../../editor/code-editor/monaco/monaco.service';
import { LanguageServerService } from '../../shared/language-server/language-server.service';

@Component({
  selector: 'app-menu-bar',
  templateUrl: './menu-bar.component.html',
  styleUrls: ['./menu-bar.component.scss',  '../../../styles.scss']
})
export class MenuBarComponent implements OnInit {
  private menuList: any = MENU;
  private menuActive: any = false;

  constructor(
    private http: HttpService,
    private editorControl: EditorControlService,
    private monacoService: MonacoService,
    private languageServer: LanguageServerService,
    private utils: UtilsService,
    private dialog: MatDialog,
    private snackBar: SnackBarService,
  ) {
    // add monaco languages support to menu
    let languageMenu = {
      name: 'Language',
      children: []
    };

    this.editorControl.editorCore.subscribe((monaco) => {
      // TODO: check language active status when open a file but not use directive in template
      if (monaco != null) {
        languageMenu.children = monaco.languages.getLanguages()
          .map(language => ({
            name: language.aliases[0],
            type: 'checkbox',
            action: {
              name: 'setEditorLanguage',
              params: [language.id],
            },
            active: {
              name: 'languageActiveCheck',
              params: [language.id],
            }
          }));
        let existItem = this.menuList.filter(m => m.name === 'Language');
        existItem.length > 0 ? existItem.children = languageMenu.children : this.menuList.splice(-1, 0, languageMenu);
      }
    });

    // this.editorControl.saveAllFile.subscribe(x => {
    //   this.saveAll();
    // });
  }

  ngOnInit() {
  }

  menuAction(actionName: string, actionParams: any[]): any {
    if (actionName != null) {
      return this[actionName].apply(this, actionParams != null ? actionParams : []);
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
    let sub = this.monacoService.saveFile(fileContext).subscribe(() => { sub.unsubscribe(); });
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
      this.snackBar.open(`Please open a file before you generate a diagram.`, 'Close', { duration: 2000, panelClass: 'center' });
    }
    this.http.post(ENDPOINTS.diagram, { member: file.name, content: file.model.contents }).subscribe(r => {
      window.open(r.url, '_blank');
    });
    this.snackBar.open(`A new window will open after the diagram generated`, 'Close', { duration: 2000, panelClass: 'center' });
  }

  submitJob() {
    let file = this.editorControl.openFileList.getValue().filter(x => x.active === true)[0];
    if (!file || (file.model.language !== 'jcl')) {
      this.snackBar.open(`Please open a JCL file before you submit job.`, 'Close', { duration: 2000, panelClass: 'center' });
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
          duration: 5000, panelClass: 'center'
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
    this.editorControl.createFile("new_file");
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
