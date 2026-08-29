
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Injectable } from '@angular/core';
import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { HttpService } from '../../../shared/http/http.service';
import { ProjectContext } from '../../../shared/model/project-context';
import { EditorControlService } from '../../../shared/editor-control/editor-control.service';
import { SnackBarService } from '../../../shared/snack-bar.service';
import { MessageDuration } from '../../../shared/message-duration';

declare var ZoweZLUX: any;

/** Typed representation of the dialog result when saving as a dataset */
export interface DatasetSaveResult {
  saveType: 'dataset';
  allocateNew?: boolean;
  datasetName: string;
  memberName: string;
  allocateProps?: {
    datasetNameType: string;
    organization: string;
    allocationUnit: string;
    primarySpace: string;
    secondarySpace: string;
    directoryBlocks: string;
    recordFormat: string;
    recordLength: string;
    blockSize: string;
  };
}

@Injectable()
export class DatasetSaveService {

  constructor(
    private http: HttpService,
    private editorControl: EditorControlService,
    private snackBar: SnackBarService,
  ) {}

  /**
   * Allocates a new dataset and optionally saves content to it (or to a member).
   * Returns an Observable that emits 'Save' on success.
   */
  allocateAndSave(fileContext: ProjectContext, result: DatasetSaveResult): Observable<string> {
    const allocProps = result.allocateProps;
    const datasetName = result.datasetName;
    const requestUrl = ZoweZLUX.uriBroker.datasetContentsUri(datasetName);

    // Map datasetNameType: LIBRARY -> PDSE for the API
    let dsnt = allocProps.datasetNameType;
    if (dsnt === 'LIBRARY') {
      dsnt = 'PDSE';
    }

    const allocBody: any = {
      ndisp: 'CATALOG',
      status: 'NEW',
      space: allocProps.allocationUnit,
      dsorg: allocProps.organization,
      lrecl: parseInt(allocProps.recordLength, 10),
      recfm: allocProps.recordFormat,
      dir: parseInt(allocProps.directoryBlocks, 10),
      prime: parseInt(allocProps.primarySpace, 10),
      secnd: parseInt(allocProps.secondarySpace, 10),
      dsnt: dsnt,
      close: 'true',
    };
    // Only include blockSize if it's a valid positive integer; 0 or negative causes ACB errors on z/OS
    if (allocProps.blockSize) {
      const blkSizeNum = parseInt(allocProps.blockSize, 10);
      if (!isNaN(blkSizeNum) && blkSizeNum > 0) {
        allocBody.blksz = blkSizeNum;
      }
    }

    return this.http.put(requestUrl, allocBody).pipe(
      switchMap(() => {
        // If allocating PDS/PDSE with no member name, skip content save
        // (you can't PUT content directly to a PDS -- only to DSN(MEMBER))
        if ((allocProps.organization === 'PO') && !result.memberName) {
          this.snackBar.open(`Dataset ${datasetName} allocated successfully. Use Save As -> Member to save content.`, 'Dismiss',
            { duration: MessageDuration.Long, panelClass: 'center' });
          fileContext.model.isDataset = true;
          fileContext.model.fileName = datasetName;
          fileContext.model.name = datasetName;
          fileContext.model.path = datasetName;
          fileContext.temp = false;
          this.editorControl._openFileList.next(this.editorControl._openFileList.getValue());
          return of('Save');
        } else {
          this.snackBar.open(`Dataset ${datasetName} allocated successfully`, 'Dismiss',
            { duration: MessageDuration.Medium, panelClass: 'center' });
          return this.saveAsDatasetMember(fileContext, result);
        }
      }),
      catchError((error: any) => {
        const raw = error?.error;
        const errMsg = (typeof raw === 'string') ? raw
          : raw?.error || raw?.msg || raw?.message || JSON.stringify(raw) || error?.message || 'Unknown error';
        // If error explicitly says "already exists", fall back to direct save
        if (errMsg.includes('already exists')) {
          this.snackBar.open(`Dataset ${datasetName} already exists -- saving content directly.`, 'Dismiss',
            { duration: MessageDuration.Medium, panelClass: 'center' });
          return this.saveAsDatasetMember(fileContext, result);
        } else if (errMsg.includes('Unable to allocate a DD for ACB')) {
          this.snackBar.open(`Failed to allocate dataset ${datasetName}: The high-level qualifier may not be authorized for this user. Try a different dataset name prefix.`,
            'Close', { duration: MessageDuration.Long, panelClass: 'center' });
          return throwError(() => errMsg);
        } else {
          this.snackBar.open(`Failed to allocate dataset ${datasetName}: ${errMsg}`,
            'Close', { duration: MessageDuration.Long, panelClass: 'center' });
          return throwError(() => errMsg);
        }
      })
    );
  }

  /**
   * Saves the current editor content to a dataset or dataset member.
   * Returns an Observable that emits 'Save' on success.
   */
  saveAsDatasetMember(fileContext: ProjectContext, result: DatasetSaveResult): Observable<string> {
    const datasetName = result.datasetName;
    const memberName = result.memberName;
    const fullName = memberName ? `${datasetName}(${memberName})` : datasetName;
    const requestUrl = ZoweZLUX.uriBroker.datasetContentsUri(fullName);

    // Always get the latest content from the active editor model to avoid saving stale/empty data
    const editor = this.editorControl.editor.getValue();
    const editorModel = editor?.getModel();
    const rawContent = editorModel ? editorModel.getValue() : fileContext.model.contents;
    const contents = rawContent ? rawContent.replace(/\r\n/g, '\n').split('\n') : [''];

    // Use force=true to overwrite existing members (same as regular save does)
    let parameters = new HttpParams();
    parameters = parameters.append('force', 'true');
    const options = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      params: parameters
    };

    return this.http.post(requestUrl, { records: contents }, options).pipe(
      switchMap(() => {
        this.snackBar.open(`Saved to dataset: ${fullName}`, 'Dismiss',
          { duration: MessageDuration.Medium, panelClass: 'center' });
        // Update file context to reflect it's now a dataset
        fileContext.model.isDataset = true;
        fileContext.model.fileName = fullName;
        fileContext.model.name = memberName || datasetName;
        fileContext.model.path = datasetName;
        fileContext.model.contents = rawContent || '';
        fileContext.temp = false;
        fileContext.changed = false;
        // Notify tab bar of the title change
        this.editorControl._openFileList.next(this.editorControl._openFileList.getValue());
        // Emit bufferSaved so the file tree and other listeners know
        this.editorControl.bufferSaved.next({ buffer: fileContext.model.contents, file: fileContext.model.name });
        // Refresh the dataset member list in the file tree so user doesn't have to manually refresh
        this.editorControl.openDirectory.next(datasetName);
        return of('Save');
      }),
      catchError((error: any) => {
        const raw = error?.error;
        let errMsg = (typeof raw === 'string') ? raw
          : raw?.error || raw?.msg || raw?.message || JSON.stringify(raw) || error?.message || 'Unknown error';
        // Simplify verbose server messages that include full record content
        // e.g. 'Record #10 with contents "Aaaa..." is longer than the max record length of 80'
        // -> 'Line 10 exceeds the max record length of 80'
        const recordMatch = errMsg.match(/Record #(\d+) with contents .* is longer than the max record length of (\d+)/);
        if (recordMatch) {
          errMsg = `Line ${recordMatch[1]} exceeds the max record length of ${recordMatch[2]}`;
        }
        this.snackBar.open(`Failed to save to dataset ${fullName}: ${errMsg}`,
          'Close', { duration: MessageDuration.Long, panelClass: 'center' });
        return throwError(() => errMsg);
      })
    );
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
