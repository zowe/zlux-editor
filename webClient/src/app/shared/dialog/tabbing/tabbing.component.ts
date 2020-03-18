
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, AfterViewInit, OnDestroy } from '@angular/core';

//We leave this a component and not a service, as to give each component the ability
//to set their own max tabs without conflicting with other components.
@Component({
  selector: 'tabbing-component',
  templateUrl: './tabbing.component.html',
  // styleUrls: ['./save-to.component.scss',  '../../../../styles.scss']
})
export class TabbingComponent implements AfterViewInit, OnDestroy  {

  public activeTab = 0;
  private totalTabs = 5;
  private tabHandler: any;

  constructor() { }

  ngAfterViewInit() {
    //Add handler that process "Tab" key event
    this.tabHandler = (e) => {this.switchTab(e)}
    document.addEventListener('keydown', this.tabHandler, false );
  }

  ngOnDestroy() {
    //Clean up listener upon close
    document.removeEventListener('keydown', this.tabHandler, false);
  }

  setTotalTabs(i: number) {
    this.totalTabs = i;
  }

  switchTab(event: any) {
    if(event.which && event.which == 9) {
      this.activeTab++;
      if (this.activeTab == this.totalTabs) {
        this.activeTab = 0;
      }
      let element = (document.querySelector('#tab-index-' + this.activeTab) as HTMLElement);
      //TODO: Element.focus seems to fail at times. Logging the element shows it does not *seem* like a timing issue for
      //the querySelector method, but rather the focus method, and adding a 200ms delay showed reliability when testing
      setTimeout(() => { element.focus(); }, 200);
      
      event.preventDefault();
      event.stopImmediatePropagation();
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
