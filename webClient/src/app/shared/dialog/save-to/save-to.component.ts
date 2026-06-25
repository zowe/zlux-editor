
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

  // --- USS directory validation state ---
  directoryLookupStatus: 'idle' | 'checking' | 'valid' | 'not-found' = 'idle';
  private directoryInput$ = new Subject<string>();

  // --- Dataset lookup state ---
  memberModeEnabled = false;
  datasetLookupStatus: DatasetLookupStatus = 'idle';
  datasetInfo: { dsorg: string; recfm: string; lrecl: string; blksize: string; volser: string; space: string; primary: string; secondary: string; dirblk: string } | null = null;
  private datasetNameInput$ = new Subject<string>();
  private destroy$ = new Subject<void>();
  private memberModeFromData = false; // true if member mode was set from pre-populated data

  // --- Options ---
  options: string[];
  templateOptions = ['JCL', 'COBOL', 'PLX', 'XML'];
  datasetNameTypeOptions = ['PDS', 'LIBRARY', 'BASIC', 'LARGE'];
  allocationUnitOptions = ['TRK', 'CYL', 'BLK', 'KB', 'MB'];
  recordFormatOptions = ['F', 'FA', 'FB', 'FBA', 'FBS', 'V', 'VA', 'VB', 'VBA', 'VBS', 'U'];

  // Zowe dataset name: 1-8 char qualifiers separated by dots; each qualifier starts with A-Z, #, $, @;
  // remaining chars allow A-Z, 0-9, #, $, @, -; up to 12 qualifiers; total 3-44 chars
  // Case-insensitive to avoid flicker when user types lowercase before auto-uppercase kicks in
  private datasetPattern = /^[A-Za-z$#@][A-Za-z0-9$#@\-]{0,7}(\.[A-Za-z$#@][A-Za-z0-9$#@\-]{0,7}){0,11}$/;
  private datasetMinLength = 3;
  private datasetMaxLength = 44;

  // Zowe member name: starts with A-Z, #, $, @; remaining A-Z, 0-9, #, $, @; 1-8 chars total (no hyphens)
  // Case-insensitive to prevent validation flicker on keystroke before uppercase normalization
  private memberPattern = /^[A-Za-z$#@][A-Za-z0-9$#@]{0,7}$/;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private http: HttpService,
  ) {
    if (this.data.canBeISO === false) {
      this.options = ['UTF-8'];
    } else {
      this.options = ['IBM-1047', 'UTF-8', 'ISO-8859-1'];
    }
    // Default encoding to first option so user doesn't have to pick manually
    this.results.encoding = this.options[0];
    // Only pre-fill USS fields if the file is NOT from a dataset
    if (this.data.fileName && !this.data.datasetName) {
      this.results.fileName = this.data.fileName;
    }
    if (this.data.fileDirectory && !this.data.datasetName) {
      this.results.directory = this.data.fileDirectory;
      // Directory came from the file's current path -- it's known to exist
      this.directoryLookupStatus = 'valid';
    }
    // When the source file is a dataset, pre-fill the USS tab with the user's
    // home directory so they have a sensible default if they switch to USS mode.
    if (this.data.datasetName) {
      // Pre-fill a sensible USS filename derived from the dataset/member name
      const memberOrDs = this.data.memberName || this.data.fileName || '';
      if (memberOrDs) {
        this.results.fileName = memberOrDs.toLowerCase();
      }
      // Resolve the user's USS home directory for pre-filling the directory field
      this.fetchUserHomeDirectory();
    }
    // Pre-populate dataset fields if file was opened from a dataset
    if (this.data.datasetName) {
      let dsName = this.data.datasetName.toUpperCase();
      let memName = this.data.memberName ? this.data.memberName.toUpperCase() : '';

      // Strip parenthesized member from dataset name if present
      const parenMatch = dsName.match(/^([^()]+)\(([^()]+)\)$/);
      if (parenMatch) {
        dsName = parenMatch[1];
        if (!memName) {
          memName = parenMatch[2];
        }
      }

      // If the pre-populated member name is invalid (e.g. it's a dataset name with dots),
      // replace it with a safe default
      if (memName && !this.memberPattern.test(memName)) {
        memName = 'UNTITLED';
      }

      this.datasetResults.datasetName = dsName;
      if (memName) {
        this.datasetResults.memberName = memName;
        this.memberModeEnabled = true;
        this.memberModeFromData = true;
        this.saveMode = 'member';
      } else {
        this.saveMode = 'dataset';
      }
    }

    // Debounced USS directory validation -- same pattern as dataset lookup above
    this.directoryInput$.pipe(
      debounceTime(600),
      takeUntil(this.destroy$),
      switchMap((dir: string) => {
        const trimmed = dir.trim();
        if (!trimmed) {
          this.directoryLookupStatus = 'idle';
          return of(null);
        }
        if (!trimmed.startsWith('/')) {
          this.directoryLookupStatus = 'not-found';
          return of(null);
        }
        this.directoryLookupStatus = 'checking';
        const pathForUri = trimmed.substring(1);
        const url = ZoweZLUX.uriBroker.unixFileUri('metadata', pathForUri);
        return this.http.get(url).pipe(
          catchError(() => of({ _notFound: true }))
        );
      })
    ).subscribe((response: any) => {
      if (!response) return;
      if (response._notFound) {
        this.directoryLookupStatus = 'not-found';
      } else {
        this.directoryLookupStatus = 'valid';
      }
    });

    // If directory was pre-filled and not yet validated, trigger check
    if (this.results.directory && this.directoryLookupStatus === 'idle') {
      this.directoryInput$.next(this.results.directory);
    }

    // Debounced dataset metadata lookup -- only fires for syntactically valid dataset names
    this.datasetNameInput$.pipe(
      debounceTime(600),
      takeUntil(this.destroy$),
      switchMap((name: string) => {
        const trimmed = name.trim().toUpperCase();
        if (!trimmed || trimmed.length < this.datasetMinLength) {
          this.datasetLookupStatus = 'idle';
          if (!this.memberModeFromData) {
            this.memberModeEnabled = false;
          }
          return of(null);
        }
        // Don't make API calls for syntactically invalid names
        if (!this.datasetPattern.test(trimmed)) {
          this.datasetLookupStatus = 'error';
          if (!this.memberModeFromData) {
            this.memberModeEnabled = false;
          }
          return of(null);
        }
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
        // Don't disable member mode if it was set from pre-populated data
        if (!this.memberModeFromData) {
          this.memberModeEnabled = false;
        }
        this.datasetInfo = null;
        return;
      }

      // Extract dataset attributes from response
      this.datasetInfo = this.extractDatasetInfo(response);

      // If no dataset data was found in the response, treat as not-found
      if (!this.datasetInfo) {
        this.datasetLookupStatus = 'not-found';
        if (!this.memberModeFromData) {
          this.memberModeEnabled = false;
        }
        return;
      }

      // Parse response to determine if PDS
      const isPDS = this.checkIfPartitioned(response);
      if (isPDS) {
        this.datasetLookupStatus = 'pds';
        this.memberModeEnabled = true;
        this.showAllocate = false; // Dataset exists -- can't allocate
      } else {
        this.datasetLookupStatus = 'sequential';
        this.memberModeEnabled = false;
        this.showAllocate = false; // Dataset exists -- can't allocate
      }
    });

    // If dataset name was pre-populated, trigger the lookup immediately
    if (this.datasetResults.datasetName && this.isDatasetNameValid()) {
      this.datasetNameInput$.next(this.datasetResults.datasetName);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- Event Handlers ---

  onDatasetNameInput(): void {
    const current = this.datasetResults.datasetName || '';
    const upper = current.toUpperCase();

    // Auto-split parenthesized names like DATASET(MEMBER) into separate fields
    const parenMatch = upper.match(/^([^()]+)\(([^()]+)\)$/);
    if (parenMatch) {
      this.datasetResults.datasetName = parenMatch[1];
      this.datasetResults.memberName = parenMatch[2];
      this.memberModeEnabled = true;
      this.saveMode = 'member';
    }
    // Don't reassign the model on every keystroke -- avoids cursor jumping.
    // The uppercased value is used for validation/lookup only.

    this.datasetNameInput$.next(upper.replace(/\([^()]*\)$/, ''));
  }

  /** Handle tab switching between modes */
  onModeChange(newMode: SaveMode): void {
    this.saveMode = newMode;
    // Re-trigger dataset lookup if switching to dataset/member mode and name is already filled
    if ((newMode === 'dataset' || newMode === 'member') && this.datasetResults.datasetName && this.isDatasetNameValid()) {
      this.datasetNameInput$.next(this.datasetResults.datasetName.toUpperCase());
    }
  }

  /** Triggered on USS directory input -- fires validation via debounced Subject */
  onDirectoryInput(): void {
    this.directoryInput$.next(this.results.directory || '');
  }

  toggleAllocate(): void {
    this.showAllocate = !this.showAllocate;
    // Pre-fill ALL allocate fields from existing dataset info when opening
    if (this.showAllocate && this.datasetInfo) {
      this.prefillFromExistingDataset();
    }
  }

  /** Populate allocate form fields from existing dataset properties */
  private prefillFromExistingDataset(): void {
    if (!this.datasetInfo) return;

    // Always overwrite with existing values (if they have real data)
    if (this.datasetInfo.space !== '--') {
      this.allocateProps.allocationUnit = this.datasetInfo.space;
    }
    if (this.datasetInfo.primary !== '--') {
      this.allocateProps.primarySpace = this.datasetInfo.primary;
    }
    if (this.datasetInfo.secondary !== '--') {
      this.allocateProps.secondarySpace = this.datasetInfo.secondary;
    }
    if (this.datasetInfo.recfm !== '--') {
      // Ensure the recfm value is in the dropdown options; if not, add it dynamically
      if (!this.recordFormatOptions.includes(this.datasetInfo.recfm)) {
        this.recordFormatOptions = [...this.recordFormatOptions, this.datasetInfo.recfm];
      }
      this.allocateProps.recordFormat = this.datasetInfo.recfm;
    }
    if (this.datasetInfo.lrecl !== '--') {
      this.allocateProps.recordLength = this.datasetInfo.lrecl;
    }
    if (this.datasetInfo.blksize !== '--') {
      this.allocateProps.blockSize = this.datasetInfo.blksize;
    }

    // Set directory blocks from existing dataset or use safe defaults
    if (this.datasetInfo.dirblk !== '--') {
      this.allocateProps.directoryBlocks = this.datasetInfo.dirblk;
    } else {
      // Default: 20 for PDS, 0 for sequential
      const dsorg = this.datasetInfo.dsorg;
      this.allocateProps.directoryBlocks = (dsorg.startsWith('PO') || dsorg === 'PARTITIONED') ? '20' : '0';
    }

    // Set dataset type + organization from dsorg
    const dsorg = this.datasetInfo.dsorg;
    if (dsorg.startsWith('PO') || dsorg === 'PARTITIONED') {
      this.allocateProps.datasetNameType = 'PDS';
      this.allocateProps.organization = 'PO';
    } else if (dsorg === 'PS' || dsorg.startsWith('PS')) {
      this.allocateProps.datasetNameType = 'BASIC';
      this.allocateProps.organization = 'PS';
    }

    // Clear template selection since we're using actual values
    this.allocateProps.template = '';
  }

  onTemplateSelect(value: string): void {
    if (!value) return;
    const tmpl = TEMPLATES.get(value);
    if (!tmpl) {
      // Unknown template -- reset selection, leave fields unchanged
      this.allocateProps.template = '';
      return;
    }
    // Template always overwrites all fields
    this.allocateProps.allocationUnit = tmpl.allocationUnit;
    this.allocateProps.primarySpace = tmpl.primarySpace;
    this.allocateProps.secondarySpace = tmpl.secondarySpace;
    this.allocateProps.recordFormat = tmpl.recordFormat;
    this.allocateProps.recordLength = tmpl.recordLength;
    this.allocateProps.blockSize = ''; // Clear any previously entered block size -- let z/OS determine optimal
    this.allocateProps.directoryBlocks = this.allocateProps.organization === 'PS' ? '0' : tmpl.directoryBlocks;
    // Also set dataset type to PDS for templates (templates are typically for PDS members)
    if (this.allocateProps.organization !== 'PS') {
      this.allocateProps.datasetNameType = 'PDS';
      this.allocateProps.organization = 'PO';
      this.allocateProps.directoryBlocks = tmpl.directoryBlocks;
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
        if (!this.results.fileName || !this.results.directory || !this.results.encoding) return false;
        // Block save if directory was confirmed as non-existent
        if (this.directoryLookupStatus === 'not-found') return false;
        return true;

      case 'dataset':
        if (!this.isDatasetNameValid()) return false;
        // If dataset doesn't exist and user hasn't opened Allocate, block save
        if (this.datasetLookupStatus === 'not-found' && !this.showAllocate) return false;
        // Cannot write directly to a PDS -- a member name is required
        if (this.datasetLookupStatus === 'pds' && !this.showAllocate) return false;
        // Cannot allocate if dataset already exists
        if (this.showAllocate && (this.datasetLookupStatus === 'sequential' || this.datasetLookupStatus === 'pds')) return false;
        if (this.showAllocate) {
          if (!(this.allocateProps.allocationUnit &&
            this.allocateProps.primarySpace &&
            this.allocateProps.secondarySpace &&
            this.allocateProps.directoryBlocks &&
            this.allocateProps.recordFormat &&
            this.allocateProps.recordLength)) {
            return false;
          }
          // Enforce positive numeric values
          const primary = parseInt(this.allocateProps.primarySpace, 10);
          const secondary = parseInt(this.allocateProps.secondarySpace, 10);
          const recLen = parseInt(this.allocateProps.recordLength, 10);
          const dirBlk = parseInt(this.allocateProps.directoryBlocks, 10);
          if (isNaN(primary) || primary < 1) return false;
          if (isNaN(secondary) || secondary < 1) return false;
          if (isNaN(recLen) || recLen < 1) return false;
          if (isNaN(dirBlk) || dirBlk < 0) return false;
          // Block size: if specified, must be positive and >= record length
          if (this.allocateProps.blockSize) {
            const blkSize = parseInt(this.allocateProps.blockSize, 10);
            if (isNaN(blkSize) || blkSize < 0) return false;
            if (!isNaN(recLen) && blkSize > 0 && blkSize < recLen) return false;
          }
          return true;
        }
        return true;

      case 'member':
        // Disable save if we confirmed the dataset is sequential (can't write members to it)
        if (this.datasetLookupStatus === 'sequential') return false;
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

  private extractDatasetInfo(response: any): { dsorg: string; recfm: string; lrecl: string; blksize: string; volser: string; space: string; primary: string; secondary: string; dirblk: string } | null {
    try {
      const datasets = response?.datasets || response?.items || [];
      if (datasets.length > 0) {
        const ds = datasets[0];

        // --- DSORG ---
        const dsorgRaw = ds?.dsorg;
        let dsorg = '--';
        if (typeof dsorgRaw === 'string' && dsorgRaw) {
          dsorg = dsorgRaw.toUpperCase();
        } else if (dsorgRaw?.organization) {
          dsorg = dsorgRaw.organization.toUpperCase();
        } else if (dsorgRaw?.isPDSDir || dsorgRaw?.isPDSE) {
          dsorg = 'PO';
        }

        // --- RECFM ---
        const recfmRaw = ds?.recfm;
        let recfm = '--';
        if (typeof recfmRaw === 'string' && recfmRaw) {
          recfm = recfmRaw.toUpperCase();
        } else if (recfmRaw && typeof recfmRaw === 'object') {
          // Object form: { format: 'F'|'V'|'U', isBlocked: true, carriageControl: 'A'|'M' }
          let fmtChar = recfmRaw.format || '';
          // Only use recordLength as format if it's a single alpha character (F/V/U)
          if (!fmtChar && typeof recfmRaw.recordLength === 'string' && /^[A-Za-z]$/.test(recfmRaw.recordLength)) {
            fmtChar = recfmRaw.recordLength;
          }
          if (recfmRaw.isBlocked) fmtChar += 'B';
          if (recfmRaw.carriageControl) fmtChar += recfmRaw.carriageControl;
          if (recfmRaw.isStandard) fmtChar += 'S';
          recfm = fmtChar.toUpperCase() || '--';
        }

        // --- LRECL ---
        const lrecl = this.extractNumericField(ds, ['lrecl', 'logicalRecordLength']);

        // --- BLKSIZE ---
        const blksize = this.extractNumericField(ds, ['blksize', 'blockSize', 'blksz']);
        // Also check nested dsorg object for totalBlockSize
        const blksizeFinal = blksize !== '--' ? blksize :
          (dsorgRaw?.totalBlockSize ? dsorgRaw.totalBlockSize.toString() : '--');

        // --- VOLSER ---
        const volser = ds?.volser || ds?.vol || ds?.volume || '--';

        // --- SPACE ALLOCATION ---
        const spaceRaw = ds?.spacu || ds?.space || ds?.spaceUnits || '';
        let space = '--';
        if (typeof spaceRaw === 'string' && spaceRaw) {
          // Normalize: TRACKS->TRK, CYLINDERS->CYL, BLOCKS->BLK
          const upper = spaceRaw.toUpperCase();
          if (upper.startsWith('TRACK')) space = 'TRK';
          else if (upper.startsWith('CYL')) space = 'CYL';
          else if (upper.startsWith('BLOCK')) space = 'BLK';
          else space = upper;
        }

        // --- PRIMARY ---
        const primary = this.extractNumericField(ds, ['prime', 'primary', 'sizex', 'primarySpace']);

        // --- SECONDARY ---
        const secondary = this.extractNumericField(ds, ['secnd', 'secondary', 'extx', 'secondarySpace']);

        // --- DIRECTORY BLOCKS ---
        const dirblk = this.extractNumericField(ds, ['dirblk', 'directoryBlocks', 'dsntp']);

        return { dsorg, recfm, lrecl, blksize: blksizeFinal, volser, space, primary, secondary, dirblk };
      }
    } catch (e) {
      console.warn('extractDatasetInfo: failed to parse dataset metadata', e);
    }
    return null;
  }

  /** Try multiple field names and return the first valid numeric value (including 0), or '--' */
  private extractNumericField(obj: any, fields: string[]): string {
    for (const field of fields) {
      const val = obj?.[field];
      if (val !== undefined && val !== null && val !== '') {
        // Ensure the value is actually numeric (or a numeric string)
        const num = Number(val);
        if (!isNaN(num) && num >= 0) {
          return num.toString();
        }
      }
    }
    return '--';
  }

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

  /**
   * Resolves the user's USS home directory for pre-filling the Save As USS tab.
   *
   * Strategy:
   * 1. If fallbackDirectory is provided (last browsed USS directory), use it.
   * 2. Derive home from dataset HLQ: /u/<hlq_lowercase> (z/OS convention).
   * 3. Validate via metadata call; if it fails, leave field empty.
   */
  private fetchUserHomeDirectory(): void {
    // Only fetch if USS directory is not already set
    if (this.results.directory) return;

    // Use fallbackDirectory (activeDirectory from the editor) if provided
    const fallback = this.data.fallbackDirectory || '';
    if (fallback) {
      this.results.directory = fallback;
      this.directoryInput$.next(fallback);
      return;
    }

    // Derive a candidate home path from the dataset HLQ (first qualifier = userid)
    const dsName = this.data.datasetName || '';
    const hlq = dsName.split('.')[0]; // e.g. "TS6330.MY.DATA" -> "TS6330"
    if (!hlq) return;

    // Standard z/OS convention: /u/<userid_lowercase>
    const candidatePath = `/u/${hlq.toLowerCase()}`;

    try {
      const metadataUrl = ZoweZLUX.uriBroker.unixFileUri('metadata', candidatePath.substring(1));
      this.http.get(metadataUrl).pipe(
        takeUntil(this.destroy$),
        catchError(() => of(null))
      ).subscribe((response: any) => {
        if (response && !this.results.directory) {
          // Metadata returned successfully -- path exists, use it
          this.results.directory = candidatePath;
          this.directoryLookupStatus = 'valid';
        }
        // If metadata fails, field stays empty -- user types manually
      });
    } catch (e) {
      // ZoweZLUX may not be available in dev/test environments -- fail silently
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