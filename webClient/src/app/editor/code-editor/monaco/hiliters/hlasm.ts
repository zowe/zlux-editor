export const HLASM_HILITE = {
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
