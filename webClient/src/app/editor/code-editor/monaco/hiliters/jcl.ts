const jclDebug = '';      //Null, undefined or empty string for production environment

const JCL_KEYWORDS = '(CNTL|DD|EXEC|EXPORT|JOB|INCLUDE|JCLLIB|OUTPUT|PROC|SCHEDULE|SET|XMIT|COMMAND|JOBGROUP|\
GJOB|JOBSET|SJOB|ENDSET|AFTER|BEFORE|CONCURRENT|ENDGROUP)';
const JCL_KEYWORDS_SPECIAL = '(ENDCNTL|EXPORT|ELSE|ENDIF|PEND|THEN)';

export const JCL_HILITE = {
// Set defaultToken to invalid to see what you do not tokenize yet
  defaultToken: 'default',
  ignoreCase: false,
  
  brackets: [ 
  ['(',')','jcl-delimiter'], ],

// Expand tokenizer via: https://microsoft.github.io/monaco-editor/monarch.html
// Logging for debugging: 
//    o [$S0] - displays the state
//    o <nnn> - which hilite style is used
//    o -> nnn - which state is next or '---' for none (= use the current state again)
//    o '$0' - shows the regex match
  tokenizer: {
    root: [
      [/^\/\/\*.*$/, {token: 'jcl-comment', log: jclDebug && '[$S0] <comment> -> --- \'$0\''} ], //Comment begins with //*, lasts until end of line
      [/, *$/, { token: 'jcl-delimiter', next: '@operands2', log: jclDebug && '[$S0] <delimiter> -> operands2 \'$0\'' }], //Checks for end of line with a ','
      [/ *\n| *$/, { token: 'jcl-default', next: '@popall', log: jclDebug && '[$S0] <default> -> popall \'$0\'' }], //Checks for end of line without a ','
      [/,( +)[0-9]+$/, { token: 'jcl-delimiter', next: '@operands2', log: jclDebug && '[$S0] <delimiter> -> operands2 \'$0\'' }], //Checks for ',' + linenumber + linebreak (continuation of statement)
      [/( *)[0-9]+$/, { token: 'jcl-default', log: jclDebug && '[$S0] <default> -> --- \'$0\'' }], //Checks for linenumber + linebreak (new JCL statement)
      [/( +)/, { token: 'whitespace', log: jclDebug && '[$S0] <whitespace> ->  --- \'$0\'' }], //Removes any previous line spaces
      [/^\/\*[ ]*$/, { token: 'jcl-statement', log: jclDebug && '[$S0] <statement> -> ---' }],  //Starts with /* followed by end or spaces and end
      [/^\/\*[ ]/, { token: 'jcl-statement', next: '@comments', log: jclDebug && '[$S0] <statement> -> comments \'$0\'' }], //Statements begin with /*space ...
      [/^\/\*/, { token: 'jcl-statement', next: '@nameFirstChar', log: jclDebug && '[$S0] <statement> -> nameFirstChar \'$0\'' }], //Statements begin with /* ...
      [/^\/\//, { token: 'jcl-statement', next: '@nameFirstChar', log: jclDebug && '[$S0] <statement> -> nameFirstChar \'$0\'' }], // or //
      [/.*/, { token: 'jcl-none', log: jclDebug && '[$S0] <none> -> --- \'$0\'' }], //When a token doesn't match, the line is blue
    ],
    nameFirstChar: [
      [/[ ]/, { token: 'jcl-default', next: '@operator', log: jclDebug && '[$S0] <default> -> operator \'$0\'' }], //Name must start with capital or national symbols
      [/[A-Z|@|#|$| ]/, { token: 'jcl-default', next: '@name', log: jclDebug && '[$S0] <default> -> name \'$0\'' }], //Name must start with capital or national symbols (space is for 1 letter label)
      [/./, { token: 'jcl-invalid', next: '@name', log: jclDebug && '[$S0] <invalid> -> name \'$0\'' }], //For everything else
    ],
    name: [ 
      [/[A-Z|@|#|$|\.|0-9]{0,16}/, { token: 'jcl-default', next: '@invalidName', log: jclDebug && '[$S0] <default> -> invalidName \'$0\'' }], //Name must be between {0, 16} characters
      [/, *$/, { token: 'jcl-delimiter', next: '@operands2', log: jclDebug && '[$S0] <delimiter> -> operands2 \'$0\'' }], //Checks for end of line with a ','
      [/ *\n| *$/, { token: 'jcl-default', next: '@popall', log: jclDebug && '[$S0] <default> -> popall \'$0\'' }], //Checks for end of line without a ','
      [/,( +)[0-9]+$/, { token: 'jcl-delimiter', next: '@operands2', log: jclDebug && '[$S0] <delimiter> -> operands2 \'$0\'' }], //Checks for ',' + linenumber + linebreak (continuation of statement)
      [/( *)[0-9]+$/, { token: 'jcl-default', next: '@popall', log: jclDebug && '[$S0] <default> -> popall \'$0\'' }], //Checks for linenumber + linebreak (new JCL statement)
      [/( +)/, { token: 'whitespace', next: '@operator', log: jclDebug && '[$S0] <whitespace> -> operator \'$0\'' }], //Spaces(s) designate when to check for operator keywords after name
      [/'.*'/, { token: 'jcl-string', next: '@strings', log: jclDebug && '[$S0] <string> -> string \'$0\'' }],
      [/[^A-Z|@|#|$|0-9]/, { token: 'jcl-invalid', log: jclDebug && '[$S0] <invalid> -> ---\'$0\'' }], // Checks for invalid JCL characters in names
      [/./, { token: 'jcl-default', log: jclDebug && '[$S0] <default> -> --- \'$0\'' }]
    ],

    invalidName: [
      [/ *\n| *$/, { token: 'jcl-default', next: '@popall', log: jclDebug && '[$S0] <default> -> popall \'$0\'' }], //Checks for end of line without a ','
      [/( +)/, { token: 'jcl-invalid', next: '@operator', log: jclDebug && '[$S0] <invalid> -> operator \'$0\'' }], //Name must be between {0, 8} characters
      [/./, { token: 'jcl-invalid', log: jclDebug && '[$S0] <invalid> -> --- \'$0\'' }], //Name must be between {0, 8} characters
    ],
    operator: [
      [/, *$/, { token: 'jcl-delimiter', next: '@operands2', log: jclDebug && '[$S0] <delimiter> -> operands2 \'$0\'' }], //Checks for end of line with a ','
      [/ *\n| *$/, { token: 'jcl-default', next: '@popall', log: jclDebug && '[$S0] <default> -> popall \'$0\'' }], //Checks for end of line without a ','
      [/!/, { token: 'jcl-invalid', next: '@operands', log: jclDebug && '[$S0] <invalid> -> operands \'$0\'' }], // Checks for invalid JCL characters
      [/[a-z]+/, { token: 'jcl-invalid', next: '@operands', log: jclDebug && '[$S0] <invalid> -> operands \'$0\'' }], // Checks for invalid lowercase JCL
      [/(,|&|=|\^)/, { token: 'jcl-delimiter', next: '@operands', log: jclDebug && '[$S0] <delimiter> -> operands \'$0\'' }],
      [/'/, { token: 'jcl-string', next: '@strings', log: jclDebug && '[$S0] <string> -> string \'$0\'' }],
      [/[()]/, '@brackets' ],
      [/(IF)/, { token: 'jcl-operator', next: '@if', log: jclDebug && '[$S0] <operator> -> if \'$0\'' }], //If is special, gets its own logic
      [new RegExp(JCL_KEYWORDS + " *$"), { token: 'jcl-operator', next: '@popall', log: jclDebug && '[$S0] <operator> -> popall \'$0\'' }],
      [new RegExp(JCL_KEYWORDS + " +"), { token: 'jcl-operator', next: '@operands', log: jclDebug && '[$S0] <operator> -> operands \'$0\'' }],
      [new RegExp(JCL_KEYWORDS_SPECIAL + " *$"), { token: 'jcl-operator', next: '@popall', log: jclDebug && '[$S0] <operator> -> popall \'$0\'' }],
      [new RegExp(JCL_KEYWORDS_SPECIAL + " +"), { token: 'jcl-operator', next: '@comments', log: jclDebug && '[$S0] <operator> -> comments \'$0\'' }],
      [/[^\s\\a-z(,|&|=|\^)]+/, { token: 'jcl-default', next: '@operands', log: jclDebug && '[$S0] <default> -> operands \'$0\'' }], //Matches the rest
    ],
    if: [
      [/, *$/, { token: 'jcl-delimiter', next: '@operands2', log: jclDebug && '[$S0] <delimiter> -> operands2 \'$0\'' }], //Checks for end of line with a ','
      [/ *\n| *$/, { token: 'jcl-default', next: '@popall', log: jclDebug && '[$S0] <default> -> popall \'$0\'' }], //Checks for end of line without a ','
      [/(THEN )/, { token: 'jcl-operator', next: '@comments', log: jclDebug && '[$S0] <operator> -> comments \'$0\'' }],
      [/./, { token: 'jcl-variable', log: jclDebug && '[$S0] <variable> -> --- \'$0\'' }],
    ],
    operands: [
      [/,( +)[0-9]+$/, { token: 'jcl-delimiter', next: '@operands2', log: jclDebug && '[$S0] <delimiter> -> operands2 \'$0\'' }], //Checks for ',' + linenumber + linebreak (continuation of statement)
      [/( *)[0-9]+$/, { token: 'jcl-default', next: '@popall', log: jclDebug && '[$S0] <default> -> popall \'$0\'' }], //Checks for linenumber + linebreak (new JCL statement)
      [/, *$/, { token: 'jcl-delimiter', next: '@operands2', log: jclDebug && '[$S0] <delimiter> -> operands2 \'$0\'' }], //Checks for end of line with a ','
      [/ *\n| *$/, { token: 'jcl-default', next: '@popall', log: jclDebug && '[$S0] <default> -> popall \'$0\'' }], //Checks for end of line without a ','
      [/, /, { token: 'jcl-delimiter', next: '@comments', log: jclDebug && '[$S0] <delimiter> -> comments \'$0\'' }], //Checks for , + space (leads to comment)
      [/'/, { token: 'jcl-string', next: '@strings', log: jclDebug && '[$S0] <string> -> string \'$0\'' }],
      [/!/, { token: 'jcl-invalid', log: jclDebug && '[$S0] <invalid> -> --- \'$0\'' }], // Checks for invalid JCL characters
      [/[a-z]+/, { token: 'jcl-invalid', log: jclDebug && '[$S0] <invalid> -> --- \'$0\'' }], // Checks for invalid lowercase JCL
      [/(,|&|=|\^)/, { token: 'jcl-delimiter', log: jclDebug && '[$S0] <delimiter> -> --- \'$0\'' }],
      [/[)]$/, {token: 'jcl-delimiter', next:'@popall', log: jclDebug && '[$S0] <delimiter> -> popall \'$0\'' }],
      [/[()]/, '@brackets' ],
      [/ /, { token: 'jcl-variable', next: '@comments', log: jclDebug && '[$S0] <variable> -> comments \'$0\'' }],//Space leads to comments
      [/\*$/, { token: 'jcl-variable', next: '@popall', log: jclDebug && '[$S0] <variable> -> popall \'$0\'' }], //(*) as last char
      [/.$/, { token: 'jcl-variable', next: '@popall', log: jclDebug && '[$S0] <variable> -> popall \'$0\'' }], //For end 
      [/./, { token: 'jcl-variable', log: jclDebug && '[$S0] <variable> -> --- \'$0\'' }], //For everything else
      
    ],
    operands2: [ //JCL has a behavior where it will accept two sets of operands before detecting comments
                //for certain conditions, usually when statements are continued via a ','
      [/, *$/, { token: 'jcl-delimiter', next: '@operands2', log: jclDebug && '[$S0] <delimiter> -> operands2 \'$0\'' }], //Checks for end of line with a ','
      [/ *\n| *$/, { token: 'jcl-default', next: '@popall', log: jclDebug && '[$S0] <default> -> popall \'$0\'' }], //Checks for end of line without a ','
      [/,( +)[0-9]+$/, { token: 'jcl-delimiter', next: '@operands2', log: jclDebug && '[$S0] <delimiter> -> operands2 \'$0\'' }], //Checks for ',' + linenumber + linebreak (continuation of statement)
      [/( *)[0-9]+$/, { token: 'jcl-default', next: '@popall', log: jclDebug && '[$S0] <default> -> popall \'$0\'' }], //Checks for linenumber + linebreak (new JCL statement)
      [/, /, { token: 'jcl-delimiter', next: '@comments', log: jclDebug && '[$S0] <delimiter> -> comments \'$0\'' }], //Checks for , + space (leads to comment)
      [/'/, { token: 'jcl-string', next: '@strings', log: jclDebug && '[$S0] <string> -> string \'$0\'' }],
      [/!/, { token: 'jcl-invalid', log: jclDebug && '[$S0] <invalid> -> --- \'$0\'' }], // Checks for invalid JCL characters
      [/[a-z]+/, { token: 'jcl-invalid', log: jclDebug && '[$S0] <invalid> -> --- \'$0\'' }], // Checks for invalid lowercase JCL
      [/(,|&|=|\^)/, { token: 'jcl-delimiter', log: jclDebug && '[$S0] <delimiter> -> --- \'$0\'' }],
      [/[()]/, '@brackets' ],
      [/ +/, { token: 'jcl-variable', next: '@operands', log: jclDebug && '10. [$S0] <variable> -> operands \'$0\'' }],//Space leads to next operand
      [/\//, { token: 'jcl-variable', log: jclDebug && '[$S0] <variable> -> --- \'$0\'' }],
      [/^.*/, { token: 'jcl-none', log: jclDebug && '[$S0] <none> -> --- \'$0\'' }], //When a token doesn't match, the line is blue
      [/./, { token: 'jcl-variable', log: jclDebug && '[$S0] <variable> -> --- \'$0\'' }],//For everything else
    ],
    comments: [
      [/.*/, { token: 'jcl-comment', next: '@popall', log: jclDebug && '[$S0] <comment> -> popall \'$0\'' }],
      [/ *\n| *$/, { token: 'jcl-default', next: '@popall', log: jclDebug && '[$S0] <default> -> --- \'$0\'' }],
    ],
    strings: [ //Strings get their own category because Monaco doesn't seem to deal with pattern matching
              //over line breaks, even with multiline flags. This way, we just put strings into their own loop.
      [/.*' *$/, { token: 'jcl-string', next: '@popall', log: jclDebug && '[$S0] <string> -> popall \'$0\'' }],  // (') character ending line -> we are done here
      [/.*' /, { token: 'jcl-string', next: '@comments', log: jclDebug && '[$S0] <string> -> comments \'$0\'' }], // Space after the ending (') character is a comment
      [/.*' */, { token: 'jcl-string', next: '@operands', log: jclDebug && '[$S0] <string> -> operands \'$0\'' }], // Covers all characters in string until ending (') character
      [/.*/, { token: 'jcl-string', log: jclDebug && '[$S0] <string> -> --- \'$0\'' }],
    ]
  }
};
