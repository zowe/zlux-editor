
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

const fs = require('fs');
const path = require('path');
const files = fs.readdirSync(path.join('..', 'web'));
for (let i = 0; i < files.length; i++) {
  if (files[i].endsWith('.map.gz')) {
    fs.unlinkSync(path.join('..', 'web', files[i]));
  } else if (files[i].endsWith('.map')) {
    fs.unlinkSync(path.join('..', 'web', files[i]));
  } else if (files[i].endsWith('.gz')) {
    for (let j = 0; j < files.length; j++) {
      if (files[j] == files[i].substring(0, files[i].length - 3)) {
        fs.unlinkSync(path.join('..', 'web', files[j]));
      }
    }
  }
}
