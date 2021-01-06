export const JCL_HILITE = {
// Set defaultToken to invalid to see what you do not tokenize yet
  defaultToken: 'default',
  ignoreCase: false,
  
  brackets: [ 
  ['(',')','jcl-delimiter'], ],
  

// Expand tokenizer via: https://microsoft.github.io/monaco-editor/monarch.html
  tokenizer: {
    root: [
      [/^\/\/\*.*$/, { token: 'jcl-comment' }], //Comment begins with //*, lasts until end of line
      [/, *$/, { token: 'jcl-delimiter', next: '@operands2' }], //Checks for end of line with a ','
      [/ *\n| *$/, { token: 'jcl-default', next: '@popall' }], //Checks for end of line without a ','
      [/,( +)[0-9]+$/, { token: 'jcl-delimiter', next: '@operands2'}], //Checks for ',' + linenumber + linebreak (continuation of statement)
      [/( *)[0-9]+$/, { token: 'jcl-default' }], //Checks for linenumber + linebreak (new JCL statement)
      [/( +)/, { token: 'whitespace' }], //Removes any previous line spaces
      [/^\/\*/, { token: 'jcl-statement', next: '@nameFirstChar' }], //Statements begin with /* ...
      [/^\/\//, { token: 'jcl-statement', next: '@nameFirstChar' }], // or //
      [/.*/, { token: 'jcl-none' }], //When a token doesn't match, the line is blue
    ],
    nameFirstChar: [
      [/[ ]/, { token: 'jcl-default', next: '@operator' }], //Name must start with capital or national symbols
      [/[A-Z|@|#|$| ]/, { token: 'jcl-default', next: '@name' }], //Name must start with capital or national symbols
      [/./, { token: 'jcl-invalid', next: '@name' }], //For everything else
    ],
    name: [
      [/[A-Z|@|#|$|0-9]{0,7}/, { token: 'jcl-default', next: '@invalidName' }], //Name must be between {0, 8} characters
      [/, *$/, { token: 'jcl-delimiter', next: '@operands2' }], //Checks for end of line with a ','
      [/ *\n| *$/, { token: 'jcl-default', next: '@popall' }], //Checks for end of line without a ','
      [/,( +)[0-9]+$/, { token: 'jcl-delimiter', next: '@operands2'}], //Checks for ',' + linenumber + linebreak (continuation of statement)
      [/( *)[0-9]+$/, { token: 'jcl-default', next: '@popall' }], //Checks for linenumber + linebreak (new JCL statement)
      [/( +)/, { token: 'whitespace', next: '@operator' }], //Spaces(s) designate when to check for operator keywords after name
      [/'.*'/, { token: 'jcl-string', next: '@strings' }],
      [/[^A-Z|@|#|$|0-9]/, { token: 'jcl-invalid' }], // Checks for invalid JCL characters in names
      [/./, { token: 'jcl-default' }]
    ],
    invalidName: [
      [/ *\n| *$/, { token: 'jcl-default', next: '@popall' }], //Checks for end of line without a ','
      [/( +)/, { token: 'jcl-invalid', next: '@operator' }], //Name must be between {0, 8} characters
      [/./, { token: 'jcl-invalid', }], //Name must be between {0, 8} characters
    ],
    operator: [
      [/, *$/, { token: 'jcl-delimiter', next: '@operands2' }], //Checks for end of line with a ','
      [/ *\n| *$/, { token: 'jcl-default', next: '@popall' }], //Checks for end of line without a ','
      [/!/, { token: 'jcl-invalid', next: '@operands' }], // Checks for invalid JCL characters
      [/[a-z]+/, { token: 'jcl-invalid', next: '@operands' }], // Checks for invalid lowercase JCL
      [/(,|&|=|\^)/, { token: 'jcl-delimiter', next: '@operands'}],
      [/'/, { token: 'jcl-string', next: '@strings' }],
      [/[()]/, '@brackets'],
      [/(IF)/, { token: 'jcl-operator', next: '@if' }], //If is special, gets its own logic
      [/(DD|CNTL|EXEC|JOB|INCLUDE|JCLLIB|OUTPUT|PROC|SCHEDULE|SET|XMIT|COMMAND) *$/, { token: 'jcl-operator', next: '@popall' }],
      [/(DD|CNTL|EXEC|JOB|INCLUDE|JCLLIB|OUTPUT|PROC|SCHEDULE|SET|XMIT|COMMAND) +/, { token: 'jcl-operator', next: '@operands' }],
      [/(ENDCNTL|EXPORT|ELSE|ENDIF|PEND|THEN) *$/, { token: 'jcl-operator', next: '@popall' }],
      [/(ENDCNTL|EXPORT|ELSE|ENDIF|PEND|THEN) +/, { token: 'jcl-operator', next: '@comments' }],
      [/[^\s\\a-z(,|&|=|\^)]+/, { token: 'jcl-default', next: '@operands'}], //Matches the rest
    ],
    if: [
      [/, *$/, { token: 'jcl-delimiter', next: '@operands2' }], //Checks for end of line with a ','
      [/ *\n| *$/, { token: 'jcl-default', next: '@popall' }], //Checks for end of line without a ','
      [/(THEN )/, { token: 'jcl-operator', next: '@comments' }],
      [/./, { token: 'jcl-variable' }],
    ],
    operands: [
      [/,( +)[0-9]+$/, { token: 'jcl-delimiter', next: '@operands2'}], //Checks for ',' + linenumber + linebreak (continuation of statement)
      [/( *)[0-9]+$/, { token: 'jcl-default', next: '@popall' }], //Checks for linenumber + linebreak (new JCL statement)
      [/, *$/, { token: 'jcl-delimiter', next: '@operands2' }], //Checks for end of line with a ','
      [/ *\n| *$/, { token: 'jcl-default', next: '@popall' }], //Checks for end of line without a ','
      [/, /, { token: 'jcl-delimiter', next: '@comments' }], //Checks for , + space (leads to comment)
      [/'/, { token: 'jcl-string', next: '@strings' }],
      [/!/, { token: 'jcl-invalid' }], // Checks for invalid JCL characters
      [/[a-z]+/, { token: 'jcl-invalid' }], // Checks for invalid lowercase JCL
      [/(,|&|=|\^)/, { token: 'jcl-delimiter' }],
      [/[()]/, '@brackets'],
      [/ /, { token: 'jcl-variable', next: '@comments' }],//Space leads to comments
      [/./, { token: 'jcl-variable' }],//For everything else
    ],
    operands2: [ //JCL has a behavior where it will accept two sets of operands before detecting comments
                 //for certain conditions, usually when statements are continued via a ','
      [/, *$/, { token: 'jcl-delimiter', next: '@operands2' }], //Checks for end of line with a ','
      [/ *\n| *$/, { token: 'jcl-default', next: '@popall' }], //Checks for end of line without a ','
      [/,( +)[0-9]+$/, { token: 'jcl-delimiter', next: '@operands2'}], //Checks for ',' + linenumber + linebreak (continuation of statement)
      [/( *)[0-9]+$/, { token: 'jcl-default', next: '@popall' }], //Checks for linenumber + linebreak (new JCL statement)
      [/, /, { token: 'jcl-delimiter', next: '@comments' }], //Checks for , + space (leads to comment)
      [/'/, { token: 'jcl-string', next: '@strings' }],
      [/!/, { token: 'jcl-invalid' }], // Checks for invalid JCL characters
      [/[a-z]+/, { token: 'jcl-invalid' }], // Checks for invalid lowercase JCL
      [/(,|&|=|\^)/, { token: 'jcl-delimiter' }],
      [/[()]/, '@brackets'],
      [/ +/, { token: 'jcl-variable', next: '@operands' }],//Space leads to next operand
      [/\//, { token: 'jcl-variable' }],
      [/^.*/, { token: 'jcl-none' }], //When a token doesn't match, the line is blue
      [/./, { token: 'jcl-variable' }],//For everything else
    ],
    comments: [
      [/.*/, { token: 'jcl-comment', next: '@popall' }],
      [/ *\n| *$/, { token: 'jcl-default', next: '@popall' }],
    ],
    strings: [ //Strings get their own category because Monaco doesn't seem to deal with pattern matching
              //over line breaks, even with multiline flags. This way, we just put strings into their own loop.
      [/.*' /, { token: 'jcl-string', next: '@comments' }], // Space after the ending (') character is a comment
      [/.*' */, { token: 'jcl-string', next: '@operands' }], // Covers all characters in string until ending (') character
      [/.*/, { token: 'jcl-string' }],
    ]
  }
};
