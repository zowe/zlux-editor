
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
import { Subscription } from 'rxjs';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

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
	rules: [ // additional tokens for getting distinct and useful colors for important parts of the language
    { token: 'constructor', foreground: 'fffd23', fontStyle: 'bold' },
    { token: 'fcall', foreground: 'fffd23' },
    { token: 'builtin-fcall', foreground: 'FFB516' },
	]
}

export enum ConfigItemType {
  array = 0,
  number = 1,
  string = 2,
  boolean = 3
}

export type MonacoConfigItem = {
  attribute: string;
  defaultName?: string;
  type: ConfigItemType;
  types?: string[];
  values?: any[];
  value?: any;
  default: any;
}

export const DEFAULT_CONFIG: MonacoConfigItem[] = [
    {
      attribute: 'theme',
      type: ConfigItemType.array,
      values: ['vs', 'vs-dark'],
      default: 'vs-dark'
    },
    {
      attribute: 'autoClosingBrackets',
      type: ConfigItemType.array,
      values: ['always', 'languageDefined', 'beforeWhitespace', 'never'],
      default: 'languageDefined'
    },
    {
      attribute: 'autoClosingOvertype',
      type: ConfigItemType.array,
      values: ['always', 'auto', 'never'],
      default: undefined
    },
    {
      attribute: 'autoClosingQuotes',
      type: ConfigItemType.array,
      values: ['always', 'languageDefined', 'beforeWhitespace', 'never'],
      default: 'languageDefined'
    },
    {
      attribute: 'autoIndent',
      type: ConfigItemType.array,
      values: ['none', 'keep', 'brackets', 'advanced', 'full'],
      default: 'advanced'
    },
    {
      attribute: 'codeLens',
      type: ConfigItemType.boolean,
      default: true
    },
    {
      attribute: 'colorDecorators',
      type: ConfigItemType.boolean,
      default: true
    },
    {
      attribute: 'codeBlinking',
      type: ConfigItemType.array,
      values: ['blink','smooth','phase','expand','solid'],
      default: 'blink'
    },
    {
      attribute: 'cursorStyle',
      type: ConfigItemType.array,
      values: ['line','block','underline','line-thin','block-outline','underline-thin'],
      default: 'line'
    },
    {
      attribute: 'folding',
      type: ConfigItemType.boolean,
      default: true
    },
    {
      attribute: 'foldingHighlight',
      type: ConfigItemType.boolean,
      default: true
    },
    {
      attribute: 'fontFamily',
      type: ConfigItemType.string,
      default: undefined
    },
    {
      attribute: 'fontSize',
      type: ConfigItemType.number,
      default: undefined
    },
    {
      attribute: 'formatOnPaste',
      type: ConfigItemType.boolean,
      default: false
    },
    {
      attribute: 'formatOnType',
      type: ConfigItemType.boolean,
      default: false
    },
    {
      attribute: 'hover.delay',
      type: ConfigItemType.number,
      default: 300
    },
    {
      attribute: 'hover.enabled',
      type: ConfigItemType.boolean,
      default: true
    },
    {
      attribute: 'lineNumbers',
      type: ConfigItemType.array,
      values: ['on','off','relative','interval'],
      default: 'on'
    },
    {
      attribute: 'links',
      type: ConfigItemType.boolean,
      default: true
    },
    {
      attribute: 'matchBrackets',
      type: ConfigItemType.array,
      values: ['never','near','always'],
      default: 'always'
    },
    {
      attribute: 'minimap.enabled',
      type: ConfigItemType.boolean,
      default: false
    },
    {
      attribute: 'minimap.maxColumn',
      type: ConfigItemType.number,
      default: 120
    },
    {
      attribute: 'minimap.side',
      type: ConfigItemType.array,
      values: ['left','right'],
      default: 'right'
    },
    {
      attribute: 'occurrencesHighlight',
      type: ConfigItemType.boolean,
      default: true
    },
    {
      attribute: 'parameterHints.enabled',
      type: ConfigItemType.boolean,
      default: true
    },
    {
      attribute: 'quickSuggestions',
      type: ConfigItemType.boolean,
      default: true
    },
    {
      attribute: 'quickSuggestionsDelay',
      type: ConfigItemType.number,
      default: 10
    },
    {
      attribute: 'renderControlCharacters',
      type: ConfigItemType.boolean,
      default: false
    },
    {
      attribute: 'renderFinalNewline',
      type: ConfigItemType.boolean,
      default: true
    },
    {
      attribute: 'renderIndentGuides',
      type: ConfigItemType.boolean,
      default: true
    },
    {
      attribute: 'renderLineHighlight',
      type: ConfigItemType.array,
      values: ['none','gutter','line','all'],
      default: 'all'
    },
    {
      attribute: 'renderLineHighlightOnlyWhenFocus',
      type: ConfigItemType.boolean,
      default: false
    },
    {
      attribute: 'renderValidationDecorations',
      type: ConfigItemType.array,
      values: ['editable','on','off'],
      default: 'editable'
    },
    {
      attribute: 'renderWhitespace',
      type: ConfigItemType.array,
      values: ['none','boundary','selection','trailing','all'],
      default: 'none'
    },
    {
      attribute: 'roundedSelection',
      type: ConfigItemType.boolean,
      default: true
    },
    {
      attribute: 'scrollBeyondLastColumn',
      type: ConfigItemType.number,
      default: 5
    },
    {
      attribute: 'scrollBeyondLastLine',
      type: ConfigItemType.boolean,
      default: false
    },
    {
      attribute: 'selectOnLineNumbers',
      type: ConfigItemType.boolean,
      default: true
    },
    {
      attribute: 'selectionHighlight',
      type: ConfigItemType.boolean,
      default: true
    },
    {
      attribute: 'showDeprecated',
      type: ConfigItemType.boolean,
      default: true
    },
    {
      attribute: 'showFoldingControls',
      type: ConfigItemType.array,
      values: ['always', 'mouseover'],
      default: 'mouseover'
    },
    {
      attribute: 'showUnused',
      type: ConfigItemType.boolean,
      default: true
    },
    {
      attribute: 'smoothScrolling',
      type: ConfigItemType.boolean,
      default: false
    },
    {
      attribute: 'snippetSuggestions',
      type: ConfigItemType.array,
      values: ['top','bottom','inline','none'],
      default: true
    },
    {
      attribute: 'stickyTabStops',
      type: ConfigItemType.boolean,
      default: false
    },
    {
      attribute: 'stopRenderingLineAfter',
      type: ConfigItemType.number,
      default: 10000
    },
    {
      attribute: 'suggestOnTriggerCharacters',
      type: ConfigItemType.boolean,
      default: true
    },
    {
      attribute: 'suggestSelection',
      type: ConfigItemType.array,
      values: ['first','recentlyUsed','recentlyUsedByPrefix'],
      default: undefined
    },
    {
      attribute: 'tabCompletion',
      type: ConfigItemType.array,
      values: ['on','off','onlySnippets'],
      default: undefined
    },
    {
      attribute: 'unfoldOnClickAfterEndOfLine',
      type: ConfigItemType.boolean,
      default: false
    },
    {
      attribute: 'useTabStops',
      type: ConfigItemType.boolean,
      default: false
    },
    {
      attribute: 'wordSeparators',
      type: ConfigItemType.string,
      default: '`~!@#$%^&*()-=+[{]}\|;:\'",.<>/?'
    },
    {
      attribute: 'wordWrap',
      type: ConfigItemType.array,
      values: ['off','on','wordWrapColumn','bounded'],
      default: 'off'
    },
    {
      attribute: 'wordWrapColumn',
      type: ConfigItemType.number,
      default: 80
    },
    {
      attribute: 'wrappingIndent',
      type: ConfigItemType.array,
      values: ['none','same','indent','deepIndent'],
      default: 'none'
    }
];


export class MonacoConfig {
  subscription: Subscription = null;

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
