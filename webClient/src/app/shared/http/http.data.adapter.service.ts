
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Injectable, Inject } from '@angular/core';
import { ProjectDef } from '../model/project';
import { ProjectStructure } from '../model/editor-project';
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';
import * as _ from 'lodash';
import { B64Decoder } from '../b64-decoder';

@Injectable()
export class DataAdapterService {

  constructor(@Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger) {}

  convertProjectList(responseData: any): ProjectDef[] {
    return [{
      name: '',
      desc: '',
    }];
  }

  convertDirectoryList(responseData: any): ProjectStructure[] {
    // let match = /[^<>/\\\|:""\*\?]+\.\w+$/;
    let entries = responseData.entries;
    return entries.map((entry: any) => {
      let lastIndex = entry.path.lastIndexOf('/');
      let eFileName = entry.path.substring(lastIndex + 1);
      let eFilePath = entry.path.substring(0, lastIndex);
      let eEncoding = entry.ccsid;
      return <ProjectStructure>{
        id: _.uniqueId(),
        name: entry.name,
        hasChildren: entry.directory,
        path: eFilePath,
        fileName: eFileName,
        isDataset: false,
        encoding: eEncoding
      };
    });
  }

  convertDatasetList(responseData: any): ProjectStructure[] {
    this.log.debug(`Dataset response=`,responseData);
    let entries = responseData.datasets;
    return entries.map((entry: any) => {
      let pds = entry.dsorg != null && entry.dsorg.isPDSDir;
      return <ProjectStructure>{
        id: _.uniqueId(),
        name: entry.name.trim(),
        hasChildren: pds,
        path: entry.name.trim(),
        fileName: entry.name.trim(),
        isDataset: true,
        datasetAttrs: {
          csiEntryType: entry.csiEntryType,
          dsorg: entry.dsorg,
          recfm: entry.recfm,
          volser: entry.volser
        }
      };
    });
  }

  convertDatasetMemberList(responseData: any): ProjectStructure[] {
    let entries = responseData.datasets;
    let path = entries[0].name;
    let parent = entries[0];
    return entries[0].members.map((entry: any) => {
      return <ProjectStructure>{
        id: _.uniqueId(),
        name: entry.name.trim(),
        hasChildren: false,
        path: path.trim() + "(" + entry.name.trim() + ")",
        fileName: path.trim() + "(" + entry.name.trim() + ")",
        isDataset: true,
        datasetAttrs: {
          csiEntryType: parent.csiEntryType,
          dsorg: parent.dsorg,
          recfm: parent.recfm,
          volser: parent.volser
        }
      };
    });
  }

  convertFileContent(b64ResponseData: any): { contents: string } {
    return {
      contents: B64Decoder(b64ResponseData),
    };
  }

  convertDatasetContent(responseData: any): { contents: string } {
    return {
      contents: JSON.parse(responseData).records.join("\n")
    };
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
