
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Injectable } from '@angular/core';
import * as _ from 'lodash';

_.templateSettings.interpolate = /{([\s\S]+?)}/g;
@Injectable()
export class UtilsService {
  constructor() { }

  formatUrl(url: string, options?: any): string {
    const compiled = _.template(url);
    return compiled(options);
  }


  /**
   * get folder name from a path
   * e.g. Input: /home/user/git => Output: git
   *
   * @returns {string} folder name
   * @memberof UtilsService
   */
  getFolderName(path: string): string {
    let lastIndex = path.lastIndexOf('/');
    if (lastIndex > -1) {
      return path.substring(lastIndex + 1);
    } else {
      throw new Error('path not valid');
    }
  }


  /**
   * check file extension
   * Input string could be: "/home/user/folder/xxx.json" or "xxx.ts"
   *
   * @param {string} path
   * @memberof UtilsService
   */
  fileExtension(path: string): string {
    let lastDotIndex = path.lastIndexOf('.');
    let ext = path.substring(lastDotIndex + 1);
    let valid = true;

    for (let char of ['/', '\\']) {
      if (ext.indexOf(char) > -1) {
        valid = false;
      }
    }

    if (valid) {
      return ext;
    } else {
      throw new Error('There is no file in the path.');
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
