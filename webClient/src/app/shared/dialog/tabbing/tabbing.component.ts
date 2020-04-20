
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, HostListener, Input } from '@angular/core';

//We leave this a component and not a service, as to give each component the ability
//to set their own max tabs without conflicting with other components.
@Component({
  selector: 'tabbing-component',  
  template: '',
})
export class TabbingComponent  {

  @Input() totalTabs;
  private activeTab = 0;
  private tabEvent:boolean=false;

  @HostListener('window:keydown.tab')
  tabToNext() {
    this.switchTab(true);
  }

  @HostListener('window:keydown.shift.tab')
  tabToPrev() {
    this.switchTab(false);
  }

  switchTab(isForward:boolean) {

      this.tabEvent=true;
      if(isForward) {
        this.moveForward();
      } else {
        this.moveBackward();
      }
      this.setFocusActiveTab();
  }

  moveForward() {
    this.activeTab++;
    if (this.activeTab == this.totalTabs) {
      this.activeTab = 0;
    }
  }

  moveBackward() {
    if (this.activeTab==0) {
      this.activeTab = this.totalTabs-1;
    } else {
      this.activeTab--;
    } 
  }

  setFocusActiveTab() {
      let element = (document.querySelector('#tab-index-' + this.activeTab) as HTMLElement);
      //TODO: Element.focus seems to fail at times. Logging the element shows it does not *seem* like a timing issue for
      //the querySelector method, but rather the focus method, and adding a 200ms delay showed reliability when testing
      if(element) {
        setTimeout(() => { element.focus(); }, 200);
      }
  }

  @HostListener('window:focusin', ['$event.target.id'])
  syncActiveTab(idAttr:string) {
    // focusin triggered because of switch tab not from input click
    // no activeTab sync required
    if(this.tabEvent) {
      this.tabEvent=false;
      return;
    }

    const tabId = this.extractTabId(idAttr);
    this.activeTab = tabId;
  }

  extractTabId(idAttr:string): number {
    if(idAttr && idAttr>'' && idAttr.includes('tab-index-')) {
      const i=parseInt(idAttr.replace('tab-index-',''));
      return i;
    }
    return this.activeTab;
  }

}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
