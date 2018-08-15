
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit, ViewChild } from '@angular/core';
import { Response } from '@angular/http';
import { MatDialog } from '@angular/material';
import { TreeNode, TREE_ACTIONS, TreeComponent } from 'angular-tree-component';
import { OpenProjectComponent } from '../../shared/dialog/open-project/open-project.component';
import { OpenFolderComponent } from '../../shared/dialog/open-folder/open-folder.component';
import { HttpService } from '../../shared/http/http.service';
import { ENDPOINTS } from '../../../environments/environment';
import { ProjectStructure } from '../../shared/model/editor-project';
import { ProjectContext } from '../../shared/model/project-context';
import { EditorControlService } from '../../shared/editor-control/editor-control.service';
import { EditorService } from '../editor.service';
import { UtilsService } from '../../shared/utils.service';
import { DataAdapterService } from '../../shared/http/http.data.adapter.service';
import { SnackBarService } from '../../shared/snack-bar.service';

@Component({
  selector: 'app-project-tree',
  templateUrl: './project-tree.component.html',
  styleUrls: ['./project-tree.component.scss']
})
export class ProjectTreeComponent implements OnInit {

  @ViewChild(TreeComponent)
  private tree: TreeComponent;

  nodes: ProjectStructure[];
  options = {
    animateExpand: true,
    actionMapping: {
      mouse: {
        // dblClick: (tree, node, $event) => {
        //   if (node.hasChildren) { TREE_ACTIONS.TOGGLE_EXPANDED(tree, node, $event); }
        // },
        // click: (tree, node, $event) => {
        // since this function will replace the origin handler
        // so we extend click handler in ProjectTreeComponent.nodeClickHandler
        // }
      },
    },
    getChildren: (node: TreeNode) => {
      // let requestUrl: string = this.utils.formatUrl(ENDPOINTS.projectFile, { name: node.data.name });
      // convert path to adjust url. If path is start with '/' then remove it.
      let targetPath = ['/', '\\'].indexOf(node.data.path.substring(0, 1)) > -1 ? node.data.path.substring(1) : node.data.path;
      let requestUrl: string = this.utils.formatUrl(ENDPOINTS.openUnixDirectory, { path: `${targetPath}/${node.data.fileName}` });
      return this.httpService.get(requestUrl).toPromise().then((file: any) => {
        let fileStructure = this.dataAdapter.convertDirectoryList(file);
        return fileStructure.map(f => {
          f.parent = node.data;
          return f;
        });
      });
    }
  };

  private scrollConfig = {
    wheelPropagation: true,
  };

  constructor(
    private httpService: HttpService,
    private dataAdapter: DataAdapterService,
    private utils: UtilsService,
    private dialog: MatDialog,
    private editorControl: EditorControlService,
    private snackBarService: SnackBarService,
    private codeEditorService: EditorService) {

    this.editorControl.projectNode.subscribe((nodes) => {
      this.nodes = nodes;
    });

    this.editorControl.openProject.subscribe(projectName => {
      if (projectName != null) {
        // start get project structure
        // TODO: move these logic to a function
        let requestUrl = this.utils.formatUrl(ENDPOINTS.projectStructure, { name: projectName });
        this.httpService.get(requestUrl)
          .subscribe((response: any) => {
            // TODO: "nodes" should check project context once the component is loaded.
            // TODO: if there is a file in root directory 'has children' can't be true
            this.nodes = response.datasets.map(r => {
              return {
                name: r,
                hasChildren: true,
              };
            });
            this.editorControl.setProjectNode(this.nodes);
            this.editorControl.initProjectContext(projectName, this.nodes);
          });
      }
    });

    this.editorControl.openDirectory.subscribe(dirName => {
      if (dirName != null && dirName !== '') {
        // start get project structure
        dirName = ['/', '\\'].indexOf(dirName.substring(0, 1)) > -1 ? dirName.substring(1) : dirName;
        let requestUrl = this.utils.formatUrl(ENDPOINTS.openUnixDirectory, { path: dirName });
        this.httpService.get(requestUrl)
          .subscribe((response: any) => {
            // TODO: "nodes" should check project context once the component is loaded.
            this.nodes = this.dataAdapter.convertDirectoryList(response);
            this.editorControl.setProjectNode(this.nodes);
            this.editorControl.initProjectContext(this.utils.getFolderName(dirName), this.nodes);
          }, e => {
            let error = e.json().error;
            this.snackBarService.open(`Directory ${dirName} is not exist!`, 'Close', { duration: 2000, panelClass: 'center' });
          });
      }
    });
    this.editorControl.openDataset.subscribe(dirName => {
     // TODO: reference openDirectory
     // 1, Request dataset list from server
     // 2, The the response and convert fetched data with data adapter (need add logic to adapter)
     // 3, Pass formated data to nodes. All set!
    });
  }
  ngOnInit() {
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
    let openDirectoryRef = this.dialog.open(OpenFolderComponent, {
      width: '500px'
    });

    openDirectoryRef.afterClosed().subscribe(result => {
      if (result) {
        this.editorControl.projectName = result;
        this.editorControl.openDirectory.next(result);
      }
    });
  }

  nodeActivate($event: any) {
    if (!$event.node.data.children && !$event.node.data.hasChildren) {
      const nodeData: ProjectStructure = $event.node.data;
      this.editorControl.openFile('', nodeData).subscribe(x => {
        console.log('file loaded through project explorer.');
      });
      // this.editorControl.openFileEmitter.emit(nodeData);
    }
  }

  nodeClickHandler(node: TreeNode, $event: any) {
    node.mouseAction('click', $event);
    if (node.hasChildren) {
      TREE_ACTIONS.TOGGLE_EXPANDED(node.treeModel, node, $event);
      // TREE_ACTIONS.TOGGLE_ACTIVE(tree, node, $event);
      // TREE_ACTIONS.TOGGLE_SELECTED(tree, node, $event);
      // TREE_ACTIONS.FOCUS(tree, node, $event);
    }
  }

  treeUpdate($event: any) {
    this.editorControl.setProjectNode($event.treeModel.nodes);
    this.editorControl.initProjectContext('', $event.treeModel.nodes);
  }

  fetchNode(nodeName: string, nodes?: ProjectStructure[]): ProjectStructure {
    let result: ProjectStructure;
    if (nodes == null) { nodes = this.tree.treeModel.nodes; }
    for (let node of nodes) {
      if (node.name === nodeName) {
        result = node;
        break;
      }
      if (node.children) {
        result = this.fetchNode(nodeName, node.children);
      }
    }
    return result;
  }

  nodeIcon(node: TreeNode) {
    let iconName = '';
    if (node.hasChildren) {
      return 'folder';
    } else {
      let openFile = this.editorControl.openFileList.getValue();
      for (let file of openFile) {
        if (file.id === node.data.id) {
          return 'edit';
        }
      }
      return 'assignment';
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
