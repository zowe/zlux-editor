

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

import { Injectable } from '@angular/core';

import { Subject, Observable } from 'rxjs/Rx';

@Injectable()
export class EditorKeybindingService {
  public keyupEvent: Subject<KeyboardEvent>;
  public keydownEvent: Subject<KeyboardEvent>;

  constructor() {
    this.keyupEvent = new Subject();
    this.keydownEvent = new Subject();
  }

  registerKeyUpEvent(appChild:Element) {
    let elm = appChild.closest('app-root');
    const observable = Observable.fromEvent(elm, 'keyup' ) as Observable<KeyboardEvent>;
    observable
      .filter(value => value.altKey)
      .subscribe(this.keyupEvent);
  }

  registerKeyDownEvent(appChild:Element) {
    let elm = appChild.closest('app-root');
    const observable = Observable.fromEvent(elm, 'keydown' ) as Observable<KeyboardEvent>;
    observable
      .filter(value => value.altKey)
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

