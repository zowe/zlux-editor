
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
export interface ProjectStructure {
    id: string;
    name: string;
    ext?: string;
    language?: string;
    children?: ProjectStructure[];
    hasChildren: boolean;
    contents?: string;
    line?: number;
    parent?: string;
    path?: string;
    fileName?: string;
    isDataset: boolean;
    encoding?: number;
    datasetAttrs?: DatasetAttributes;
}

export interface DatasetAttributes {
  csiEntryType: string,
  name: string,
  dsorg?: DatasetOrganization,
  members?: Array<any>,
  recfm?: RecordFormat,
  volser?: string
}

export interface RecordFormat {
  carriageControl: string;
  isBlocked: boolean;
  recordLength: string;
}

export interface DatasetOrganization {
  maxRecordLen: number;
  organization: string;
  totalBlockSize: number;
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
