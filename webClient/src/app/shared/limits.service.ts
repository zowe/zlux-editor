/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
import { Injectable, Inject } from '@angular/core';
import { HttpService } from './http/http.service';
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';
import { BehaviorSubject } from 'rxjs';

export interface EditorLimits {
  maxFileSize: number;
  folderMaxCount: number;
}

const DEFAULT_LIMITS: EditorLimits = {
  maxFileSize: 50000000,
  folderMaxCount: 200
};

@Injectable({
  providedIn: 'root',
})
export class LimitsService {
  private _limits: BehaviorSubject<EditorLimits> = new BehaviorSubject<EditorLimits>(DEFAULT_LIMITS);

  constructor(
    private http: HttpService,
    @Inject(Angular2InjectionTokens.PLUGIN_DEFINITION) private pluginDefinition: ZLUX.ContainerPluginDefinition,
    @Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger
  ) {
    this.loadLimits();
  }

  get limits(): EditorLimits {
    return this._limits.getValue();
  }

  get limits$(): BehaviorSubject<EditorLimits> {
    return this._limits;
  }

  private loadLimits(): void {
    const uri = ZoweZLUX.uriBroker.pluginConfigUri(
      this.pluginDefinition.getBasePlugin(),
      'limits',
      'limits.json'
    );
    this.http.get(uri).subscribe(
      (response: any) => {
        if (response && response.contents) {
          const contents = response.contents;
          const merged: EditorLimits = {
            maxFileSize: typeof contents.maxFileSize === 'number' ? contents.maxFileSize : DEFAULT_LIMITS.maxFileSize,
            folderMaxCount: typeof contents.folderMaxCount === 'number' ? contents.folderMaxCount : DEFAULT_LIMITS.folderMaxCount
          };
          this._limits.next(merged);
          this.log.info(`Loaded editor limits: maxFileSize=${merged.maxFileSize}, folderMaxCount=${merged.folderMaxCount}`);
        } else {
          this.log.info(`No limits config found, using defaults: maxFileSize=${DEFAULT_LIMITS.maxFileSize}, folderMaxCount=${DEFAULT_LIMITS.folderMaxCount}`);
        }
      },
      (err: any) => {
        this.log.warn(`Failed to load limits config, using defaults. Error:`, err);
      }
    );
  }

  isFileSizeAllowed(sizeInBytes: number): boolean {
    return sizeInBytes <= this._limits.getValue().maxFileSize;
  }

  getFormattedMaxSize(): string {
    const bytes = this._limits.getValue().maxFileSize;
    if (bytes >= 1000000) {
      return `${(bytes / 1000000).toFixed(0)}MB`;
    }
    return `${(bytes / 1000).toFixed(0)}KB`;
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
