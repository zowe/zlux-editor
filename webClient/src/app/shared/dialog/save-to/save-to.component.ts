
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, Inject, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HttpService } from '../../http/http.service';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

declare var ZoweZLUX: any;

type SaveMode = 'uss' | 'dataset' | 'member';
type DatasetLookupStatus = 'idle' | 'loading' | 'pds' | 'sequential' | 'not-found' | 'error';

interface TemplateParams {
  allocationUnit: string;
  primarySpace: string;
  secondarySpace: string;
  directoryBlocks: string;
  recordFormat: string;
  recordLength: string;
}

const TEMPLATES = new Map<string, TemplateParams>([
  ['JCL', { allocationUnit: 'TRK', primarySpace: '300', secondarySpace: '100', directoryBlocks: '20', recordFormat: 'FB', recordLength: '80' }],
  ['COBOL', { allocationUnit: 'TRK', primarySpace: '300', secondarySpace: '150', directoryBlocks: '20', recordFormat: 'FB', recordLength: '133' }],
  ['PLX', { allocationUnit: 'TRK', primarySpace: '300', secondarySpace: '150', directoryBlocks: '20', recordFormat: 'VBA', recordLength: '132' }],
  ['XML', { allocationUnit: 'TRK', primarySpace: '200', secondarySpace: '100', directoryBlocks: '20', recordFormat: 'VBA', recordLength: '16383' }],
]);

const DATASET_TYPE_ORG = new Map<string, string>([
  ['PDS', 'PO'],
  ['LIBRARY', 'PO'],
  ['BASIC', 'PS'],
  ['LARGE', 'PS'],
]);

@Component({
  selector: 'app-save-to',
  templateUrl: './save-to.component.html',
  styleUrls: ['./save-to.component.scss'],
})
export class SaveToComponent implements OnDestroy {
  // --- Mode ---
  saveMode: SaveMode = 'uss';
  showAllocate = false;

  // --- USS fields ---
  results = {
    directory: '',
    fileName: '',
    encoding: '',
  };

  // --- Dataset/Member fields ---
  datasetResults = {
    datasetName: '',
    memberName: '',
  };

  // --- Allocation fields ---
  allocateProps = {
    template: '',
    datasetNameType: 'PDS',
    organization: 'PO',
    allocationUnit: '',
    primarySpace: '',
    secondarySpace: '',
    directoryBlocks: '',
    recordFormat: '',
    recordLength: '',
    blockSize: '',
  };

  // --- Dataset lookup state ---
  memberModeEnabled = false;
  datasetLookupStatus: DatasetLookupStatus = 'idle';
  private datasetNameInput$ = new Subject<string>();
  private destroy$ = new Subject<void>();
  private lastLookedUpName = '';

  // --- Options ---
  options: string[];
  templateOptions = ['JCL', 'COBOL', 'PLX', 'XML'];
  datasetNameTypeOptions = ['PDS', 'LIBRARY', 'BASIC', 'LARGE'];
  allocationUnitOptions = ['TRK', 'CYL', 'BLK', 'KB', 'MB'];
  recordFormatOptions = ['F', 'FB', 'V', 'VB', 'VBA', 'U'];

  // Zowe dataset name: 1-8 char qualifiers separated by dots; each qualifier starts with A-Z, #, $, @;
  // remaining chars allow A-Z, 0-9, #, $, @, -; up to 12 qualifiers; total 3-44 chars
  private datasetPattern = /^[A-Z$#@][A-Z0-9$#@\-]{0,7}(\.[A-Z$#@][A-Z0-9$#@\-]{0,7}){0,11}$/;
  private datasetMinLength = 3;
  private datasetMaxLength = 44;

  // Zowe member name: starts with A-Z, #, $, @; remaining A-Z, 0-9, #, $, @; 1-8 chars total (no hyphens)
  private memberPattern = /^[A-Z$#@][A-Z0-9$#@]{0,7}$/;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private http: HttpService,
  ) {
    if (this.data.canBeISO === false) {
      this.options = ['UTF-8'];
    } else {
      this.options = ['UTF-8', 'ISO-8859-1', 'IBM-1047'];
    }
    if (this.data.fileName) {
      this.results.fileName = this.data.fileName;
    }
    if (this.data.fileDirectory) {
      this.results.directory = this.data.fileDirectory;
    }

    // Debounced dataset metadata lookup — only fires for syntactically valid dataset names
    this.datasetNameInput$.pipe(
      debounceTime(600),
      takeUntil(this.destroy$),
      switchMap((name: string) => {
        const trimmed = name.trim().toUpperCase();
        if (!trimmed || trimmed.length < this.datasetMinLength) {
          this.datasetLookupStatus = 'idle';
          this.memberModeEnabled = false;
          return of(null);
        }
        // Don't make API calls for syntactically invalid names
        if (!this.datasetPattern.test(trimmed)) {
          this.datasetLookupStatus = 'error';
          this.memberModeEnabled = false;
          return of(null);
        }
        this.lastLookedUpName = trimmed;
        this.datasetLookupStatus = 'loading';
        const url = ZoweZLUX.uriBroker.datasetMetadataUri(encodeURIComponent(trimmed), 'true', undefined, true);
        return this.http.get(url).pipe(
          catchError(() => of({ _notFound: true }))
        );
      })
    ).subscribe((response: any) => {
      if (!response) return;

      if (response._notFound) {
        this.datasetLookupStatus = 'not-found';
        this.memberModeEnabled = false;
        return;
      }

      // Parse response to determine if PDS
      const isPDS = this.checkIfPartitioned(response);
      if (isPDS) {
        this.datasetLookupStatus = 'pds';
        this.memberModeEnabled = true;
      } else {
        this.datasetLookupStatus = 'sequential';
        this.memberModeEnabled = false;
        // If user was in member mode but dataset isn't PDS, switch them back
        if (this.saveMode === 'member') {
          this.saveMode = 'dataset';
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- Event Handlers ---

  onDatasetNameInput(): void {
    const raw = this.datasetResults.datasetName;
    this.datasetResults.datasetName = raw.toUpperCase();
    this.datasetNameInput$.next(this.datasetResults.datasetName);
  }

  onTemplateSelect(value: string): void {
    if (!value) return;
    const tmpl = TEMPLATES.get(value);
    if (tmpl) {
      this.allocateProps.allocationUnit = tmpl.allocationUnit;
      this.allocateProps.primarySpace = tmpl.primarySpace;
      this.allocateProps.secondarySpace = tmpl.secondarySpace;
      this.allocateProps.recordFormat = tmpl.recordFormat;
      this.allocateProps.recordLength = tmpl.recordLength;
      this.allocateProps.directoryBlocks = this.allocateProps.organization === 'PS' ? '0' : tmpl.directoryBlocks;
    }
  }

  onDatasetTypeChange(value: string): void {
    this.allocateProps.organization = DATASET_TYPE_ORG.get(value) || 'PS';
    if (this.allocateProps.organization === 'PS') {
      this.allocateProps.directoryBlocks = '0';
    }
  }

  // --- Validation ---

  isDatasetNameValid(): boolean {
    const name = this.datasetResults.datasetName;
    if (!name) return false;
    if (name.length < this.datasetMinLength || name.length > this.datasetMaxLength) return false;
    return this.datasetPattern.test(name);
  }

  isMemberNameValid(): boolean {
    const name = this.datasetResults.memberName;
    if (!name) return false;
    return this.memberPattern.test(name);
  }

  isValid(): boolean {
    switch (this.saveMode) {
      case 'uss':
        return !!(this.results.fileName && this.results.directory && this.results.encoding);

      case 'dataset':
        if (!this.isDatasetNameValid()) return false;
        if (this.showAllocate) {
          return !!(this.allocateProps.allocationUnit &&
            this.allocateProps.primarySpace &&
            this.allocateProps.secondarySpace &&
            this.allocateProps.directoryBlocks &&
            this.allocateProps.recordFormat &&
            this.allocateProps.recordLength);
        }
        return true;

      case 'member':
        return this.isDatasetNameValid() && this.isMemberNameValid();

      default:
        return false;
    }
  }

  // --- Result ---

  getDialogResult(): any {
    const dsName = (this.datasetResults.datasetName || '').toUpperCase().trim();
    const memberName = (this.datasetResults.memberName || '').toUpperCase().trim();

    switch (this.saveMode) {
      case 'uss':
        return this.results;

      case 'dataset':
        if (this.showAllocate) {
          return {
            saveType: 'dataset',
            allocateNew: true,
            datasetName: dsName,
            memberName: '',
            allocateProps: { ...this.allocateProps },
          };
        }
        return {
          saveType: 'dataset',
          datasetName: dsName,
          memberName: '',
        };

      case 'member':
        return {
          saveType: 'dataset',
          datasetName: dsName,
          memberName: memberName,
        };

      default:
        return null;
    }
  }

  // --- Private Helpers ---

  private checkIfPartitioned(response: any): boolean {
    // The metadata response can have different structures depending on the server.
    // Look for dsorg containing 'PO' or organization containing 'partitioned'
    try {
      const datasets = response?.datasets || response?.items || [];
      if (datasets.length > 0) {
        const ds = datasets[0];
        const dsorg = ds?.dsorg || ds?.datasetOrganization || '';
        if (typeof dsorg === 'string') {
          const upper = dsorg.toUpperCase();
          if (upper.startsWith('PO') || upper === 'PARTITIONED') {
            return true;
          }
        }
        // Check nested structure (some servers return dsorg as object)
        if (ds?.dsorg?.organization) {
          const org = ds.dsorg.organization.toUpperCase();
          if (org.startsWith('PO') || org === 'PARTITIONED') {
            return true;
          }
        }
        if (ds?.dsorg?.isPDSDir || ds?.dsorg?.isPDSE) {
          return true;
        }
      }
      // Fallback: if the response itself has dsorg at top level
      const topDsorg = response?.dsorg;
      if (typeof topDsorg === 'string' && (topDsorg.toUpperCase().startsWith('PO') || topDsorg.toUpperCase() === 'PARTITIONED')) {
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
