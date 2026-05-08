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

// -- Hover documentation --

/**
 * Hover documentation for JCL statement types, parameters, and common keywords.
 * Keys are uppercase token strings as they appear in JCL source.
 */
export const JCL_HOVER_DOCS: Record<string, string> = {

  // ---- Statement types ----
  JOB:      '**JOB** -- Marks the beginning of a job. Identifies the job to the system, specifies accounting information, and sets job-level options such as CLASS, MSGCLASS, REGION, and NOTIFY.',
  EXEC:     '**EXEC** -- Executes a program or procedure. Use PGM= to name a load module directly, or specify a cataloged or in-stream PROC name.',
  DD:       '**DD** -- Data Definition. Describes a data set or I/O resource for a step. Required for every file opened by the program. Key parameters: DSN, DISP, UNIT, SPACE, DCB, SYSOUT.',
  PROC:     '**PROC** -- Begins an in-stream procedure definition, or (on an EXEC statement) names a cataloged procedure to invoke.',
  PEND:     '**PEND** -- Ends an in-stream procedure definition.',
  IF:       '**IF** -- Conditional expression. Tests the return code or abend status of preceding steps. Format: `// IF (condition) THEN`.',
  THEN:     '**THEN** -- Keyword following an IF condition. Statements between THEN and ELSE/ENDIF execute when the condition is true.',
  ELSE:     '**ELSE** -- Optional clause of an IF/THEN/ELSE/ENDIF construct. Statements between ELSE and ENDIF execute when the IF condition is false.',
  ENDIF:    '**ENDIF** -- Ends an IF/THEN/ELSE construct.',
  INCLUDE:  '**INCLUDE** -- Substitutes the contents of a JCL library member at the point of the statement. The member must contain valid JCL.',
  JCLLIB:   '**JCLLIB** -- Defines one or more private JCL procedure/include libraries to search before the system procedure libraries.',
  OUTPUT:   '**OUTPUT** -- Associates output characteristics (destination, forms, copies, etc.) with SYSOUT data sets. Referenced by DD statements via OUTPUT=*.name.',
  SET:      '**SET** -- Assigns a value to a symbolic parameter for use in the current JCL stream. The value replaces the symbol everywhere it appears in subsequent statements.',
  CNTL:     '**CNTL** -- Begins a control statement group passed directly to a program (e.g. DFSORT, IEBGENER control statements). Paired with ENDCNTL.',
  ENDCNTL:  '**ENDCNTL** -- Ends a CNTL block.',
  XMIT:     '**XMIT** -- Transmit JCL -- marks data to be transmitted to another node.',
  COMMAND:  '**COMMAND** -- Issues a z/OS operator command as part of job execution.',
  EXPORT:   '**EXPORT** -- Makes a symbol defined by SET available to called procedures.',
  SCHEDULE: '**SCHEDULE** -- Associates a job with a scheduling environment for JES3.',
  JOBGROUP: '**JOBGROUP** -- Begins a group of jobs that run together as a unit (JES3 job group).',
  ENDGROUP: '**ENDGROUP** -- Ends a JOBGROUP definition.',
  GJOB:     '**GJOB** -- Defines a member job within a JOBGROUP.',
  JOBSET:   '**JOBSET** -- Defines a set of jobs within a JOBGROUP that share execution criteria.',
  SJOB:     '**SJOB** -- Names a specific job within a JOBSET.',
  ENDSET:   '**ENDSET** -- Ends a JOBSET definition.',
  AFTER:    '**AFTER** -- Specifies that a job or job group runs after another job or group completes.',
  BEFORE:   '**BEFORE** -- Specifies that a job or job group runs before another.',
  CONCURRENT: '**CONCURRENT** -- Allows jobs in a group to run at the same time.',

  // ---- JOB statement parameters ----
  CLASS:    '**CLASS** -- Job class (A-Z, 0-9). Determines which initiator can select the job. Configured by the installation.',
  MSGCLASS: '**MSGCLASS** -- Output class for the job log (JES message data set). Typically A=held, X=print-and-delete, H=hold.',
  MSGLEVEL: '**MSGLEVEL** -- Controls what appears in the job log. Format: `MSGLEVEL=(stmts,msgs)`. stmts: 0=JOB only, 1=all input, 2=only referenced. msgs: 0=none, 1=all JES and allocation messages.',
  NOTIFY:   '**NOTIFY** -- TSO user ID to notify when the job completes. The system sends a message to that user\'s terminal.',
  REGION:   '**REGION** -- Maximum virtual storage for a step or job. Format: `REGION=nnnK` or `REGION=nM`. 0M = no limit (up to system maximum). Also set on EXEC to override per-step.',
  TIME:     '**TIME** -- CPU time limit. Format: `TIME=(minutes,seconds)` or `TIME=nnn` (seconds). Terminate job if exceeded. Use TIME=NOLIMIT or TIME=1440 for no limit.',
  ADDRSPC:  '**ADDRSPC** -- Address space type: VIRT (virtual storage, default) or REAL (fixed real storage, discourages paging).',
  COND:     '**COND** -- Condition for skipping a step. Format: `COND=(code,operator)` or `COND=(code,operator,stepname)`. Operators: LT, LE, EQ, NE, GE, GT. Step is bypassed if condition is true. COND=EVEN or COND=ONLY for abend handling.',
  ACCT:     '**ACCT** -- Accounting information passed to the installation\'s accounting routine. Format is installation-defined.',
  TYPRUN:   '**TYPRUN** -- Special job execution mode: SCAN (syntax-check JCL only), HOLD (hold before execution), COPY (copy JCL to SYSOUT).',
  RESTART:  '**RESTART** -- Restart a failed job from a specified step: `RESTART=stepname` or `RESTART=stepname.procstep`.',
  BYTES:    '**BYTES** -- Limits the total bytes of SYSOUT output for the job. Exceeded jobs are cancelled.',
  LINES:    '**LINES** -- Limits the total lines of SYSOUT output for the job.',
  PAGES:    '**PAGES** -- Limits the total pages of SYSOUT output for the job.',
  CARDS:    '**CARDS** -- Limits the number of punch card images written to SYSOUT.',
  PRTY:     '**PRTY** -- JES2 job priority within the job class (0-15, higher = more priority).',
  PERFORM:  '**PERFORM** -- Performance group number assigned to the job for WLM/SRM scheduling.',

  // ---- EXEC statement parameters ----
  PGM:      '**PGM** -- Names the load module (program) to execute. The system searches the JOBLIB, STEPLIB, and link pack. Example: `EXEC PGM=IEFBR14`.',
  PARM:     '**PARM** -- Character string passed to the program as its parameter (register 1 -> halfword length + data). Maximum 100 characters. Enclose in apostrophes if it contains special characters.',
  DYNAMNBR: '**DYNAMNBR** -- Maximum number of data sets that can be dynamically allocated by this step.',

  // ---- DD statement parameters ----
  DSN:      '**DSN (DSNAME)** -- Data Set Name. Identifies the data set. Multi-level names use periods as qualifiers (up to 44 characters total). Special values: `&&name` = temporary, `*` = inline data, `NULLFILE` / `DUMMY` = no I/O.',
  DISP:     '**DISP** -- Disposition. Format: `DISP=(status,normal,abnormal)`. Status: NEW, OLD, SHR, MOD. Normal/Abnormal: KEEP, DELETE, CATLG, UNCATLG, PASS. Example: `DISP=(NEW,CATLG,DELETE)`.',
  UNIT:     '**UNIT** -- Device type or group name for the data set. Examples: SYSDA (any direct-access), 3390 (DASD model), TAPE, VIO (virtual I/O). Can also specify a specific device address.',
  VOL:      '**VOL (VOLUME)** -- Volume serial or volume count. Format: `VOL=SER=volser` or `VOL=(PRIVATE,,n,SER=(v1,v2,...))`. Use to override catalog or specify multi-volume data sets.',
  SYSOUT:   '**SYSOUT** -- Directs output to the JES spool rather than a real data set. Format: `SYSOUT=class` (e.g. SYSOUT=*=same as MSGCLASS, SYSOUT=A=print). Can include writer name: `SYSOUT=(class,writer)`.',
  SPACE:    '**SPACE** -- Allocates DASD space. Format: `SPACE=(unit,(primary,secondary,directory))`. Unit: TRK, CYL, or blocksize. Example: `SPACE=(TRK,(10,5))` = 10 primary + 5 secondary tracks.',
  DCB:      '**DCB** -- Data Control Block attributes. Common sub-parameters: RECFM, LRECL, BLKSIZE, DSORG. Can reference another DD: `DCB=*.stepname.ddname`. Example: `DCB=(RECFM=FB,LRECL=80,BLKSIZE=27920)`.',
  RECFM:    '**RECFM** -- Record Format (DCB sub-parameter). Common values: F=fixed, FB=fixed-blocked, V=variable, VB=variable-blocked, U=undefined. Suffix A=ASA carriage control, M=machine carriage control.',
  LRECL:    '**LRECL** -- Logical Record Length in bytes (DCB sub-parameter). For variable records, includes the 4-byte RDW. Maximum: 32760 for VS, 32756 for VBS.',
  BLKSIZE:  '**BLKSIZE** -- Block size in bytes (DCB sub-parameter). Set to 0 to let the system determine the optimal block size. For tape: multiples of LRECL for fixed records.',
  DSORG:    '**DSORG** -- Data Set Organization (DCB sub-parameter). PS=sequential, PO=partitioned (PDS), IS=indexed sequential, DA=direct.',
  DUMMY:    '**DUMMY** -- Indicates a null DD -- no I/O actually occurs. The program opens and closes the file successfully but no data is read or written. Equivalent to DSN=NULLFILE,DISP=SHR.',
  DDNAME:   '**DDNAME** -- Defers a DD to be supplied later by dynamic allocation or by a referencing concatenation.',
  LABEL:    '**LABEL** -- Tape label type and sequence. Format: `LABEL=(seq,type,PASSWORD,RETPD=nnn,EXPDT=yyddd)`. Types: SL=IBM standard, NL=no label, SUL=standard+user, NSL=nonstandard.',
  BUFNO:    '**BUFNO** -- Number of I/O buffers to allocate for this data set. Larger values improve sequential I/O throughput at the cost of virtual storage.',
  FREE:     '**FREE** -- Controls when the data set is freed: END (at step end, default) or CLOSE (when the data set is closed). CLOSE is useful for long-running steps.',
  AMP:      '**AMP** -- Access Method Parameters for VSAM data sets. Provides VSAM control information that cannot be expressed through other DD parameters.',
  AVGREC:   '**AVGREC** -- Average record unit for space allocation: U=bytes, K=kilobytes, M=megabytes. Used with SPACE=(AVGREC,...).',
  STORCLAS: '**STORCLAS** -- SMS Storage Class. Assigns the data set to a storage class defined in the SMS ACS routines for automatic storage management.',
  MGMTCLAS: '**MGMTCLAS** -- SMS Management Class. Specifies backup, migration, and retention attributes for SMS-managed data sets.',
  DATACLAS: '**DATACLAS** -- SMS Data Class. Provides default DCB and space attributes from an installation-defined template.',
  KEYLEN:   '**KEYLEN** -- Key length for ISAM or VSAM data sets (DCB sub-parameter).',
  RKP:      '**RKP** -- Relative Key Position: byte offset of the key within the record (DCB sub-parameter).',
  EXPDT:    '**EXPDT** -- Expiration date for the data set: EXPDT=yyddd (Julian) or EXPDT=yyyy/ddd.',
  RETPD:    '**RETPD** -- Retention period in days. The system calculates the expiration date as today + RETPD.',
  SUBSYS:   '**SUBSYS** -- Names a subsystem (e.g. a database manager) to handle I/O for this DD.',
  PATH:     '**PATH** -- HFS/zFS UNIX path name for z/OS UNIX files. Example: `PATH=\'/u/user/myfile.txt\'`.',
  PATHMODE: '**PATHMODE** -- Permission bits for a newly created z/OS UNIX file (octal). Example: `PATHMODE=SIRWXU`.',
  PATHOPTS: '**PATHOPTS** -- Open options for z/OS UNIX files: ORDWR (read/write), ORDONLY, OWRONLY, OCREAT, OTRUNC, etc.',
  FILEDATA: '**FILEDATA** -- Indicates the data format for z/OS UNIX files: TEXT, BINARY, or RECORD.',
};

