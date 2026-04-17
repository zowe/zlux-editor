
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
import { CEEDUMP_HILITE, CEE_MESSAGES, CEEDUMP_HOVER_DOCS, CEE_RUNOPTS } from './hiliters/ceedump';
import { HLASM_HILITE, HLASM_DIRECTIVES, HLASM_MACRO_INSTS, HLASM_INSTRUCTIONS } from './hiliters/hlasm';
import { IEASYS_HILITE } from './hiliters/ieasys';
import { JCL_HILITE } from './hiliters/jcl';
import { REXX_HILITE } from './hiliters/rexx';


const CEEDUMP_LANG = {
  id: 'ceedump',
  extensions: [],
  filenamePatterns: ['^ceedump\.'],
  aliases: ['CEEDUMP', 'ceedump'],
  mimetypes: ['application/ceedump']
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
export const CEEDUMP_DARK: Theme = {
  base: 'vs-dark',
  inherit: true,
  colors: {},
  rules: [
    // Banner and metadata
    { token: 'cee-header',        foreground: 'fffd23', fontStyle: 'bold' },          // Yellow bold
    { token: 'cee-page-info',     foreground: '888888' },                              // Gray
    // CEE message identifiers
    { token: 'cee-message-id',    foreground: 'ff8c00', fontStyle: 'bold underline' }, // Orange bold underline
    // Section headers
    { token: 'cee-section',       foreground: '50eb24', fontStyle: 'bold underline' }, // Green bold underline
    { token: 'cee-sub-section',   foreground: '50eb24', fontStyle: 'underline' },      // Green underline
    // Labels and register names
    { token: 'cee-label',         foreground: '20e5e6', fontStyle: 'underline' },      // Cyan underline
    { token: 'cee-register',      foreground: '20e5e6', fontStyle: 'bold underline' }, // Cyan bold underline
    // Hoverable inline terms (DSA, CIB, NAB, BKC, FWC, PNAB)
    { token: 'cee-term',          foreground: '20e5e6', fontStyle: 'underline' },      // Cyan underline
    // Offsets (+000000 / -0020)
    { token: 'cee-offset',        foreground: '888888' },                              // Gray
    // 32-bit hex address coloring
    { token: 'cee-mem-byte1',     foreground: '00ffff' },                              // Cyan (first byte)
    { token: 'cee-mem-lower3',    foreground: '00aaaa' },                              // Dark cyan (lower 3 bytes)
    // 64-bit hex address coloring
    { token: 'cee-mem64-byte1',   foreground: '00ff00' },                              // Bright green (high byte)
    { token: 'cee-mem64-high32',  foreground: '00aa00' },                              // Medium green (high word remainder)
    { token: 'cee-mem64-midbt',   foreground: '00ffff' },                              // Cyan (middle byte)
    { token: 'cee-mem64-lower3',  foreground: '00aaaa' },                              // Dark cyan (lower 3 bytes)
    // Miscellaneous
    { token: 'cee-wildcard',      foreground: 'ff4444' },                              // Red (inaccessible ****)
    { token: 'cee-ascii',         foreground: 'b0b0b0', fontStyle: 'italic' },         // Gray italic (EBCDIC decode)
    { token: 'cee-keyword',       foreground: 'eb2424', fontStyle: 'bold' },           // Red bold (Call, Exception)
    { token: 'cee-compile-attr',  foreground: 'a0a0ff' },                              // Light purple
    { token: 'cee-condition',     foreground: 'fdfdfd' },                              // White (condition text)
    { token: 'cee-separator',     foreground: '666666' },                              // Dark gray
    // Runtime option names in the RPTOPTS section
    { token: 'cee-runopt',        foreground: 'd4a017', fontStyle: 'bold underline' }, // Amber bold underline
  ]
};

export const HLASM_DARK: Theme = {
  base: 'vs-dark',
  inherit: true,
  colors: {},
  rules: [
    { token: 'hlasm-comment',    foreground: '20e5e6' },                              // Cyan (ISPF comment color)
    { token: 'hlasm-label',      foreground: 'fffd23', fontStyle: 'bold' },          // Yellow bold
    { token: 'hlasm-directive',  foreground: '50eb24', fontStyle: 'bold underline' }, // Green bold underline
    { token: 'hlasm-macro-inst', foreground: 'eb9b34', fontStyle: 'bold underline' }, // Orange bold underline
    { token: 'hlasm-keyword',    foreground: '50eb24', fontStyle: 'bold' },          // Green bold
    { token: 'hlasm-register',   foreground: '00ffff', fontStyle: 'underline' },     // Cyan underline
    { token: 'hlasm-string',     foreground: 'fdfdfd' },                              // White
    { token: 'hlasm-number',     foreground: 'ff8c00' },                              // Orange
    { token: 'hlasm-operator',   foreground: 'eb2424' },                              // Red
    { token: 'hlasm-variable',   foreground: 'd4a017', fontStyle: 'italic' },        // Amber italic
    { token: 'hlasm-seq',        foreground: 'a0a0ff' },                              // Light purple
    { token: 'hlasm-cont',       foreground: 'ff4444', fontStyle: 'bold' },          // Red bold
  ]
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
    const registeredIds = new Set(monaco.languages.getLanguages().map(l => l.id));
    if (!registeredIds.has(BPXPRM_LANG.id)) { monaco.languages.register(BPXPRM_LANG); }
    if (!registeredIds.has(CEEDUMP_LANG.id)) { monaco.languages.register(CEEDUMP_LANG); }
    if (!registeredIds.has(HLASM_LANG.id)) { monaco.languages.register(HLASM_LANG); }
    if (!registeredIds.has(IEASYS_LANG.id)) { monaco.languages.register(IEASYS_LANG); }
    if (!registeredIds.has(JCL_LANG.id)) { monaco.languages.register(JCL_LANG); }
    if (!registeredIds.has(REXX_LANG.id)) { monaco.languages.register(REXX_LANG); }

    monaco.languages.setMonarchTokensProvider('bpxprm', <any>BPXPRM_HILITE);
    monaco.languages.setMonarchTokensProvider('ceedump', <any>CEEDUMP_HILITE);
    monaco.languages.setMonarchTokensProvider('hlasm', <any>HLASM_HILITE);
    monaco.languages.setMonarchTokensProvider('ieasys', <any>IEASYS_HILITE);

    monaco.languages.registerHoverProvider('hlasm', {
      provideHover: (model, position) => {
        const word = model.getWordAtPosition(position);
        if (!word) { return null; }
        const token = word.word.toUpperCase();

        // Assembler directives
        if (HLASM_DIRECTIVES[token]) {
          return { contents: [{ value: HLASM_DIRECTIVES[token] }] };
        }

        // Conditional-assembly / macro instructions
        if (HLASM_MACRO_INSTS[token]) {
          return { contents: [{ value: HLASM_MACRO_INSTS[token] }] };
        }

        // Machine instructions
        if (HLASM_INSTRUCTIONS[token]) {
          return { contents: [{ value: HLASM_INSTRUCTIONS[token] }] };
        }

        // Register names R0-R15
        const regMatch = token.match(/^R([0-9]|1[0-5])$/);
        if (regMatch) {
          const num = parseInt(regMatch[1], 10);
          const regDesc: Record<number, string> = {
            0:  'Subroutine return value; also used as a branch mask in BCR.',
            1:  'Parameter list pointer on entry to a routine',
            2:  'Argument or work register',
            3:  'Argument or work register',
            4:  'Argument or base register',
            5:  'Base or work register',
            6:  'Base or work register',
            7:  'Work register',
            8:  'Work register',
            9:  'Work register',
            10: 'Work register',
            11: 'Base register for Program Unit',
            12: 'Base register for Load Module (common anchor area).',
            13: 'Save area / DSA pointer',
            14: 'Return address',
            15: 'Entry point register; also the return code',
          };
          return {
            contents: [
              { value: `**R${num} -- General Purpose Register ${num}**` },
              { value: regDesc[num] || 'General purpose register.' }
            ]
          };
        }

        return null;
      }
    });

    monaco.editor.defineTheme('hlasm-dark', HLASM_DARK);
    monaco.languages.setMonarchTokensProvider('jcl', <any>JCL_HILITE);
    monaco.languages.setMonarchTokensProvider('rexx', <any>REXX_HILITE);

    monaco.languages.registerHoverProvider('ceedump', {
      provideHover: (model, position) => {
        const word = model.getWordAtPosition(position);
        if (!word) { return null; }
        const token = word.word;
        const line = model.getLineContent(position.lineNumber);

        // Check if hovering over a CEE message ID
        const ceeMessageMatch = line.match(new RegExp(`\\b(CEE[0-9]+[ISCEW])\\b`));
        if (ceeMessageMatch) {
          const msgId = ceeMessageMatch[1];
          const description = CEE_MESSAGES[msgId];
          if (description) {
            return {
              contents: [
                { value: `**${msgId}**` },
                { value: description }
              ]
            };
          } else if (token.match(/^CEE[0-9]+[ISCEW]$/)) {
            const severity = token.slice(-1);
            const severityNames: Record<string, string> = {
              I: 'Informational', S: 'Severe error', C: 'Critical/Catastrophic', E: 'Error', W: 'Warning'
            };
            return {
              contents: [
                { value: `**${token}** -- Language Environment message` },
                { value: `Severity: **${severityNames[severity] || severity}**\n\nSee the IBM z/OS Language Environment Runtime Messages documentation for the full description.` }
              ]
            };
          }
        }

        // Check for single-word hovered tokens against hover doc map
        if (CEEDUMP_HOVER_DOCS[token]) {
          return {
            contents: [{ value: CEEDUMP_HOVER_DOCS[token] }]
          };
        }

        // Check for runtime option names
        if (CEE_RUNOPTS[token]) {
          return {
            contents: [{ value: CEE_RUNOPTS[token] }]
          };
        }

        // Multi-word phrase lookups: check context window around cursor
        for (const phrase of Object.keys(CEEDUMP_HOVER_DOCS)) {
          if (phrase.includes(' ') && line.includes(phrase)) {
            return {
              contents: [{ value: CEEDUMP_HOVER_DOCS[phrase] }]
            };
          }
        }

        // Register name hover
        const gprMatch = token.match(/^GPR([0-9]+)$/);
        if (gprMatch) {
          const num = parseInt(gprMatch[1], 10);
          const gprDescriptions: Record<number, string> = {
            0:  'Subroutine return value or first function argument. Also used as an indirect branch target.',
            1:  'First parameter / parameter list pointer. Points to the parameter list for calls.',
            2:  'Second function argument or work register.',
            3:  'Third function argument or work register.',
            4:  'Fourth function argument or base register for the routine.',
            5:  'Base register or work register.',
            6:  'Base register or work register.',
            7:  'Base register or work register.',
            8:  'Work register.',
            9:  'Work register / address of the DSA (stack frame) in some calling conventions.',
            10: 'Work register.',
            11: 'Base register for the Program Unit. Points to the module entry point.',
            12: 'Base register for the Load Module. Points to the common anchor area (CAA).',
            13: 'DSA pointer -- contains the address of the current routine\'s Dynamic Storage Area (stack frame).',
            14: 'Return address -- contains the address to which the routine will return.',
            15: 'Entry point register -- on entry, contains the address of the routine that was called.',
          };
          const desc = gprDescriptions[num] !== undefined
            ? gprDescriptions[num]
            : 'General purpose register used for computation or addressing.';
          return {
            contents: [
              { value: `**GPR${num} -- General Purpose Register ${num}**` },
              { value: desc }
            ]
          };
        }

        const fprMatch = token.match(/^FPR([0-9]+)$/);
        if (fprMatch) {
          return {
            contents: [
              { value: `**FPR${fprMatch[1]} -- Floating Point Register ${fprMatch[1]}**` },
              { value: 'One of the z/Architecture floating-point registers (FPR0, FPR2, FPR4, FPR6 in the basic set plus 8 extended registers). Used for IEEE and IBM HFP floating-point computations.' }
            ]
          };
        }

        const vrMatch = token.match(/^VR([0-9]+)$/);
        if (vrMatch) {
          return {
            contents: [
              { value: `**VR${vrMatch[1]} -- Vector Register ${vrMatch[1]}**` },
              { value: '128-bit register in the z/Architecture Vector Facility. Used by SIMD vector instructions for integer, floating-point, and string operations.' }
            ]
          };
        }

        return null;
      }
    });

    monaco.editor.defineTheme('ceedump-dark', CEEDUMP_DARK);
    monaco.editor.defineTheme('jcl-dark', JCL_DARK);
    monaco.editor.defineTheme('rexx-dark', REXX_DARK);

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
