
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { ProjectStructure } from './editor-project';

export enum ProjectContextType {
  file = 0,
  menu = 1
}

export interface ProjectContext {
    id: string;
    name: string;
    parent?: ProjectContext;
    root?: ProjectContext;
    model: ProjectStructure;
    opened: boolean;
    active: boolean;
    changed: boolean;
    children?: ProjectContext[];
    temp?: boolean;
    tempChildren?: ProjectContext[];
    type?: ProjectContextType;
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
