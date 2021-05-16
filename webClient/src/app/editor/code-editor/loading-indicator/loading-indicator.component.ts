/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Component, HostBinding, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { MonacoService } from '../monaco/monaco.service';
import { LoadingStatus } from '../loading-status';

@Component({
  selector: 'app-loading-indicator',
  templateUrl: './loading-indicator.component.html',
  styleUrls: ['./loading-indicator.component.scss'],
})
export class LoadingIndicatorComponent implements OnDestroy {
  private loadingStatus: LoadingStatus = 'complete';
  private loadingStatusSubscription: Subscription;

  constructor(monaco: MonacoService) {
    this.loadingStatusSubscription = monaco.loadingStatusChanged.subscribe(status => this.loadingStatus = status);
  }

  @HostBinding('style.display')
  get display() {
    return this.loadingStatus === 'complete' ? 'none' : '';
  }

  ngOnDestroy(): void {
    if (this.loadingStatusSubscription) {
      this.loadingStatusSubscription.unsubscribe();
      this.loadingStatusSubscription = undefined;
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
