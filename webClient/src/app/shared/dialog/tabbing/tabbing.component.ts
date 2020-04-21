
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, HostListener, ElementRef, AfterViewInit, Input } from '@angular/core';

//We leave this a component and not a service, as to give each component the ability
//to set their own max tabs without conflicting with other components.
@Component({
  selector: 'tab-trap',  
  template: '',
})
export class TabbingComponent implements  AfterViewInit {

  @Input() hiddenIds:string;
  @Input() hiddenPos:string;
  private totalTabs;
  private activeTab;
  private tabEvent:boolean;
  private focusableArr: HTMLElement[];
  private idArr: string[];
  private parentRef:HTMLElement;

  constructor(private elementRef:ElementRef) {
    this.activeTab = 0;
    this.tabEvent = false;
    this.parentRef = this.elementRef.nativeElement.parentElement;
  }

  ngAfterViewInit() {
    this.initValues(this.parentRef);
  }

  initValues(eleRef:HTMLElement) {
    console.log('initValue', eleRef);
    if(eleRef) {
      this.focusableArr = this.findAllFocusable(eleRef);
      this.idArr = this.getAllIds(this.focusableArr);
      this.totalTabs = this.focusableArr.length;
      this.tabEvent = false;
      this.activeTab = 0;
      this.setFocusActiveTab(true);
    }
  }
  
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
      this.setFocusActiveTab(isForward);
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

  setFocusActiveTab(isForward:boolean) {
      //TODO: Element.focus seems to fail at times. Logging the element shows it does not *seem* like a timing issue for
      //the querySelector method, but rather the focus method, and adding a 200ms delay showed reliability when testing
      if(this.focusableArr) {
        let element = this.focusableArr[this.activeTab];
        if(element && document.body.contains(element)) {
          if(this.isElementDisabled(element)) {
            this.switchTab(isForward); 
            return; 
          }
          this.focusElement(element);
        } else {
          element = this.checkAndAddElmAgain(this.idArr[this.activeTab], this.activeTab);
          if(!element) {
            this.switchTab(isForward);
            return;
          }
          this.focusElement(element);
        }
      }
  }

  isElementDisabled(element:HTMLElement) {
    return element && element.getAttribute("disabled") != null
  }

  focusElement(element:HTMLElement) {
    if(element) setTimeout(() => { element.focus(); }, 200);
  }

  checkAndAddElmAgain(selector:string, elmIndex:number) {
    const root =this.parentRef || document;
    console.log('root', root);
    const newElm = root.querySelector<HTMLElement>(selector);
    console.log('newElm', newElm, 'elmIndex:', elmIndex);
    this.focusableArr[elmIndex] = newElm;
    console.log('focusableArr', this.focusableArr);
    return newElm;
  }

  getElementSelector(elm:HTMLElement) {
    let selector = '';
    if(elm) {
      selector = this.getIdSelector(elm);
      if(selector=='') {
        selector = this.getAttributeSelector(elm);
        selector+= this.getClassListSelector(elm);
      }
    }
    console.log('selector', selector);
    return selector;
  }

  getIdSelector(elm:HTMLElement) {
    let selector = elm.getAttribute('id') || '';
    if(selector> '') return `#${selector}`
    return selector;
  }

  getAttributeSelector(elm:HTMLElement) {
    const attr:string = elm.attributes[0].name;
    const val = elm[attr] || '';
    const selector = `[${attr}='${val}']`;
    console.log('getAttributeSelector', selector);
    return selector;
  }

  getClassListSelector(elm:HTMLElement) {
    const selector = '.'+Array.prototype.join.call(elm.classList,',.') || '';
    console.log('getClassListSelector', selector);
    return selector;
  }

  @HostListener('window:focusin', ['$event.target'])
  syncActiveTab(elm:HTMLElement) {
    //focusin triggered because of switch tab not from input click
    //no activeTab sync required
    if(this.tabEvent) {
      this.tabEvent=false;
      return;
    }
    this.activeTab = this.extractTabId(elm)
  }

  extractTabId(elm:HTMLElement): number {
    if(this.focusableArr) {
      const tabId=this.focusableArr.findIndex(e =>{ return elm==e});
      if(tabId && tabId>0) {
        return tabId;
      } 
    }
    return this.activeTab;
  }

  findAllFocusable(domRef:HTMLElement) {
    let lists = [];
    if(domRef && domRef['querySelectorAll']!=null) {
      const selectorStr = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      lists = Array.from(domRef.querySelectorAll<HTMLElement>(selectorStr));
      lists = lists.sort((elm1, elm2)=>{
        let tab1 = parseInt(elm1.getAttribute('tabindex')) || 0;
        let tab2 = parseInt(elm2.getAttribute('tabindex')) || 0;
        return tab2 - tab1;
      })
    }
    if(this.hiddenPos) {
      this.hiddenPos.split(',').map(val=>parseInt(val)).forEach((val) =>{
        lists.splice(val-1,0,null); 
      })
    }
    console.log('findAllFocusable',lists);

    return lists;
  }

  getAllIds(focusableArr:HTMLElement[]) {
    let lists = [];
    lists = focusableArr.map(elm => this.getElementSelector(elm));

    if(this.hiddenPos && this.hiddenIds) {
      const idsArr = this.hiddenIds.split(',')
      this.hiddenPos.split(',').map(val=>parseInt(val)).forEach((val, idx) =>{
        lists[val-1]=`#${idsArr[idx]}`;
      })
    }
    console.log('allselectors',lists);
    return lists;
  }

}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
