
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, ViewChild, Inject } from '@angular/core';
import { MatDialog } from '@angular/material';
import { TreeNode, TreeComponent } from 'angular-tree-component';
import { OpenProjectComponent } from '../../shared/dialog/open-project/open-project.component';
import { OpenFolderComponent } from '../../shared/dialog/open-folder/open-folder.component';
import { HttpService } from '../../shared/http/http.service';
import { ENDPOINTS } from '../../../environments/environment';
import { ProjectStructure } from '../../shared/model/editor-project';
import { EditorControlService } from '../../shared/editor-control/editor-control.service';
import { EditorService } from '../editor.service';
import { UtilsService } from '../../shared/utils.service';
import { DataAdapterService } from '../../shared/http/http.data.adapter.service';
import { SnackBarService } from '../../shared/snack-bar.service';
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';
import { ZluxFileExplorerComponent } from '@zlux/file-explorer/src/app/components/zlux-file-explorer/zlux-file-explorer.component';

function getDatasetName(dirName) {
  let lParenIndex = dirName.indexOf('(');
  let rParenIndex = dirName.lastIndexOf(')');
  if (lParenIndex > 0 && lParenIndex < 46 && rParenIndex == dirName.length-1) {
    return dirName.substring(0,lParenIndex);
  } else {
    return dirName;
  }
}

@Component({
  selector: 'app-project-tree',
  templateUrl: './project-tree.component.html',
  styleUrls: ['./project-tree.component.scss',  '../../../styles.scss']
})
export class ProjectTreeComponent {

  @ViewChild(TreeComponent)
  private tree: TreeComponent;

  @ViewChild(ZluxFileExplorerComponent)
  private fileExplorer: ZluxFileExplorerComponent;

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
      if (dirName.startsWith('/')) {
        this.fileExplorer.updateDirectory(dirName);
      } else {
        let dsName = getDatasetName(dirName);
        this.fileExplorer.updateDSList(dsName);
      }
    });

    this.editorControl.openDataset.subscribe(dirName => {
      if (dirName != null && dirName !== '') {
        if (dirName[0] != '/') {
          dirName = dirName.toUpperCase();
          let isMember = false;
          let dsName = getDatasetName(dirName);
          if (dirName == dsName) {
            let periodPos = dirName.lastIndexOf('.');
            if (periodPos) {
              this.fileExplorer.updateDSList(dirName.substring(0,periodPos+1)+'**');
            } else {
              this.fileExplorer.updateDSList(dirName);
            }
          } else {
            isMember = true;
            this.fileExplorer.updateDSList(dsName);
          }
          let requestUrl = ZoweZLUX.uriBroker.datasetMetadataUri(dirName.toUpperCase(), 'true');
          this.httpService.get(requestUrl)
            .subscribe((response: any) => {
              this.nodes = isMember ? this.dataAdapter.convertDatasetMemberList(response) : this.dataAdapter.convertDatasetList(response);
              this.editorControl.setProjectNode(this.nodes);
              this.editorControl.openFile('',this.nodes[0]).subscribe(x=> {this.log.debug('Dataset opened')});
            }, e => {
              // TODO
            });
          
        } else {
          this.fileExplorer.updateDirectory(dirName);
        }
      }
    });

    this.editorControl.deleteFile.subscribe(pathAndName => {
      this.fileExplorer.deleteFileOrFolder(pathAndName);
    });
  }
  

  onCopyClick($event: any){
    // Todo: Create right click menu functionality.
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
    } else if($event.data.isDataset){
      let data: ProjectStructure = ($event.data as ProjectStructure);
      if($event.type == 'file'){
        this.editorControl.openFile('', (data)).subscribe(x => {
          this.log.debug(`Dataset loaded through File Explorer.`);
        });
      }
    }
  }

  onPathChanged($event: any) {
    // Currently, we check for when the path's changed for Dataset viewing, so we only need to treat
    // it within a dataset context. This will probably be removed along with other hacks for temporarily
    // keeping the original dataset viewer.
    this.fileExplorer.hideExplorers();
    this.editorControl.projectName = $event;
    this.editorControl.openDataset.next($event);
  }

  onRenameClick($event: any) {
    // Todo: Create right click menu functionality.
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
