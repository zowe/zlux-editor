export const REXX_HILITE = {
  // Set defaultToken to 'invalid' to see what you do not tokenize yet/
  //or 'default' otherwise
  defaultToken: 'default',
  ignoreCase: true,

  //open, close, color
  /*
  "brackets": [
    ["{", "}"], ["[", "]"], ["(", ")"]
  ],
  */
  
  "autoClosingPairs": [
    ["{", "}"], ["[", "]"], ["(", ")"], ["\"", "\""], ["'", "'"]
  ],

  "surroundingPairs": [
    ["{", "}"], ["[", "]"], ["(", ")"], ["\"", "\""], ["'", "'"]
  ],

  functions: [
    'abbrev', 'abs', 'address', 'arg', 'bitand', 'bitor', 'bitxor', 'b2x', 'center',
    'centre', 'compare', 'condition', 'copies', 'c2d', 'c2x', 'datatype', 'date',
    'dbcs', 'delstr', 'delword', 'digits', 'd2c', 'd2x', 'errortext', 'externals',
    'find', 'form', 'format', 'fuzz', 'getmsg', 'index', 'insert', 'justify',
    'lastpos', 'left', 'length', 'linesize', 'listdsi', 'max', 'min', 'msg',
    'mvsvar', 'outtrap', 'overlay', 'pos', 'prompt', 'queued', 'random', 'reverse',
    'right', 'setlang', 'sign', 'sourceline', 'space', 'storage', 'strip', 'substr',
    'subword', 'symbol', 'syscpus', 'sysdsn', 'sysvar', 'time', 'trace', 'translate',
    'trunc', 'userid', 'value', 'verify', 'word', 'wordindex', 'wordlength', 'wordpos',
    'words', 'xrange', 'x2b', 'x2c', 'x2d'
  ],

  
  keywords: [
    'address',
    'by',
    'call',
    'do',
    'else',
    'end',
    'exit',
    'expose',
    'for',
    'forever',
    'if',
    'iterate',
    'interpret',
    'leave',
    'nop',
    'numeric',
    'otherwise',
    'parse',
    'pull',
    'push',
    'procedure',
    'return',
    'say',
    'select',
    'then',
    'to',
    'translate',
    'until',
    'when',
    'while',

    
//    'do', 'forever', 'while', 'until', 'to', 'by', 'for', 'end', 'exit', 'if', 'then', 'else', 'iterate', 'leave', 'nop', 'return', 'select', 'when', 'otherwise'
    //|call(\s+(off|on)\s+(error|failure(\s+name)?|halt))?|signal(\s+(off|on)\s+(error|failure(\s+name)?|halt|novalue|syntax))|address\s+\w+|arg|drop|interpret|numeric\s+(digits|form(\s+(scientific|engineering|value))?|fuzz)|options|parse(\s+upper)?\s+(external|numeric|source|value|var|version)?|with|procedure(\s+expose)?|pull|push|queue|say|trace\s+\w+|upper)\b(?!\.)</string>
  ],
  
  operators: [
    '+', '-', '*', '/', '%', '//', '**',

    '=', '>', '<', '<<', '>>', '<<=', '>>=',
    '\\=', '¬=', '/=', '\\<', '¬<', '\\>', '¬>',
    '\\==', '¬==', '/==', '\\<<', '¬<<', '\\>>', '¬>>',
    '==', '<=', '>=', 

    '&', '|', '&&', '\\', '¬',

    '<>'
  ],

  // we include these common regular expressions
  symbols:  /[=><&|+\-*\/\%]+/,

//no string escapes in rexx
  // C# style strings
//  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

  
  tokenizer: {
    root: [
      //procedure
      [/^[ \t]*[A-Za-z0-9]+\:/, {token: 'constructor'}],

      [/([A-Za-z0-9.]+)(\()/, [{ cases: { '@functions': 'builtin-fcall', '@default': 'fcall'}}, '@brackets']],

      [/(call)(\s+[A-Za-z0-9]+)/, ['keyword', { cases: { '@functions': 'builtin-fcall', '@default': 'fcall'}}]],
      
      // identifiers and keywords
      [/[a-z_$][\w$]*/, { cases: { '@keywords': 'keyword' } }],

      // whitespace
      [/[ \t\r\n]+/, ''],

      [/\/\*/, 'comment', '@comment' ],

      // delimiters and operators
      [/[{}()\[\]]/, '@brackets'],

      // numbers
      [/[0-9]+(\.)?[0-9]*/, 'number'],
         //(?i:e[-+]?[0-9]+)?|[0-9]*(\.)?[0-9]+)(?i:e[-+]?[0-9]+)?\b/, 'number'],
//      [/([0-9]+(\.)?[0-9]*(?i:e[-+]?[0-9]+)?|[0-9]*(\.)?[0-9]+)(?i:e[-+]?[0-9]+)?\b/, 'number'],
      //[/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
      //[/0[xX][0-9a-fA-F]+/, 'number.hex'],
//      [/\d+/, 'number'],

      [/@symbols/, { cases: { '@operators': 'operator' } } ],

      // delimiter: after number because of .\d floats
      [/[;,.]/, 'delimiter'],

      
      // strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'], // non-teminated string
			[/'([^'\\]|\\.)*$/, 'string.invalid'], // non-teminated string
			[/"/, 'string', '@doublestring'],
			[/'/, 'string', '@singlestring'],
    ],

    comment: [
      [/[^\/*]+/, 'comment' ],
      [/\/\*/,    'comment', '@push' ],    // nested comment
      ["\\*/",    'comment', '@pop'  ],
      [/[\/*]/,   'comment' ]
    ],
      
//rexx has no string escapes
    singlestring: [
      [/[^\\']+/,  'string'],
			[/'/, 'string', '@pop']
    ],
    doublestring: [
      [/[^\\"]+/,  'string'],
			[/"/, 'string', '@pop']
    ],
  },
};
