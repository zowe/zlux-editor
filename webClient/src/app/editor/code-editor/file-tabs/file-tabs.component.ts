
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit, Input, Output, EventEmitter,
         Directive, HostListener, Inject, ViewChild, AfterViewChecked} from '@angular/core';
import { ProjectContext } from '../../../shared/model/project-context';
import { EditorControlService } from '../../../shared/editor-control/editor-control.service';
import { Angular2InjectionTokens, Angular2PluginViewportEvents } from 'pluginlib/inject-resources';
import { PerfectScrollbarComponent } from 'ngx-perfect-scrollbar';

@Component({
  selector: 'app-file-tabs',
  templateUrl: './file-tabs.component.html',
  styleUrls: ['./file-tabs.component.scss',  '../../../../styles.scss']
})
export class FileTabsComponent implements OnInit, AfterViewChecked {

  @Input() data: ProjectContext[];
  @Output() remove = new EventEmitter<ProjectContext>();
  @Output() select = new EventEmitter<ProjectContext>();
  @ViewChild(PerfectScrollbarComponent) componentRef: PerfectScrollbarComponent;

  private scrollConfig = {
    wheelPropagation: true,
  };

  private fileTabsScrollConfig = {
    wheelPropagation: true,
    suppressScrollY: true,
    suppressScrollX: false,
    useBothWheelAxes: true
  };

  private prevLength:number;

  constructor(
    private editorControl: EditorControlService,
    @Inject(Angular2InjectionTokens.VIEWPORT_EVENTS) private viewportEvents: Angular2PluginViewportEvents) {}

  ngOnInit() {
    this.viewportEvents.resized.subscribe(()=> {
      this.componentRef.directiveRef.update();
    });
    this.editorControl.initializedFile.subscribe(() => {
      this.componentRef.directiveRef.scrollToRight();
    });

    this.prevLength = 0;
  }

  ngAfterViewChecked() {
   if (this.prevLength !== this.data.length) {
    this.data.forEach((tab, i) => {
      if (!tab.active) {
        return;
      }

      this.componentRef.directiveRef.scrollToElement(`.tabs-file-list > li:nth-child(${i + 1})`);
    });
   }
   this.prevLength = this.data.length; 
  }

  clickHandler(e: Event, item: ProjectContext) {
    this.select.next(item);
  }

  
}

@Directive({
  // tslint:disable-next-line:directive-selector
  selector: '[mClick]'
})
export class MouseMiddleClickDirective {
  @Input('fileContext') fileContext: ProjectContext;
  @HostListener('click', ['$event']) onMouseMiddleClick($event: Event) {
    this.log.debug(`Click. Event=${$event}`);
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
