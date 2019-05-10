
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { NgxMonacoEditorConfig } from 'ngx-monaco-editor';
import { MonacoService } from './monaco.service';
import { EditorServiceInstance } from '../../../shared/editor-control/editor-control.service';

import { EditorService } from '../../editor.service';
import { Subscription } from 'rxjs/Subscription';

const HLASM_LANG = {
  id: 'hlasm',
  // firstLine: 
  extensions: ['.ass', '.asm', '.hlsm', '.hlasm'],
  aliases: ['ASSEMBLY', 'assembly', 'hlsm', 'hlasm'],
  mimetypes: ['application/hlasm']
};

const JCL_LANG = {
  id: 'jcl',
  extensions: ['.jcl', '.cntl'],
  filenamePatterns: ['\\.jcl\\.','\\.jcl','\\.cntl','\\.cntl\\.'],
  aliases: ['JCL', 'jcl'],
  mimetypes: ['application/jcl']
};

const HLASM_HILITE = {
  // Set defaultToken to invalid to see what you do not tokenize yet
  // defaultToken: 'invalid',
  ignoreCase: true,

  // The main tokenizer for our languages
  tokenizer: {
    root: [
      [/^\*.*$/, { token: 'comment', next: '@popall' }],
      [/^[\w&#$@]+\s+/, { token: 'type', next: '@operator' }],
      [/^[\s]{9}/, { token: 'default', next: '@operator' }],
      [/^[\s]{15}/, { token: 'default', next: '@operands' }]
    ],
    operator: [
      [/[\w&#$@]+\s*$/, { token: 'keyword', next: '@popall' }],
      [/[\w&#$@]+\s+/, { token: 'keyword', next: '@operands' }]
    ],
    operands: [
      [/\'[^\']+\'\s*$/, { token: 'string', next: '@popall' }],
      [/\s*$/, { token: 'default', next: '@popall' }],
      [/,\s*$/, { token: 'default', next: '@popall' }],
      [/[\(\)\w&#$@]+\s*$/, { token: 'default', next: '@popall' }],
      [/,[\(\)\w&#$@]+\s*$/, { token: 'default', next: '@popall' }],
      [/,\s+[^X]*$/, { token: 'comment', next: '@popall' }],
      [/\s+[\(\)\s\w&#$@]+\s*$/, { token: 'comment', next: '@popall' }],

      [/,/, { token: 'default', next: '@cont' }],
      [/[kldtn]'[\(\)\w&#$]+/, { token: 'number', next: '@cont' }],
      [/'[^']+'/, { token: 'string', next: '@cont' }],
      [/[\w&#$@]+=/, { token: 'variable.name', next: '@value' }]
    ],
    cont: [
      [/\s*[X]$/, { token: 'keyword', next: '@pop' }],
      [/\s+[\s\.\/\(\)\w&#$@]+$/, { token: 'comment', next: '@popall' }],
      [/\)\s*$/, { token: 'default', next: '@popall' }],
      [/\(/, { token: 'default', next: '@operands' }],
      [/\)/, { token: 'default', next: '@operands' }],
      [/'[^\']+\'\s*/, { token: 'string', next: '@cont' }],
      [/[kldtn]\'[\(\)\w&#$@]+/, { token: 'number', next: '@cont' }],
      [/[\w&#$@]+=/, { token: 'variable.name', next: '@value' }],
      [/[\.\/\(\)\w&#$@]+$/, { token: 'default', next: '@popall' }],
      [/[\.\/\(\)\w&#$@]+/, { token: 'default', next: '@operands' }]
    ],
    comment: [
      [/.*$/, { token: 'comment', next: '@popall' }]
    ],
    value: [
      [/[\-\.\/\(\)\w&#$@]+$/, { token: 'default', next: '@popall' }],
      [/'[^']+'\s*/, { token: 'string', next: '@operands' }],
      [/[kldtn]\'[\(\)\w&#$@]+/, { token: 'number', next: '@operands' }],
      [/[\-\.\/\(\)\w&#$@]+/, { token: 'default', next: '@operands' }]
    ]
  }
};

const JCL_HILITE = {
// Set defaultToken to invalid to see what you do not tokenize yet
  defaultToken: 'default',
  ignoreCase: true,

// Expand tokenizer via: https://microsoft.github.io/monaco-editor/monarch.html
  tokenizer: {
    root: [
      [/( +)/, { token: 'whitespace' }],
      [/^\/\/\*.*$/, { token: 'jcl-comment-//*-all' }],
      //[/^\/\/.*$/, { token: 'jcl-statement-//-all', next: '@operator' }],
      [/^\/\*/, { token: 'jcl-statement-/*', next: '@operands' }],
      [/^\/\/ +[^\s,=~!@%&_{}\]:;"'<>\[\\\^\$\.\|\?\*\+\(\)]+ /, { token: 'jcl-statement-//-one', next: '@operator' }],
      [/^\/\/(\S+)?/, { token: 'jcl-statement-//one', next: '@operator' }],
      [/^\/\//, { token: 'jcl-statement-//', next: '@operator' }],
      [/.*/, { token: 'none-slash' }],
      [/[^,]$/, { token: 'default', next: '@popall' }]
    ],
    operator: [
      //[/\s+\S+/, { token: 'keyword', next: '@operands' }],
      //~!@$%^&*()_+=|\/{}[]:;"'<> ,.?/
      //Any character except [\^$.|?*+() ( +)
      [/( +)/, { token: 'whitespace' }],
      [/(IF)/, { token: 'jcl-operator', next: '@if' }],
      [/(CNTL)/, { token: 'jcl-operator', next: '@cntl' }],
      [/(DD|EXEC|JOB|INCLUDE|JCLLIB|OUTPUT|PROC|SCHEDULE|SET|XMIT)/, { token: 'jcl-operator', next: '@operands' }],
      [/(ENDCNTL|EXPORT|ELSE|ENDIF|PEND)/, { token: 'jcl-operator', next: '@comments' }],
      [/[^DJOBEXCNTLUPHXMI]/, { token: 'default', next: '@operands'}],
      [/[^,]$/, { token: 'default', next: '@popall' }]
      //[/..../, { token: 'default', next: '@operands' }],
    ],
    if: [
      //[/( +)/, { token: 'whitespace' }],
      [/ [^\s,=~!@%&_{}\]:;"'<>\[\\\^\$\.\|\?\*\+\(\)]+ /, { token: 'jcl-variable' }],
      [/(THEN )/, { token: 'jcl-operator', next: '@comments' }],
      [/[^,]$/, { token: 'default', next: '@popall' }]
    ],
    cntl: [
      //[/( +)/, { token: 'whitespace' }],
      [/ \* /, { token: 'jcl-delimiter' , next: '@comments' }],
      [/[^,]$/, { token: 'default', next: '@popall' }]
    ],
    operands: [
      //^( .+)
      [/^( .+)/, { token: 'none-slash'}],
      [/^\/\/\*.*$/, { token: 'jcl-comment-//*-all' }],
      [/^\/\*/, { token: 'jcl-statement-/*', next: '@operands' }],
      [/^\/\/ +[^\s,=~!@%&_{}\]:;"'<>\[\\\^\$\.\|\?\*\+\(\)]+ /, { token: 'jcl-statement-//-one', next: '@operator' }],
      [/^\/\/(\S+)?/, { token: 'jcl-statement-//one', next: '@operator' }],
      [/'[^']+',/, { token: 'jcl-string', next: '@comments' }],
      [/'[^']+'/, { token: 'jcl-string' }],
      [/[^\s,=~!@%&_{}\]:;"'<>\[\\\^\$\.\|\?\*\+\(\)]+ /, { token: 'jcl-variable', next: '@comments'}],
      [/[^\s,=~!@%&_{}\]:;"'<>\[\\\^\$\.\|\?\*\+\(\)]+/, { token: 'jcl-variable' }],
      [/(~|!|@|%|&|_|=|{|}|]|:|;|"|'|<|>|,|\[|\\|\^|\$|\.|\||\?|\*|\+|\(|\))/, { token: 'jcl-delimiter' }],
      [/'[^']+'\s*$/, { token: 'string', next: '@popall' }],
      [/[^,]$/, { token: 'default', next: '@popall' }]
    ],
    comments: [
      [/.*/, { token: 'jcl-comment-//*-all', next: '@popall' }],
      [/[^,]$/, { token: 'default', next: '@popall' }],
    ]
  }
};

export type Theme = monaco.editor.IStandaloneThemeData;

export const JCL_THEME: Theme = {
  base: 'vs-dark',
  inherit: true,
  colors: {
  },
	rules: [ // The following ruleset aims to match a JCL theme similar to one in ISPF
    { token: 'jcl-comment-//*-all', foreground: '20e5e6' }, // Light blue
    { token: 'jcl-statement-//', foreground: '50eb24' }, // Green
    { token: 'jcl-statement-/*', foreground: '50eb24' }, // Green
    { token: 'jcl-statement-//one', foreground: '50eb24' }, // Green
    { token: 'jcl-statement-//-one', foreground: '50eb24' }, // Green
    { token: 'jcl-operator', foreground: 'eb2424' }, // Red
    { token: 'jcl-delimiter', foreground: 'fffd23' }, // Yellow
    { token: 'jcl-string', foreground: 'fdfdfd' }, // White
    { token: 'jcl-variable', foreground: '50eb24' }, // Green
    { token: 'none-slash', foreground: '815aff' }, // Blue-Purple
    { token: 'default', foreground: '50eb24' }, // Green
	]
}

export class MonacoConfig {
  subscription: Subscription = null;
  config = {
    baseUrl: '../../org.zowe.editor/web/assets', // configure base path for monaco editor
    defaultOptions: { scrollBeyondLastLine: false }, // pass default options to be used
    onMonacoLoad: this.onLoad.bind(this),
  };

  onLoad() {
    let self = this;
    // This step only happens once per editor load, not once per file load. It happens before language menu is generated
    monaco.languages.register(HLASM_LANG);
    monaco.languages.register(JCL_LANG);
    
    monaco.languages.setMonarchTokensProvider('hlasm', <any>HLASM_HILITE);
    monaco.languages.setMonarchTokensProvider('jcl', <any>JCL_HILITE);

    monaco.editor.defineTheme('jcl', JCL_THEME);

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

        editorService._editorCore.next((<any>window).monaco);
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
