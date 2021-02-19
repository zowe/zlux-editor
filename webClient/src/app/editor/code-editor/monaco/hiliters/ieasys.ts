export const IEASYS_HILITE = {
  // Set defaultToken to invalid to see what you do not tokenize yet
  defaultToken: 'invalid',
  whitespace: /[ \t]+/,
  symbols: /[=><!~?:&|+\-*\/\^%]+/,
  comment: /( (.)*$)/,

  // The main tokenizer for our languages
  tokenizer: {
    root: [
      [/[A-Z0-9]+=/, { token: 'key', next: '@values', log: 'key $0' }],
      [/^ ?[A-Z0-9]+=/, { token: 'key', next: '@values', log: 'key $0' }],
    ],
    values: [
      [/[0-9]+/, { token: 'value.number', next: 'key', log: 'value.number $0' }],
      [/&?[A-Z0-9_\/\.]+(\(\-?[0-9]+:\-?[0-9]+\))?[A-Z]*(?=,)/, { token: 'value.sysvalue', next: 'key', log: 'next key sysvalue begin $0' }],
      [/&?[A-Z0-9_\/\.]+(\(\-?[0-9]+:\-?[0-9]+\))?[A-Z]*(?!=,)/, { token: 'value.sysvalue', next: 'comment', log: 'next comment sysvalue begin $0' }],
      [/\(/, { token: 'value', bracket: '@open', next: 'brackvalue', log: 'open bracket' }],
    ],
    brackvalue: [
      [/[0-9]+,/, { token: 'value.number', next: 'brackvalue', log: 'value.number $0' }],
      [/&?[A-Z0-9_\/]+(\(\-?[0-9]+:\-?[0-9]+\))?(\.)?([A-Z]*(?=))/, { token: 'value.sysvalue', next: 'brackvalue', log: 'brakcvalue begin $0' }],
      [/&?[A-Z0-9_\/]+(\(\-?[0-9]+:\-?[0-9]+\))?(\.)?[A-Z]*,/, { token: 'value.sysvalue', next: 'brackvalue', log: 'brackvalue begin $0' }],
      [/\)/, { token: 'value', log: 'bracket close', bracket: '@close', next: 'key' }],
    ],
    key: [
      [/(,)?[A-Z0-9]+=/, { token: 'key', next: '@values', log: 'key $0' }],
      [/^ ?[A-Z0-9]+=/, { token: 'key', next: '@values', log: 'key $0' }],
      [/(, ).*$/, { token: 'comment.singleline', log: 'comment $0' }],
      [/,$/, 'value', 'key'],
    ],
    comment: [
      [/.*$/, 'comment'],
    ],
  },
};


