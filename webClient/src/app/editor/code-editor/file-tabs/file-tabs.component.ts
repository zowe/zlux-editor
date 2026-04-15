
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import {
  Component, OnInit, Input, Output, EventEmitter,
  Directive, HostListener, Inject, ViewChild, AfterViewChecked
} from '@angular/core';
import { ProjectContext } from '../../../shared/model/project-context';
import { ProjectStructure } from '../../../shared/model/editor-project';
import { EditorControlService } from '../../../shared/editor-control/editor-control.service';
import { Angular2InjectionTokens, Angular2PluginViewportEvents, ContextMenuItem } from 'pluginlib/inject-resources';
import { ZoweYamlService } from '../monaco/zowe-yaml.service';
// import { PerfectScrollbarComponent } from 'ngx-perfect-scrollbar';

@Component({
  selector: 'app-file-tabs',
  templateUrl: './file-tabs.component.html',
  styleUrls: ['./file-tabs.component.scss']
})
export class FileTabsComponent implements OnInit, AfterViewChecked {

  @Input() data: ProjectContext[];
  @Output() remove = new EventEmitter<ProjectContext>();
  @Output() select = new EventEmitter<ProjectContext>();
  @Output() refresh = new EventEmitter<ProjectContext>();
  @Output() compareContents = new EventEmitter<ProjectContext>();
  // @ViewChild(PerfectScrollbarComponent, {static: true}) componentRef: PerfectScrollbarComponent;

  private scrollConfig = {
    wheelPropagation: true,
  };

  private fileTabsScrollConfig = {
    wheelPropagation: true,
    suppressScrollY: true,
    suppressScrollX: false,
    useBothWheelAxes: true
  };

  private prevLength: number;

  constructor(
    private editorControl: EditorControlService,
    private zoweYamlService: ZoweYamlService,
    @Inject(Angular2InjectionTokens.VIEWPORT_EVENTS) private viewportEvents: Angular2PluginViewportEvents) { }

  ngOnInit() {
    this.viewportEvents.resized.subscribe(() => {
      // this.componentRef.directiveRef.update();
    });
    this.editorControl.initializedFile.subscribe(() => {
      // this.componentRef.directiveRef.scrollToRight();
    });

    this.prevLength = 0;
  }

  ngAfterViewChecked() {
    if (this.prevLength !== this.data.length) {
      this.data.forEach((tab, i) => {
        if (!tab.active) {
          return;
        }

        // this.componentRef.directiveRef.scrollToElement(`.tabs-file-list > li:nth-child(${i + 1})`);
      });
    }
    this.prevLength = this.data.length;
  }

  clickHandler(e: Event, item: ProjectContext) {
    this.select.next(item);
  }

  onRightClickTab(event: any, item: ProjectContext) {
    const menuItems: ContextMenuItem[] = [
      {
        text: 'Close',
        action: () => this.remove.next(item)
      },
      {
        text: "Refresh Contents", // TODO: This needs a confirmation modal
        action: () => this.refresh.next(item)
      },
      {
        text: "Compare Contents (Diff)",
        action: () => this.compareContents.next(item)
      }
    ];

    // When the file is recognized as a Zowe YAML configuration, add Zowe-specific
    // items: open the example YAML, open key directories, and open configured servers.
    if (item.model.contents && this.zoweYamlService.isZoweYaml(item.model.contents)) {
      const info = this.zoweYamlService.extractZoweYamlInfo(item.model.contents);
      if (info) {
        // "Show example YAML" — opens <runtimeDirectory>/example-zowe.yaml in the editor
        menuItems.push({
          text: 'Show example YAML',
          action: () => {
            const runtimeDir = info.runtimeDirectory.replace(/\/$/, '');
            const fileNode: ProjectStructure = {
              id: `${runtimeDir}/example-zowe.yaml`,
              name: 'example-zowe.yaml',
              fileName: 'example-zowe.yaml',
              path: runtimeDir,
              hasChildren: false,
              isDataset: false,
            };
            this.editorControl.openFileEmitter.emit(fileNode);
          },
        });

        // "Open Directory..." — submenu to navigate runtime, logs, and extensions
        const dirChildren: ContextMenuItem[] = [
          {
            text: 'Runtime',
            action: () => this.editorControl.openDirectory.next(info.runtimeDirectory),
          },
        ];
        if (info.logDirectory) {
          dirChildren.push({
            text: 'Logs',
            action: () => this.editorControl.openDirectory.next(info.logDirectory),
          });
        }
        if (info.extensionDirectory) {
          dirChildren.push({
            text: 'Extensions',
            action: () => this.editorControl.openDirectory.next(info.extensionDirectory),
          });
        }
        menuItems.push({ text: 'Open Directory...', children: dirChildren });

        // "Open Zowe Server" — submenu for each configured server
        const serverLinks = this.zoweYamlService.buildServerLinksForContext(item);
        if (serverLinks.length > 0) {
          menuItems.push({
            text: 'Open Zowe Server',
            children: serverLinks.map(link => ({
              text: link.name,
              action: () => window.open(link.url, '_blank'),
            })),
          });
        }
      }
    }

    this.viewportEvents.spawnContextMenu(event.clientX, event.clientY, menuItems, true)
    event.stopImmediatePropagation();
    event.preventDefault();
  }

}

@Directive({
  // tslint:disable-next-line:directive-selector
  selector: '[mClick]'
})
export class MouseMiddleClickDirective {
  @Input('fileContext') fileContext: ProjectContext;
  @HostListener('click', ['$event']) onMouseMiddleClick($event: Event) {
    // this.log.debug(`Click. Event=${$event}`);
  }
  @HostListener('dblclick', ['$event']) onMouseDoubleClick($event: Event) {
    this.editorControl.closeFileHandler(this.fileContext);
    this.editorControl.closeFile.next(this.fileContext);
  }
  constructor(private editorControl: EditorControlService,
    @Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger) { }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
