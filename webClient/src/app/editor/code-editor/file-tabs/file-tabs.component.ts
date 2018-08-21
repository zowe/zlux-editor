
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit, Input, Output, EventEmitter, Directive, HostListener, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ProjectContext } from '../../../shared/model/project-context';
import { EditorControlService } from '../../../shared/editor-control/editor-control.service';
import { PerfectScrollbarComponent, PerfectScrollbarDirective } from '../../../../../node_modules/ngx-perfect-scrollbar';

@Component({
  selector: 'app-file-tabs',
  templateUrl: './file-tabs.component.html',
  styleUrls: ['./file-tabs.component.scss']
})
export class FileTabsComponent implements OnInit, AfterViewInit {

  @Input() data: ProjectContext[];
  @Output() remove = new EventEmitter<ProjectContext>();
  @Output() select = new EventEmitter<ProjectContext>();
  @ViewChild('containerRef') containerRef: ElementRef;
  @ViewChild('ps') ps: PerfectScrollbarComponent;

  private scrollbarOffset = 0;

  private scrollConfig = {
    wheelPropagation: true,
    suppressScrollY: true,
  };

  constructor() { }

  ngOnInit() {
  }

  ngAfterViewInit() {
    let containerEle: HTMLElement = this.containerRef.nativeElement;

    containerEle.addEventListener('wheel', (e: WheelEvent) => {
      this.wheelHandler(e);
    });

    console.log(this.ps);
  }

  clickHandler(e: Event, item: ProjectContext) {
    this.select.next(item);
  }

  wheelHandler(event: WheelEvent) {
    let containerEle: HTMLElement = this.containerRef.nativeElement;
    let directive: PerfectScrollbarDirective = this.ps.directiveRef;
    let position = directive.position();
    let positionAbsolute = directive.position(true);

    this.scrollbarOffset += -event.wheelDeltaY;
    if (event.wheelDeltaY < 0) {
      if (position.x !== 'end') {
        // if scrollbar is not in the end
        this.ps.directiveRef.scrollToLeft(this.scrollbarOffset);
      }
    } else {
      if (positionAbsolute.x !== 0) {
        // if scrollbar is not at the left
        this.ps.directiveRef.scrollToLeft(this.scrollbarOffset);
      }
    }
    // this.ps.directiveRef.scrollToRight(<number>position.x + event.wheelDeltaY);
    console.log('wheel', event);
  }
}

@Directive({
  // tslint:disable-next-line:directive-selector
  selector: '[mClick]'
})
export class MouseMiddleClickDirective {
  @Input('fileContext') fileContext: ProjectContext;
  @HostListener('click', ['$event']) onMouseMiddleClick($event: Event) {
    console.log($event);
  }
  @HostListener('dblclick', ['$event']) onMouseDoubleClick($event: Event) {
    this.editorControl.closeFileHandler(this.fileContext);
  }
  constructor(private editorControl: EditorControlService) { }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
