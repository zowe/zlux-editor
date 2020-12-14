
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { MonacoService } from './monaco.service';
import { EditorServiceInstance } from '../../../shared/editor-control/editor-control.service';

import { EditorService } from '../../editor.service';
import { Subscription } from 'rxjs/Subscription';
import * as monaco from 'monaco-editor'

import { BPXPRM_HILITE } from './hiliters/bpxprm';
import { HLASM_HILITE } from './hiliters/hlasm';
import { IEASYS_HILITE } from './hiliters/ieasys';
import { JCL_HILITE } from './hiliters/jcl';
import { REXX_HILITE } from './hiliters/rexx';


const BPXPRM_LANG = {  
  id: 'bpxprm',
  extensions: [],
  filenamePatterns: ['BPXPRM\\d\\d$'],
  aliases: ['BPXPRM'],
  mimetypes: ['application/bpxprm']
};

const HLASM_LANG = {
  id: 'hlasm',
  // firstLine: 
  extensions: ['.ass', '.asm', '.hlsm', '.hlasm'],
  aliases: ['ASSEMBLY', 'assembly', 'hlsm', 'hlasm'],
  mimetypes: ['application/hlasm']
};

const IEASYS_LANG = {  
  id: 'ieasys',
  extensions: [],
  filenamePatterns: ['IEASYS\\d\\d$'],
  aliases: ['IEASYS'],
  mimetypes: ['application/ieasys']
};

const JCL_LANG = {
  id: 'jcl',
  extensions: ['.jcl', '.cntl'],
  filenamePatterns: ['\\.jcl\\.','\\.jcl','\\.cntl','\\.cntl\\.'],
  aliases: ['JCL', 'jcl'],
  mimetypes: ['application/jcl']
};

const REXX_LANG = {  
  id: 'rexx',
  extensions: ['.rexx', '.zrx'],
  filenamePatterns: ['\\.rexx\\.','\\.rexx','\\.exec\\.','\\.exec'],
  aliases: ['REXX', 'rexx'],
  mimetypes: ['application/rexx']
};

export type Theme = monaco.editor.IStandaloneThemeData;

// TODO: (See zlux-editor\webClient\src\app\shared\editor-control --- setThemeForLanguage())
// We should think about how to handle themes. Preserving ISPF colors would be nice
// and we can avoid messing with a user's preferred theme by uniquely naming tokens.
export const JCL_DARK: Theme = {
  base: 'vs-dark',
  inherit: true,
  colors: {
  },
	rules: [ // The following ruleset aims to match a JCL theme similar to one in ISPF
    { token: 'jcl-comment', foreground: '20e5e6' }, // Light blue
    { token: 'jcl-statement', foreground: '50eb24' }, // Green
    { token: 'jcl-operator', foreground: 'eb2424' }, // Red
    { token: 'jcl-delimiter', foreground: 'fffd23' }, // Yellow
    { token: 'jcl-string', foreground: 'fdfdfd' }, // White
    { token: 'jcl-variable', foreground: '50eb24' }, // Green
    { token: 'jcl-invalid', foreground: 'ffadc7', background: 'ff8173', fontStyle: 'bold' }, // Light red, background is supposed to be "highlight" 
    //of text but it doesn't seem to work?
    { token: 'jcl-none', foreground: '75abff' }, // Blue
    { token: 'jcl-default', foreground: '50eb24' }, // Green
	]
}

export const REXX_DARK: Theme = {
  base: 'vs-dark',
  inherit: true,
  colors: {
  },
	rules: [ // The following ruleset aims to match a JCL theme similar to one in ISPF
    { token: 'constructor', foreground: 'fffd23', fontStyle: 'bold' },
    { token: 'fcall', foreground: 'fffd23' },
    { token: 'builtin-fcall', foreground: 'FFB516' },
	]
}


export class MonacoConfig {
  subscription: Subscription = null;
  defaultOptions: any = { scrollBeyondLastLine: false }; // pass default options to be used

  onLoad() {
    let self = this;
    // This step only happens once per editor load, not once per file load. It happens before language menu is generated
    monaco.languages.register(BPXPRM_LANG);
    monaco.languages.register(HLASM_LANG);
    monaco.languages.register(IEASYS_LANG);
    monaco.languages.register(JCL_LANG);
    monaco.languages.register(REXX_LANG);

    monaco.languages.setMonarchTokensProvider('bpxprm', <any>BPXPRM_HILITE);
    monaco.languages.setMonarchTokensProvider('hlasm', <any>HLASM_HILITE);
    monaco.languages.setMonarchTokensProvider('ieasys', <any>IEASYS_HILITE);
    monaco.languages.setMonarchTokensProvider('jcl', <any>JCL_HILITE);
    monaco.languages.setMonarchTokensProvider('rexx', <any>REXX_HILITE);



    monaco.editor.defineTheme('jcl-dark', JCL_DARK);
    monaco.editor.defineTheme('rexx-dark', REXX_DARK);

    // set monaco after all done
    this.subscription = EditorServiceInstance.subscribe((editorService) => {
      if (editorService != null) {
        if (editorService._isTestLangMode) {
          console.log(`Adding test language`);
          editorService.registerLanguage({
            id: 'TEST_LANGUAGE',
            extensions: ['.editortest'],
            aliases: ['TEST_LANGUAGE']
          });
        }

        editorService._editorCore.next(monaco);
        if (self.subscription) { self.subscription.unsubscribe(); }
      }
    });
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
