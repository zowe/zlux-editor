
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Injectable } from '@angular/core';
import { ProjectDef } from '../model/project';
import { ProjectStructure } from '../model/editor-project';
import * as _ from 'lodash';

@Injectable()
export class DataAdapterService {

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
      return <ProjectStructure>{
        id: _.uniqueId(),
        name: entry.name,
        hasChildren: entry.directory,
        path: eFilePath,
        fileName: eFileName,
      };
    });
  }

  convertFileContent(responseData: any): { contents: string } {
    return {
      contents: responseData,
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
