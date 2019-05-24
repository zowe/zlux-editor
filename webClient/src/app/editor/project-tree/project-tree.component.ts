
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit, ViewChild, Inject } from '@angular/core';
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
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';
import { FileBrowserUSSComponent } from '@zlux/file-explorer/src/app/components/filebrowseruss/filebrowseruss.component';
import { ZluxFileExplorerComponent } from '@zlux/file-explorer/src/app/components/zlux-file-explorer/zlux-file-explorer.component';
import { OpenDatasetComponent } from '../../shared/dialog/open-dataset/open-dataset.component';
import { B64Decoder } from '../../shared/b64-decoder';

@Component({
  selector: 'app-project-tree',
  templateUrl: './project-tree.component.html',
  styleUrls: ['./project-tree.component.scss',  '../../../styles.scss']
})
export class ProjectTreeComponent implements OnInit {

  @ViewChild(TreeComponent)
  private tree: TreeComponent;

  @ViewChild(ZluxFileExplorerComponent)
  private fileExplorer: ZluxFileExplorerComponent;

  private showDatasets: Boolean;

  nodes: ProjectStructure[];
  options = {
    animateExpand: false,
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
      if (node.data.isDataset) {
        let requestUrl = ZoweZLUX.uriBroker.datasetMetadataUri(node.data.path.trim(), undefined, undefined, true);
        return this.httpService.get(requestUrl).toPromise().then((file: any) => {
          let struct = this.dataAdapter.convertDatasetMemberList(file);
          return struct.map(f => {
            f.parent = node.data;
            return f;
          });
        });
      } else {
        // let requestUrl: string = this.utils.formatUrl(ENDPOINTS.projectFile, { name: node.data.name });
        // convert path to adjust url. If path is start with '/' then remove it.
        let targetPath = ['/', '\\'].indexOf(node.data.path.substring(0, 1)) > -1 ? node.data.path.substring(1) : node.data.path;
        let requestUrl: string = ZoweZLUX.uriBroker.unixFileUri('contents',
                                                                `${targetPath}/${node.data.fileName}`);
                                                                
        return this.httpService.get(requestUrl).toPromise().then((dirList: any) => {
          let fileStructure = this.dataAdapter.convertDirectoryList(dirList);
          return fileStructure.map(f => {
            f.parent = node.data;
            return f;
          });
        });
      }
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
    private codeEditorService: EditorService,
    @Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger) {

    this.editorControl.projectNode.subscribe((nodes) => {
      this.nodes = nodes;
    });

    this.showDatasets = false;

    this.editorControl.openProject.subscribe(projectName => {
      if (projectName != null) {
        // start get project structure
        // TODO: move these logic to a function
        let requestUrl = this.utils.formatUrl(ENDPOINTS.projectStructure, { name: projectName });
        this.httpService.get(requestUrl)
          .subscribe((response: any) => {
            // TODO: nodes should check project context once the component is loaded.
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
      //Note: This temporary hack is used to hide datasets using the original slower Editor structure.
      // Will be removed when Dataset functionality for Explorer gets better.
        this.fileExplorer.showUss();
        this.fileExplorer.updateDirectory(dirName);
        this.showDatasets = false;
    });

    this.editorControl.openDataset.subscribe(dirName => {
      if (dirName != null && dirName !== '') {
        if (dirName[0] == '/') {
          //Note: This temporary hack is used to hide datasets using the original slower Editor structure.
          // Will be removed when Dataset functionality for Explorer gets better.
            this.fileExplorer.showUss();
            this.fileExplorer.updateDirectory(dirName);
            this.showDatasets = false;
        } else { //Datasets
          //Note: This temporary hack is used to show datasets using the original slower Editor structure.
          // Will be removed when Dataset functionality for Explorer gets better.

          let requestUrl = ZoweZLUX.uriBroker.datasetMetadataUri(dirName, 'true');
          this.httpService.get(requestUrl)
            .subscribe((response: any) => {
              this.fileExplorer.showDatasets();
              this.fileExplorer.hideExplorers();
              this.showDatasets = true;
              this.nodes = this.dataAdapter.convertDatasetList(response);
              this.editorControl.setProjectNode(this.nodes);
              this.editorControl.initProjectContext(dirName, this.nodes);
            }, e => {
              // TODO
            });
        }
      }
    });

    this.editorControl.deleteFile.subscribe(pathAndName => {
      this.fileExplorer.deleteFile(pathAndName);
    });
  }
  
  ngOnInit() {
  }

  onCopyClick($event: any){
    // Todo: Create right click menu functionality.
  }

  onDatasetSelect() {
    this.fileExplorer.hideExplorers();
    this.showDatasets = true;
  }

  onDeleteClick($event: any){
    // Todo: Create right click menu functionality.
  }

  onNewFileClick($event: any){
    // Todo: Create right click menu functionality.
  }

  onNewFolderClick($event: any){
    // Todo: Create right click menu functionality.
  }

  onNodeClick($event:any){
    if ($event.directory == false) {
      //let nodeData: ProjectStructure = new ProjectStructure();
      const nodeData: ProjectStructure = {
        encoding: $event.ccsid,
        hasChildren: false,
        fileName: $event.name,
        id: $event.id + 1,
        isDataset: false,
        name: $event.name,
        path: $event.path.substring(0, $event.path.length - $event.name.length - 1)
    };
  
      this.editorControl.openFile('', nodeData).subscribe(x => {
        this.log.debug(`File loaded through File Explorer.`);
      });
    } else { }
  }

  onPathChanged($event: any) {
    // Currently, we check for when the path's changed for Dataset viewing, so we only need to treat
    // it within a dataset context. This will probably be removed along with other hacks for temporarily
    // keeping the original dataset viewer.
    this.fileExplorer.hideExplorers();
    this.showDatasets = true;
    this.editorControl.projectName = $event;
    this.editorControl.openDataset.next($event);
  }

  onRenameClick($event: any) {
    // Todo: Create right click menu functionality.
  }

  onUssSelect() {
    this.fileExplorer.showUss();
    this.showDatasets = false;
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
        this.showDatasets = false;
        this.fileExplorer.showUss();
        this.editorControl.projectName = result;
        this.editorControl.openDirectory.next(result);
      }
    });
  }

  nodeActivate($event: any) {
    if (!$event.node.data.children && !$event.node.data.hasChildren) {
      const nodeData: ProjectStructure = $event.node.data;
      this.editorControl.openFile('', nodeData).subscribe(x => {
        this.log.debug(`NodeData=`,nodeData);
        this.log.debug(`file loaded through project explorer.`);
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
