
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Endpoints } from '../app/shared/model/endpoints';

// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
  production: false
};

// export const ENDPOINTS: Endpoints = {
//   projectStructure: 'http://rs22:5000/projects/{name}',
//   jsonFile: './mock/jsonFile.json',
//   xmlFile: './mock/xmlFile.json',
//   asmFile: './mock/file.json',
//   htmlFile: './mock/htmlFile.json',
//   project: './mock/project.json',
//   projectFile: 'http://rs22:5000/datasets/{name}/members',
//   file: 'http://rs22:5000/datasets/{dataset}/members/{member}',
//   saveFile: 'http://rs22:5000/datasets/{dataset}/members/{member}',
//   searchInFile: 'http://rs22:5000/projects/{project}/search?pattern={pattern}',
//   diagram: 'http://wal-vm-db2zos1:5000/genflow',
//   jobs: 'http://rs22:5000/jobs',
// };

export const ENDPOINTS: Endpoints = {
  projectStructure: 'http://rs22:5000/projects/{name}',
  jsonFile: './mock/jsonFile.json',
  xmlFile: './mock/xmlFile.json',
  asmFile: './mock/file.json',
  htmlFile: './mock/htmlFile.json',
  project: '../../com.rs.mvd.ide/web/mock/project.json',
  projectFile: 'http://rs22:5000/datasets/{name}/members',
  file: 'http://rs22:5000/datasets/{dataset}/members/{member}',
  saveFile: 'http://rs22:5000/datasets/{dataset}/members/{member}',
  searchInFile: 'http://rs22:5000/projects/GCE/search?pattern={pattern}',
  diagram: 'http://wal-vm-db2zos1:5000/genflow',
  jobs: 'http://rs22:5000/jobs',
  openUnixDirectory: '/unixFileContents/{path}',
  openUnixFile: '/unixFileContents/{directory}/{file}',
  updateUnixFile: '/unixFileContents/{directory}/{file}',
  saveUnixFile: '/unixFileContents/{directory}/{file}',
  datasetList: '/datasetMetadata/name/{dataset}?detail=true',
  datasetMemberList: '/datasetMetadata/name/{dataset}?listMembers=true',
  datasetContents: '/datasetContents/{dataset}'
};

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
