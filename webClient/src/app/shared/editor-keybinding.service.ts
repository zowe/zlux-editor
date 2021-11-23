

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Injectable } from '@angular/core';

import { Subject, fromEvent } from 'rxjs';
import { filter } from 'rxjs/operators';

@Injectable()
export class EditorKeybindingService { // TODO: This service is duplicated in File Tree
  public keyupEvent: Subject<KeyboardEvent>;
  public keydownEvent: Subject<KeyboardEvent>;

  constructor() {
    this.keyupEvent = new Subject();
    this.keydownEvent = new Subject();
  }

  registerKeyUpEvent(appChild:Element) {
    let elm = appChild.closest('app-root');
    const observable = fromEvent(elm, 'keyup' );
    observable.pipe(
      filter(value => (value as KeyboardEvent).altKey))
      .subscribe(this.keyupEvent);
  }

  registerKeyDownEvent(appChild:Element) {
    let elm = appChild.closest('app-root');
    const observable = fromEvent(elm, 'keydown' );
    observable.pipe(
      filter(value => (value as KeyboardEvent).altKey))
      .subscribe(this.keydownEvent);
  }
}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

