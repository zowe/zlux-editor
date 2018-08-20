
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

export class MonacoConfig {
  subscription: Subscription = null;
  config = {
    baseUrl: '../../org.zowe.editor/web/assets', // configure base path for monaco editor
    defaultOptions: { scrollBeyondLastLine: false }, // pass default options to be used
    onMonacoLoad: this.onLoad.bind(this),
  };

  constructor() { }

  onLoad() {
    let self = this;
    // here monaco object will be available as window.monaco use this function to extend monaco editor functionalities.
    console.log((<any>window).monaco);

    monaco.languages.register({
      id: 'hlasm',
      extensions: ['.ass', '.asm', '.hlsm', '.hlasm'],
      aliases: ['ASSEMBLY', 'assembly', 'hlsm', 'hlasm'],
      mimetypes: ['application/hlasm'],
    });

    monaco.languages.register({
      id: 'jcl',
      extensions: ['.jcl'],
      aliases: ['JCL', 'jcl'],
      mimetypes: ['application/jcl'],
    });

    monaco.languages.setMonarchTokensProvider('hlasm', <any>{
      // Set defaultToken to invalid to see what you do not tokenize yet
      // defaultToken: 'invalid',
      ignoreCase: true,

      // The main tokenizer for our languages
      tokenizer: {
        root: [
          [/^\*.*$/, { token: 'comment', next: '@popall' }],
          [/^[\w&#$@]+\s+/, { token: 'type', next: '@operator' }],
          [/^[\s]{9}/, { token: 'default', next: '@operator' }],
          [/^[\s]{15}/, { token: 'default', next: '@operands' }],
        ],
        operator: [
          [/[\w&#$@]+\s*$/, { token: 'keyword', next: '@popall' }],
          [/[\w&#$@]+\s+/, { token: 'keyword', next: '@operands' }]
        ],
        operands: [
          [/'[^']+'\s*$/, { token: 'string', next: '@popall' }],
          [/\s*$/, { token: 'default', next: '@popall' }],
          [/,\s*$/, { token: 'default', next: '@popall' }],
          [/[\(\)\w&#$@]+\s*$/, { token: 'default', next: '@popall' }],
          [/,[\(\)\w&#$@]+\s*$/, { token: 'default', next: '@popall' }],
          [/,\s+[^X]*$/, { token: 'comment', next: '@popall' }],
          [/\s+[\(\)\s\w&#$@]+\s*$/, { token: 'comment', next: '@popall' }],

          [/,/, { token: 'default', next: '@cont' }],
          [/[kldtn]'[\(\)\w&#$]+/, { token: 'number', next: '@cont' }],
          [/'[^']+'/, { token: 'string', next: '@cont' }],
          [/[\w&#$@]+=/, { token: 'variable.name', next: '@value' }],
        ],
        cont: [
          [/\s*[X]$/, { token: 'keyword', next: '@pop' }],
          [/\s+[\s\.\/\(\)\w&#$@]+$/, { token: 'comment', next: '@popall' }],
          [/\)\s*$/, { token: 'default', next: '@popall' }],
          [/\(/, { token: 'default', next: '@operands' }],
          [/\)/, { token: 'default', next: '@operands' }],
          [/'[^']+'\s*/, { token: 'string', next: '@cont' }],
          [/[kldtn]'[\(\)\w&#$@]+/, { token: 'number', next: '@cont' }],
          [/[\w&#$@]+=/, { token: 'variable.name', next: '@value' }],
          [/[\.\/\(\)\w&#$@]+$/, { token: 'default', next: '@popall' }],
          [/[\.\/\(\)\w&#$@]+/, { token: 'default', next: '@operands' }],
        ],
        comment: [
          [/.*$/, { token: 'comment', next: '@popall' }],
        ],
        value: [
          [/[\-\.\/\(\)\w&#$@]+$/, { token: 'default', next: '@popall' }],
          [/'[^']+'\s*/, { token: 'string', next: '@operands' }],
          [/[kldtn]'[\(\)\w&#$@]+/, { token: 'number', next: '@operands' }],
          [/[\-\.\/\(\)\w&#$@]+/, { token: 'default', next: '@operands' }],
        ],
      }
    });

    monaco.languages.setMonarchTokensProvider('jcl', <any>{
      // Set defaultToken to invalid to see what you do not tokenize yet
      // defaultToken: 'invalid',
      ignoreCase: true,

      // The main tokenizer for our languages
      tokenizer: {
        root: [
          [/^\/\/\*.*$/, { token: 'comment' }],
          [/^\/\*.*$/, { token: 'comment' }],
          [/^\/\/(\S+)?/, { token: 'type', next: '@operator' }],
        ],
        operator: [
          [/\s+\S+/, { token: 'keyword', next: '@operands' }]
        ],
        operands: [
          [/^(\/\/)(\s+)/, ['type', 'default']],
          [/'[^']+'\s*$/, { token: 'string', next: '@popall' }],
          [/'[^']+'/, { token: 'string' }],
          [/[^\s,]+=/, { token: 'variable.name' }],
          [/[^,]\s*$/, { token: 'default', next: '@popall' }]
        ],
      }
    });

    // set monaco after all done
    this.subscription = EditorServiceInstance.subscribe((editorService) => {
      if (editorService != null) {
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
