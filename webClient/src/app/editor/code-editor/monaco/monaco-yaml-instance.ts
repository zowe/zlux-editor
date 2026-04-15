
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

// Module-level singleton that holds the MonacoYaml instance created in
// MonacoConfig.onLoad(). Kept as 'any' so that monaco-yaml is not imported
// at module scope from code paths that do not need it.
let monacoYamlInstance: any = null;

export function setMonacoYamlInstance(instance: any): void {
  monacoYamlInstance = instance;
}

export function getMonacoYamlInstance(): any {
  return monacoYamlInstance;
}
