
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
import {
  ATTLS_HILITE,
  ATTLS_KEYWORD_DOCS,
  parseAttlsDeclarations,
  extractDeclarationText,
  getHoveredKeyword,
  getHoveredRefName,
  getItemNameAtPosition,
  findAllAttlsReferences,
  computeAttlsDiagnostics,
  getDeclarationTypeForRefKey,
} from './hiliters/attls';


// contentDetect: true opts this language in for content-based detection in
// getRecommendedHighlightingModesForBuffer (multiline firstLine matching).
const ATTLS_LANG = {
  id: 'attls',
  firstLine: '^TTLSRule\\b',
  filenamePatterns: [],
  aliases: ['ATTLS', 'AT-TLS', 'attls'],
  mimetypes: ['application/attls'],
  contentDetect: true
};

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
  ]
};

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
    },
    {
      attribute: 'clickLinksFilePath',
      type: ConfigItemType.boolean,
      default: true
    },
    {
      attribute: 'clickLinksDataset',
      type: ConfigItemType.boolean,
      default: true
    },
    {
      attribute: 'clickLinksUrl',
      type: ConfigItemType.boolean,
      default: true
    }
];


export class MonacoConfig {
  subscription: Subscription = null;

  onLoad() {
    let self = this;
    // This step only happens once per editor load, not once per file load. It happens before language menu is generated
    const registeredIds = new Set(monaco.languages.getLanguages().map(l => l.id));
    if (!registeredIds.has(ATTLS_LANG.id)) { monaco.languages.register(ATTLS_LANG); }
    if (!registeredIds.has(BPXPRM_LANG.id)) { monaco.languages.register(BPXPRM_LANG); }
    if (!registeredIds.has(CEEDUMP_LANG.id)) { monaco.languages.register(CEEDUMP_LANG); }
    if (!registeredIds.has(HLASM_LANG.id)) { monaco.languages.register(HLASM_LANG); }
    if (!registeredIds.has(IEASYS_LANG.id)) { monaco.languages.register(IEASYS_LANG); }
    if (!registeredIds.has(JCL_LANG.id)) { monaco.languages.register(JCL_LANG); }
    if (!registeredIds.has(REXX_LANG.id)) { monaco.languages.register(REXX_LANG); }

    monaco.languages.setMonarchTokensProvider('attls', <any>ATTLS_HILITE);
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

    monaco.editor.defineTheme('attls-dark', ATTLS_DARK);
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
                { value: '*Ctrl+Click on the reference name to jump to this declaration.*' },
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

    // Definition provider: enables Ctrl+Click and F12 (Go to Definition) on
    // AT-TLS reference values, navigating directly to the referenced item's
    // declaration line within the same model.
    monaco.languages.registerDefinitionProvider('attls', {
      provideDefinition(
        model: monaco.editor.ITextModel,
        position: monaco.Position
      ): monaco.languages.Definition | null {
        const lineText = model.getLineContent(position.lineNumber);
        const refName = getHoveredRefName(lineText, position.column);
        if (!refName) return null;

        const allLines = model.getValue().split('\n');
        const declarations = parseAttlsDeclarations(allLines);
        const declaration = declarations.get(refName);
        if (!declaration) return null;

        return {
          uri: model.uri,
          range: new monaco.Range(
            declaration.startLine, 1, declaration.startLine, 1
          ),
        };
      },
    });

    // Reference provider: enables Shift+F12 (Find All References) and
    // right-click → Peek References on both declaration names and reference
    // values within the same AT-TLS policy file.
    monaco.languages.registerReferenceProvider('attls', {
      provideReferences(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        context: monaco.languages.ReferenceContext
      ): monaco.languages.Location[] {
        const lineText = model.getLineContent(position.lineNumber);
        const itemName = getItemNameAtPosition(lineText, position.column);
        if (!itemName) return [];

        const allLines = model.getValue().split('\n');
        const refs = findAllAttlsReferences(allLines, itemName);

        return refs
          .filter(ref => context.includeDeclaration || !ref.isDeclaration)
          .map(ref => ({
            uri: model.uri,
            range: new monaco.Range(
              ref.line + 1,                      // 0-based -> 1-based
              ref.col + 1,                       // 0-based -> 1-based
              ref.line + 1,
              ref.col + itemName.length + 1      // exclusive end column (1-based)
            ),
          }));
      },
    });

    // Document symbol provider: feeds the Outline panel (breadcrumbs /
    // Ctrl+Shift+O equivalent in the zlux-editor command palette).
    // Produces a two-level tree — one container per declaration type whose
    // children are the named items of that type.
    const ATTLS_SYMBOL_KIND_MAP: Record<string, monaco.languages.SymbolKind> = {
      TTLSRule:                     monaco.languages.SymbolKind.Event,
      TTLSGroupAction:              monaco.languages.SymbolKind.Function,
      TTLSEnvironmentAction:        monaco.languages.SymbolKind.Function,
      TTLSConnectionAction:         monaco.languages.SymbolKind.Function,
      TTLSGroupAdvancedParms:       monaco.languages.SymbolKind.Property,
      TTLSEnvironmentAdvancedParms: monaco.languages.SymbolKind.Property,
      TTLSConnectionAdvancedParms:  monaco.languages.SymbolKind.Property,
      TTLSCipherParms:              monaco.languages.SymbolKind.Property,
      TTLSKeyringParms:             monaco.languages.SymbolKind.Property,
      TTLSSignatureParms:           monaco.languages.SymbolKind.Property,
    };

    monaco.languages.registerDocumentSymbolProvider('attls', {
      provideDocumentSymbols(
        model: monaco.editor.ITextModel
      ): monaco.languages.DocumentSymbol[] {
        const allLines = model.getValue().split('\n');
        const declarations = parseAttlsDeclarations(allLines);

        // Group leaf symbols by typeName, preserving document order
        const byType = new Map<
          string,
          { kind: monaco.languages.SymbolKind; children: monaco.languages.DocumentSymbol[] }
        >();

        declarations.forEach(decl => {
          const lineText   = model.getLineContent(decl.startLine);
          const nameCol    = lineText.indexOf(decl.itemName, 0) + 1; // 1-based
          const nameRange  = new monaco.Range(decl.startLine, nameCol, decl.startLine, nameCol + decl.itemName.length);
          const blockRange = new monaco.Range(decl.startLine, 1, decl.endLine, model.getLineContent(decl.endLine).length + 1);
          const kind       = ATTLS_SYMBOL_KIND_MAP[decl.typeName] ?? monaco.languages.SymbolKind.Module;

          const leaf: monaco.languages.DocumentSymbol = {
            name:           decl.itemName,
            detail:         decl.typeName,
            kind,
            range:          blockRange,
            selectionRange: nameRange,
            tags:           [],
            children:       [],
          };

          if (!byType.has(decl.typeName)) {
            byType.set(decl.typeName, { kind, children: [] });
          }
          byType.get(decl.typeName)!.children.push(leaf);
        });

        // Build one container symbol per type
        const result: monaco.languages.DocumentSymbol[] = [];
        byType.forEach(({ kind, children }, typeName) => {
          const first = children[0];
          const last  = children[children.length - 1];
          const containerRange = new monaco.Range(
            first.range.startLineNumber, 1,
            last.range.endLineNumber, last.range.endColumn
          );
          const container: monaco.languages.DocumentSymbol = {
            name:           typeName,
            detail:         `${children.length} declaration${children.length === 1 ? '' : 's'}`,
            kind,
            range:          containerRange,
            selectionRange: first.selectionRange,
            tags:           [],
            children,
          };
          result.push(container);
        });

        return result;
      },
    });

    // Completion provider: two-tier
    // Tier 1 — when the cursor is after a *Ref key and space, offer every
    //   declaration of the matching type as a completion item (with the full
    //   declaration block shown as inline documentation).
    // Tier 2 — at column 0 (no leading whitespace), offer all top-level
    //   declaration keywords as snippets that scaffold the  Name\n{\n}\n  form.
    const ATTLS_DECLARATION_SNIPPET_TYPES = [
      'TTLSRule', 'TTLSGroupAction', 'TTLSEnvironmentAction', 'TTLSConnectionAction',
      'TTLSGroupAdvancedParms', 'TTLSEnvironmentAdvancedParms', 'TTLSConnectionAdvancedParms',
      'TTLSCipherParms', 'TTLSKeyringParms', 'TTLSSignatureParms', 'PortRange',
    ];

    monaco.languages.registerCompletionItemProvider('attls', {
      triggerCharacters: [' '],
      provideCompletionItems(
        model: monaco.editor.ITextModel,
        position: monaco.Position
      ): monaco.languages.CompletionList {
        const lineText  = model.getLineContent(position.lineNumber);
        const textBefore = lineText.substring(0, position.column - 1); // text left of cursor
        const allLines  = model.getValue().split('\n');

        // ── Tier 1: Ref value completions ───────────────────────────────
        const refKeyMatch = /^(\s+)([\w.]+Ref)[ \t]+(\w*)$/.exec(textBefore);
        if (refKeyMatch) {
          const targetType = getDeclarationTypeForRefKey(refKeyMatch[2]);
          if (targetType) {
            const declarations = parseAttlsDeclarations(allLines);
            const items: monaco.languages.CompletionItem[] = [];
            declarations.forEach(decl => {
              if (decl.typeName !== targetType) return;
              items.push({
                label:            decl.itemName,
                kind:             monaco.languages.CompletionItemKind.Reference,
                detail:           decl.typeName,
                documentation:    { value: '```attls\n' + extractDeclarationText(allLines, decl) + '\n```' },
                insertText:       decl.itemName,
                range:            new monaco.Range(
                                    position.lineNumber, position.column - refKeyMatch[3].length,
                                    position.lineNumber, position.column
                                  ),
              });
            });
            if (items.length > 0) return { suggestions: items };
          }
        }

        // ── Tier 2: Declaration keyword snippets at line start ────────────
        if (/^\w*$/.test(textBefore)) {
          const suggestions: monaco.languages.CompletionItem[] = ATTLS_DECLARATION_SNIPPET_TYPES.map(typeName => ({
            label:         typeName,
            kind:          monaco.languages.CompletionItemKind.Class,
            detail:        'AT-TLS declaration',
            documentation: ATTLS_KEYWORD_DOCS.has(typeName)
              ? { value: ATTLS_KEYWORD_DOCS.get(typeName)! }
              : undefined,
            insertText:    `${typeName}\t\${1:name}\n{\n\t$0\n}\n`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range:         new monaco.Range(
                             position.lineNumber, 1,
                             position.lineNumber, position.column
                           ),
            sortText:      '0_' + typeName,
          }));
          return { suggestions };
        }

        return { suggestions: [] };
      },
    });

    // Rename provider: F2 on any declaration name or *Ref value renames every
    // occurrence atomically.  prepareRename validates the position and returns
    // the exact token range so the input box is pre-filled with just the name.
    monaco.languages.registerRenameProvider('attls', {
      provideRenameEdits(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        newName: string
      ): monaco.languages.WorkspaceEdit | null {
        const lineText = model.getLineContent(position.lineNumber);
        const itemName = getItemNameAtPosition(lineText, position.column);
        if (!itemName) return null;

        const allLines = model.getValue().split('\n');
        const refs = findAllAttlsReferences(allLines, itemName);
        if (refs.length === 0) return null;

        const edits: monaco.languages.IWorkspaceTextEdit[] = refs.map(ref => ({
          resource: model.uri,
          versionId: model.getVersionId(),
          textEdit: {
            range: new monaco.Range(
              ref.line + 1,
              ref.col + 1,
              ref.line + 1,
              ref.col + itemName.length + 1
            ),
            text: newName,
          },
        }));
        return { edits };
      },

      resolveRenameLocation(
        model: monaco.editor.ITextModel,
        position: monaco.Position
      ): monaco.languages.RenameLocation | null {
        const lineText = model.getLineContent(position.lineNumber);
        const itemName = getItemNameAtPosition(lineText, position.column);
        if (!itemName) return null;
        // Find where the token starts on this line (search near the cursor)
        const col0 = lineText.indexOf(itemName, Math.max(0, position.column - itemName.length - 1));
        return {
          range: new monaco.Range(position.lineNumber, col0 + 1, position.lineNumber, col0 + itemName.length + 1),
          text: itemName,
        };
      },
    });

    // ── AT-TLS diagnostics (squiggles) ────────────────────────────────────
    // Monaco has no provider API for diagnostics; instead we call
    // monaco.editor.setModelMarkers() whenever a model's content changes.
    // We listen for newly-created models and for language changes (the model
    // starts as plaintext and is promoted to 'attls' after content detection).

    const ATTLS_MARKER_OWNER = 'attls-diagnostics';
    const pendingAttlsRefresh = new Map<string, ReturnType<typeof setTimeout>>();

    function runAttlsDiagnostics(model: monaco.editor.ITextModel): void {
      const raw = computeAttlsDiagnostics(model.getValue().split('\n'));
      const markers: monaco.editor.IMarkerData[] = raw.map(d => ({
        severity: d.severity === 'error'
          ? monaco.MarkerSeverity.Error
          : monaco.MarkerSeverity.Warning,
        startLineNumber: d.line + 1,
        startColumn:     d.colStart + 1,
        endLineNumber:   d.line + 1,
        endColumn:       d.colEnd + 1,
        message:         d.message,
      }));
      monaco.editor.setModelMarkers(model, ATTLS_MARKER_OWNER, markers);
    }

    function scheduleAttlsDiagnostics(model: monaco.editor.ITextModel): void {
      const key = model.uri.toString();
      const existing = pendingAttlsRefresh.get(key);
      if (existing !== undefined) clearTimeout(existing);
      pendingAttlsRefresh.set(key, setTimeout(() => {
        pendingAttlsRefresh.delete(key);
        if (!model.isDisposed()) runAttlsDiagnostics(model);
      }, 500));
    }

    function attachAttlsDiagnosticsToModel(model: monaco.editor.ITextModel): void {
      if (model.getLanguageId() === 'attls') runAttlsDiagnostics(model);

      model.onDidChangeLanguage(e => {
        if (e.newLanguage === 'attls') {
          runAttlsDiagnostics(model);
        } else if (e.oldLanguage === 'attls') {
          // Language switched away — clear the markers
          monaco.editor.setModelMarkers(model, ATTLS_MARKER_OWNER, []);
        }
      });

      model.onDidChangeContent(() => {
        if (model.getLanguageId() === 'attls') scheduleAttlsDiagnostics(model);
      });

      model.onWillDispose(() => {
        const key = model.uri.toString();
        const existing = pendingAttlsRefresh.get(key);
        if (existing !== undefined) {
          clearTimeout(existing);
          pendingAttlsRefresh.delete(key);
        }
      });
    }

    // Attach to all models already present at load time
    for (const model of monaco.editor.getModels()) {
      attachAttlsDiagnosticsToModel(model);
    }

    // Attach to every model created after load
    monaco.editor.onDidCreateModel(model => {
      attachAttlsDiagnosticsToModel(model);
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
