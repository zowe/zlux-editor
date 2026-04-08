/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
import { Injectable, Inject } from '@angular/core';
import { HttpService } from './http/http.service';
import { DatasetAttributes } from './model/editor-project';
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

  /**
   * Estimates dataset size in bytes using 3390 CKD DASD geometry.
   * 3390: 56,664 bytes/track, 15 tracks/cylinder, 849,960 bytes/cylinder.
   * The metadata response provides `space` (unit type) and `prime` (primary allocation).
   * Returns estimated bytes, or -1 if estimation is not possible.
   */
  estimateDatasetSize(attrs: DatasetAttributes): number {
    // Constants from IBM 3390 DASD geometry
    // https://www.ibm.com/docs/en/zos/2.1.0?topic=devices-direct-access-storage
    const BYTES_PER_TRACK = 56664;
    const TRACKS_PER_CYLINDER = 15;
    const BYTES_PER_CYLINDER = BYTES_PER_TRACK * TRACKS_PER_CYLINDER; // 849,960

    if (!attrs || attrs.prime == null || attrs.prime <= 0 || !attrs.space) {
      return -1;
    }

    const prime = attrs.prime;
    const space = attrs.space.toUpperCase();

    switch (space) {
      case 'CYL':
        return prime * BYTES_PER_CYLINDER;
      case 'TRK':
        return prime * BYTES_PER_TRACK;
      case 'MB':
        return prime * 1048576;
      case 'KB':
        return prime * 1024;
      case 'BYTE':
        return prime;
      default:
        return -1;
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
