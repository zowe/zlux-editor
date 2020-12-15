export const REXX_HILITE = {
  // Set defaultToken to 'invalid' to see what you do not tokenize yet/
  //or 'default' otherwise
  defaultToken: 'default',
  ignoreCase: true,

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

/*******************
  Unused due to having other pattern matches to do the same in the root scope
*******************

  "brackets": [
    ["{", "}"], ["[", "]"], ["(", ")"]
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

*/
  
  operators: [
    '+', '-', '*', '/', '%', '//', '**',

    '=', '>', '<', '<<', '>>', '<<=', '>>=',
    '\\=', '¬=', '/=', '\\<', '¬<', '\\>', '¬>',
    '\\==', '¬==', '/==', '\\<<', '¬<<', '\\>>', '¬>>',
    '==', '<=', '>=', 

    '&', '|', '&&', '\\', '¬',

    '<>'
  ],

  // symbols to see if they match with the operators above
  symbols:  /[=><&|+\-*\/\%¬\\]+/,
  
  tokenizer: {
    root: [
      [/\/\*/, 'comment', '@comment' ],
      
      //constants
      [/(['"])[01 ]+\1(b)/, {token: 'constant.rexx'}],
      [/(['"])[0-9a-fA-F ]+\1(x)/, {token: 'constant.rexx'}],

      // strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'], // non-teminated string
			[/'([^'\\]|\\.)*$/, 'string.invalid'], // non-teminated string
			[/"/, 'string', '@doublestring'],
			[/'/, 'string', '@singlestring'],

      //procedure
      //entity.name.function.rexx
      [/\b[A-Za-z@#$!?_][A-Za-z@#$!?_0-9]*:/, {token: 'constructor'}],

      // numbers
      [/([0-9]+(\.)?[0-9]*(e[-+]?[0-9]+)?|[0-9]*(\.)?[0-9]+)(e[-+]?[0-9]+)?\b/, 'number'],

      //other constants
//disabled because the coloring was overbearing
//      [/[0-9\.][A-Za-z0-9@#$¢.!?_]*/, {token: 'constant.other.rexx'}],

      //operators
//disabled because theoperator section above root is used instead
//      [/([\+-/*%&amp;|()¬\\=&lt;&gt;])/, {token: 'operators.rexx'}],

      //call function calls
      [/(call)(\s+[A-Za-z@#$!?_0-9]+)/, ['keyword', { cases: { '@functions': 'builtin-fcall', '@default': 'fcall'}}]],

      //keywords
      [/\b(do|forever|while|until|to|by|for|end|exit|if|then|else|iterate|leave|nop|return|select|when|otherwise|call(\s+(off|on)\s+(error|failure(\s+name)?|halt))?|signal(\s+(off|on)\s+(error|failure(\s+name)?|halt|novalue|syntax))|address\s+|arg|drop|interpret|numeric\s+(digits|form(\s+(scientific|engineering|value))?|fuzz)|options|parse(\s+upper)?\s+(external|numeric|source|value|var|version)?|with|procedure(\s+expose)?|pull|push|queue|say|trace\s+|upper)\b(?!\.)/, {token: 'keyword'}],

      //non-call function calls
      [/\b[A-Za-z@#$!?_0-9]+(?=\()/, { cases: { '@functions': 'builtin-fcall', '@default': 'fcall'}}],

      //variables
//disabled because the coloring was overbearing
//      [/\b[A-Za-z@#$¢!?_][A-Za-z0-9@#$¢.!?_]*/, {token: 'variable.name'}],

      // delimiters and operators
      [/[{}()\[\]]/, '@brackets'],

      //math symbols
      [/@symbols/, { cases: { '@operators': 'operator' } } ],

      // delimiter: after number because of .\d floats
      [/[;,.]/, 'delimiter'],


//------------------------
//Section below is made redundant by code above inspired by other open source libraries
//------------------------

//procedure
//      [/^[ \t]*[A-Za-z0-9]+\:/, {token: 'constructor'}],

//function calls
//      [/([A-Za-z0-9.]+)(\()/, [{ cases: { '@functions': 'builtin-fcall', '@default': 'fcall'}}, '@brackets']],
//      [/(call)(\s+[A-Za-z0-9]+)/, ['keyword', { cases: { '@functions': 'builtin-fcall', '@default': 'fcall'}}]],
      
// identifiers and keywords
//      [/[a-z_$][\w$]*/, { cases: { '@keywords': 'keyword' } }],

// whitespace
[/[ \t\r\n]+/, ''],

//      [/\/\*/, 'comment', '@comment' ],
      
// strings
//      [/"([^"\\]|\\.)*$/, 'string.invalid'], // non-teminated string
//			[/'([^'\\]|\\.)*$/, 'string.invalid'], // non-teminated string
//			[/"/, 'string', '@doublestring'],
//			[/'/, 'string', '@singlestring'],
//------------------------
//end of unused section
//------------------------
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
