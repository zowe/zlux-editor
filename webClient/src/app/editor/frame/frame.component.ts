
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, Inject, OnDestroy, OnInit, Optional } from '@angular/core';
import { EditorControlService } from '../../shared/editor-control/editor-control.service';
import { ProjectContext } from '../../shared/model/project-context';
import { LineMapping } from '../../shared/model/line-mapping';
import { UtilsService } from '../../shared/utils.service';
import { ENDPOINTS } from '../../../environments/environment';
import { HttpService } from '../../shared/http/http.service';
import { MonacoService } from '../code-editor/monaco/monaco.service';
import * as _ from 'lodash';
import { Subscription } from 'rxjs';
import { EditorKeybindingService } from '../../shared/editor-keybinding.service';
import { KeyCode } from '../../shared/keycode-enum';
import { Angular2InjectionTokens, Angular2PluginWindowActions } from 'pluginlib/inject-resources';


@Component({
  selector: 'app-frame',
  templateUrl: './frame.component.html',
  styleUrls: ['./frame.component.scss']
})
export class FrameComponent implements OnInit, OnDestroy {

  private expendPanelOptions = {
    collapsedHeight: '24px',
    expandedHeight: '24px',
  };

  private searchField = '';
  private contentField = '';
  private fileResultList = [];
  private contentResultList: LineMapping[] = [];
  private cantSearch = true;
  showExplorer = true;
  private keyBindingSub: Subscription = new Subscription();
  activityBar = [
    {
      name: 'Explorer',
      active: true,
      icon: 'folder',
      classes: ['gz-explorer'],
    },
    // {
    //   name: 'Search',
    //   active: false,
    //   icon: 'search',
    //   classes: ['gz-search'],
    // }
  ];

  private scrollConfig = {
    wheelPropagation: true,
  };

  constructor(
    private editorControl: EditorControlService,
    private utils: UtilsService,
    private http: HttpService,
    private monacoService: MonacoService,
    private appKeyboard: EditorKeybindingService,
    @Optional() @Inject(Angular2InjectionTokens.WINDOW_ACTIONS) private windowActions: Angular2PluginWindowActions) {
    // this.editorControl.context.subscribe((context) => {
    //   context != null ? this.showSearchBar = true : this.showSearchBar = false;
    // });
    this.editorControl.openProject.subscribe(() => {
      this.cantSearch = false;
    });

    this.editorControl.openProject.subscribe(() => {
      this.cantSearch = false;
    });
    this.editorControl.toggleTree.subscribe(() => {
      this.toggleTree();
    });


    this.keyBindingSub.add(this.appKeyboard.keydownEvent.subscribe((event) => {
      if (event.which === KeyCode.KEY_B) {
        this.editorControl.toggleTree.next('');
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    }));
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    this.keyBindingSub.unsubscribe();
  }

  disableInput() {
    return !this.editorControl.context.getValue();
  }

  searchFileByName() {
    if (!!this.searchField) {
      let _context = this.editorControl.context.getValue();
      if (this.searchField === '*') {
        this.searchField = '';
      }
      this.fileResultList = this.recursiveFileInContext(this.searchField, _context);
    } else {
      this.fileResultList = [];
    }
  }

  searchFileContent() {
    let requestUrl = this.utils.formatUrl(ENDPOINTS.searchInFile, { project: this.editorControl.projectName, pattern: this.contentField });
    this.http.get(requestUrl).subscribe(result => {
      this.contentResultList = <LineMapping[]>_.take(result.matched.map(r => {
        return {
          dataset: r[0],
          member: r[1],
          line: parseInt(r[2], 0),
          content: r[3],
        };
      }), 100);
    });
  }

  private recursiveFileInContext(fileName: string, context: ProjectContext[]) {
    let resultList = [];
    for (let item of context) {
      // if this is a file
      if (item.name.toLowerCase().indexOf(fileName.toLowerCase()) > -1 && !item.model.hasChildren) {
        resultList.push(item);
      }
      if (item.children) {
        // if this is a folder
        resultList = resultList.concat(this.recursiveFileInContext(fileName, item.children));
      }
    }
    return resultList;
  }

  openFile(file: ProjectContext) {
    this.editorControl.openBuffer('', file.model);
    // this.editorControl.openFileEmitter.next(file.model);
  }

  nodeIcon(node: ProjectContext) {
    let iconName = '';
    if (node.children) {
      return 'folder';
    } else {
      // let openFile = this.editorControl.openFileList.getValue();
      // for (let file of openFile) {
      //   if (file.name === node.data.name) {
      //     return 'edit';
      //   }
      // }
      return 'assignment';
    }
  }

  getActivityButtonClasses(buttonItem) {
    return buttonItem.classes.concat(buttonItem.active ? ['active'] : []);
  }

  switchActivity(index: number) {
    this.activityBar.forEach((item, i) => {
      if (i === index) {
        item.active = true;
      } else {
        item.active = false;
      }
    });
  }

  fileResultHtml(content: string) {
    // let startIndex = content.indexOf(this.contentField);
    // return `${content.substring(0, startIndex)}<span>aaaa</span>${content.substring(startIndex + content.length)}`;
    return content;
  }

  jumpToFile(map: LineMapping) {
    // this.editorControl.updateTree.next(map.dataset);
    // let sub = this.editorControl.treeUpdated.subscribe(x => {

    // });
    // this.editorControl.projectNode.getValue();
    // let dsContext = this.editorControl.fetchFileContext({ name: map.dataset });
    // let memberContext = <ProjectContext>this.editorControl.generateProjectContext({ name: map.member, line: map.line }, dsContext);
    // dsContext.children ? dsContext.children.push(memberContext) : dsContext.children = [memberContext];
    // this.editorControl.openFile.next(memberContext.model);
    this.editorControl.openBuffer('', { name: map.member, parent: map.dataset, line: map.line, hasChildren: false });
    // this.editorControl.openFileEmitter.next({ name: map.member, parent: map.dataset, line: map.line, hasChildren: false });
  }

  clearSearch(name: string, cleanDecorator: boolean) {
    this[name] = '';
    if (cleanDecorator) {
      this.monacoService.cleanDecoration();
    }
  }

  toggleTree() {
    this.showExplorer = !this.showExplorer;
    this.editorControl.refreshLayout.next('');
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
