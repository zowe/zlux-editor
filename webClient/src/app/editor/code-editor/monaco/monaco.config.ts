
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
import {
  ATTLS_HILITE,
  ATTLS_KEYWORD_DOCS,
  parseAttlsDeclarations,
  extractDeclarationText,
  getHoveredKeyword,
  getHoveredRefName,
} from './hiliters/attls';


// contentDetect: true opts this language in for content-based detection in
// getRecommendedHighlightingModesForBuffer (multiline firstLine matching).
const ATTLS_LANG = {
  id: 'attls',
  firstLine: '^TTLSRule\\b',
  filenamePatterns: [],
  aliases: ['ATTLS', 'AT-TLS', 'attls'],
  mimetypes: ['application/attls'],
  contentDetect: true,
};

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
export const ATTLS_DARK: Theme = {
  base: 'vs-dark',
  inherit: true,
  colors: {},
  rules: [
    { token: 'attls-comment',     foreground: '6a9955' },  // muted green
    { token: 'attls-type',        foreground: '4ec9b0' },  // teal  (declaration keyword)
    { token: 'attls-nested-type', foreground: '4ec9b0' },  // teal  (nested block keyword)
    { token: 'attls-name',        foreground: 'ce9178' },  // orange (declared item name)
    { token: 'attls-key',         foreground: '9cdcfe' },  // light blue (property key)
    { token: 'attls-ref-key',     foreground: 'c586c0' },  // purple (reference property key)
    { token: 'attls-ref-value',   foreground: 'f7c948', fontStyle: 'underline' }, // gold+underline
    { token: 'attls-value',       foreground: 'ce9178' },  // orange (property value)
    { token: 'attls-brace',       foreground: '569cd6' },  // blue
    { token: 'attls-default',     foreground: 'd4d4d4' },  // light gray
  ],
};

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
    monaco.languages.register(ATTLS_LANG as any);
    monaco.languages.register(BPXPRM_LANG);
    monaco.languages.register(HLASM_LANG);
    monaco.languages.register(IEASYS_LANG);
    monaco.languages.register(JCL_LANG);
    monaco.languages.register(REXX_LANG);

    monaco.languages.setMonarchTokensProvider('attls', <any>ATTLS_HILITE);
    monaco.languages.setMonarchTokensProvider('bpxprm', <any>BPXPRM_HILITE);
    monaco.languages.setMonarchTokensProvider('hlasm', <any>HLASM_HILITE);
    monaco.languages.setMonarchTokensProvider('ieasys', <any>IEASYS_HILITE);
    monaco.languages.setMonarchTokensProvider('jcl', <any>JCL_HILITE);
    monaco.languages.setMonarchTokensProvider('rexx', <any>REXX_HILITE);

    monaco.editor.defineTheme('attls-dark', ATTLS_DARK);
    monaco.editor.defineTheme('jcl-dark', JCL_DARK);
    monaco.editor.defineTheme('rexx-dark', REXX_DARK);

    // Hover provider for AT-TLS files.
    // Priority 1: when hovering over a reference value (e.g. the name after
    //   TTLSConnectionActionRef), show the full declaration block for that item.
    // Priority 2: when hovering over a keyword, show a brief description.
    monaco.languages.registerHoverProvider('attls', {
      provideHover(model: monaco.editor.ITextModel, position: monaco.Position) {
        const lineText = model.getLineContent(position.lineNumber);

        // --- Ref-value hover ---
        const refName = getHoveredRefName(lineText, position.column);
        if (refName) {
          const allLines = model.getValue().split('\n');
          const declarations = parseAttlsDeclarations(allLines);
          const declaration = declarations.get(refName);
          if (declaration) {
            const declarationText = extractDeclarationText(allLines, declaration);
            return {
              contents: [
                { value: '**' + declaration.typeName + '** `' + declaration.itemName + '`' },
                { value: '```attls\n' + declarationText + '\n```' },
              ],
            };
          }
        }

        // --- Keyword hover ---
        const keyword = getHoveredKeyword(lineText, position.column);
        if (keyword) {
          const doc = ATTLS_KEYWORD_DOCS.get(keyword);
          if (doc) {
            return { contents: [{ value: doc }] };
          }
        }

        return null;
      },
    });

    // set monaco after all done
    this.subscription = EditorServiceInstance.subscribe((editorService) => {
      if (editorService != null) {
        if (editorService.isTestLangMode) {
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
