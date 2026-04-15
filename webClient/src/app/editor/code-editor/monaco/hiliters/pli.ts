/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

/**
 * Monarch tokenizer and hover documentation for IBM PL/I source files.
 *
 * PL/I is a block-structured, case-insensitive general-purpose language for IBM mainframes.
 * Syntax reference: IBM Enterprise PL/I for z/OS Language Reference
 *
 * Token classes emitted:
 *   pli-comment      -- block comments / * ... * / and line comments //
 *   pli-keyword      -- statement and control flow keywords (PROCEDURE, IF, DO, DECLARE, ...)
 *   pli-attribute    -- data type and variable attribute keywords (FIXED, FLOAT, CHARACTER, ...)
 *   pli-builtin      -- built-in function names (SUBSTR, LENGTH, ADDR, NULL, ...)
 *   pli-preprocessor -- preprocessor directives (%INCLUDE, %IF, *PROCESS, ...)
 *   pli-string       -- character string literals ('...' or "...")
 *   pli-number       -- numeric constants
 *   pli-operator     -- operators and punctuation
 */

// -- Hover documentation -------------------------------------------------------

/**
 * PL/I keyword, attribute, and built-in hover documentation.
 * Keys are uppercase; lookup is performed with toUpperCase().
 */
export const PLI_HOVER_DOCS: Record<string, string> = {

  // --- Statement and control-flow keywords ------------------------------------

  PROCEDURE: '**PROCEDURE** (abbrev: PROC) — Begins a procedure definition.\n\nSyntax: `label: PROCEDURE [(parameters)] [OPTIONS(options)] [RETURNS(type)];`\n\nA procedure acts as a subroutine or function. The matching `END label;` closes it.',
  PROC: '**PROC** — Abbreviation for PROCEDURE. Begins a procedure definition.',
  PACKAGE: '**PACKAGE** — Begins a package: a collection of procedures sharing a common scope.\n\nSyntax: `label: PACKAGE [EXPORTS(*|proc,...)] [RESERVES(*|var,...)] [OPTIONS(...)];`',
  BEGIN: '**BEGIN** — Begins a BEGIN block, providing a new scope for local declarations.\n\nSyntax: `BEGIN [OPTIONS(...)]; statements END [label];`',
  END: '**END** [label] — Closes a DO group, BEGIN block, SELECT, PROCEDURE, or PACKAGE.',

  DO: '**DO** — Begins a DO group. Variants:\n- `DO;` — simple group\n- `DO WHILE(cond);` — loop while condition is true\n- `DO UNTIL(cond);` — loop until condition is true\n- `DO i = 1 TO n;` — counted iteration\n- `DO i = 1 TO n BY step;` — step iteration',
  WHILE: '**WHILE(condition)** — Iterates a DO loop while condition is true.',
  UNTIL: '**UNTIL(condition)** — Iterates a DO loop until condition becomes true.',
  TO: '**TO** — Specifies the upper bound in a counted DO loop: `DO i = 1 TO n;`',
  BY: '**BY** — Specifies the step value in a DO iteration: `DO i = 0 TO 100 BY 5;`',
  UPTHRU: '**UPTHRU** — DO loop iterates upward through the end value (inclusive): `DO i = start UPTHRU end;`',
  DOWNTHRU: '**DOWNTHRU** — DO loop iterates downward through the end value (inclusive): `DO i = start DOWNTHRU end;`',
  REPEAT: '**REPEAT(expr)** — DO loop assigns the REPEAT expression to the control variable on each iteration.',

  IF: '**IF condition THEN statement [ELSE statement]** — Conditional execution.',
  THEN: '**THEN** — Introduces the true branch of an IF statement.',
  ELSE: '**ELSE** — Introduces the false branch of an IF statement.',

  SELECT: '**SELECT [(expr)];** — Multi-way conditional.\n\n```\nSELECT (x);\n  WHEN (1) stmt;\n  WHEN (2) stmt;\n  OTHERWISE stmt;\nEND;\n```',
  WHEN: '**WHEN(conditions)** — Introduces a branch in a SELECT statement.',
  OTHERWISE: '**OTHERWISE** — Default branch in a SELECT; executed when no WHEN condition matches.',
  OTHER: '**OTHER** — Abbreviation for OTHERWISE.',

  CALL: '**CALL procedure [(args)];** — Invokes a procedure as a statement (not a function call in an expression).',
  RETURN: '**RETURN [(expression)];** — Returns from a procedure. For functions, returns the given value.',
  STOP: '**STOP;** — Terminates program execution immediately.',
  EXIT: '**EXIT;** — Terminates program execution (same effect as STOP).',
  GOTO: '**GOTO label;** — Unconditional branch to a statement label. Also written `GO TO`.',
  GO: '**GO TO label;** — Unconditional branch. Two-word form of GOTO.',
  ITERATE: '**ITERATE [label];** — Transfers control back to the loop test of the enclosing (or labeled) DO loop.',
  LEAVE: '**LEAVE [label];** — Exits a DO group, transferring control to the statement after END.',

  DECLARE: '**DECLARE** (abbrev: DCL) — Declares variables with their storage and type attributes.\n\nSyntax: `DCL name attribute, ...; ` or `DCL (n1, n2) attribute;`\n\nExample: `DCL x FIXED BIN(31), s CHAR(80) VAR;`',
  DCL: '**DCL** — Abbreviation for DECLARE.',
  DEFAULT: '**DEFAULT** (abbrev: DFT) — Sets default attributes for identifiers matching a specified range pattern.',
  DFT: '**DFT** — Abbreviation for DEFAULT.',

  DEFINE: '**DEFINE** — Defines an alias, ordinal type, or structure type. Variants:\n- `DEFINE ALIAS name attributes;`\n- `DEFINE ORDINAL name (...);`\n- `DEFINE STRUCTURE level name;`',
  XDEFINE: '**XDEFINE** — Extended DEFINE (IBM Enterprise PL/I extension).',

  ALLOCATE: '**ALLOCATE** (abbrev: ALLOC) — Dynamically allocates storage for a BASED, CONTROLLED, or AREA variable.\n\nSyntax: `ALLOCATE var [IN(area)] [SET(ptr)];`',
  ALLOC: '**ALLOC** — Abbreviation for ALLOCATE.',
  FREE: '**FREE** — Releases storage previously allocated with ALLOCATE.',

  ON: '**ON condition [SNAP] action;** — Installs an ON-unit (condition handler).\n\nExample: `ON ERROR BEGIN; PUT SKIP LIST(ONCODE()); END;`',
  REVERT: '**REVERT condition;** — Removes a user-installed ON-unit, restoring default handling.',
  RESIGNAL: '**RESIGNAL;** — Re-raises the current condition from within an ON-unit.',
  SIGNAL: '**SIGNAL condition;** — Explicitly raises a condition.',

  GET: '**GET** — Reads data. Variants: `GET FILE(f) LIST(...)`, `GET FILE(f) EDIT(...)`, `GET STRING(s) LIST(...)`, `GET DATA`.',
  PUT: '**PUT** — Writes data. Variants: `PUT FILE(f) LIST(...)`, `PUT SKIP`, `PUT PAGE`, `PUT STRING(s) EDIT(...)`, `PUT DATA`.',
  READ: '**READ FILE(f) [INTO(var)] [KEY(k)] [KEYTO(v)];** — Reads a record from a RECORD file.',
  WRITE: '**WRITE FILE(f) FROM(var) [KEYFROM(k)] [KEYTO(v)];** — Writes a record to a RECORD file.',
  REWRITE: '**REWRITE FILE(f) FROM(var) [KEY(k)];** — Updates the current (or keyed) record in a RECORD file.',
  LOCATE: '**LOCATE var FILE(f) [SET(ptr)] [KEYFROM(k)];** — Allocates space for a BASED variable via a file buffer.',

  OPEN: '**OPEN FILE(f) [INPUT|OUTPUT|UPDATE] [SEQUENTIAL|DIRECT] [...];** — Opens a file for I/O.',
  CLOSE: '**CLOSE FILE(f);** — Closes a file.',
  DELETE: '**DELETE FILE(f) [KEY(k)];** — Deletes a record from a KEYED RECORD file.',
  FLUSH: '**FLUSH FILE(f);** — Flushes the file buffer to storage.',

  FETCH: '**FETCH** entry [...];** — Dynamically loads a fetchable procedure into storage.',
  RELEASE: '**RELEASE** (* | name, ...);** — Releases a dynamically fetched procedure.',
  DELAY: '**DELAY(n);** — Suspends the current task for approximately n milliseconds.',
  WAIT: '**WAIT THREAD(task);** — Waits for the specified task to complete.',
  ATTACH: '**ATTACH** — Creates and starts a new multitasking task (thread).',
  DETACH: '**DETACH THREAD(task);** — Detaches a task so that its completion is not awaited.',
  CANCEL: '**CANCEL THREAD(task);** — Cancels a running task.',

  ASSERT: "**ASSERT** — Runtime assertion. Variants:\n- `ASSERT TRUE(expr)` — asserts expression is true\n- `ASSERT FALSE(expr)` — asserts expression is false\n- `ASSERT COMPARE(actual, expected)` — asserts equality\n- `ASSERT UNREACHABLE` — asserts code point is never reached",
  DISPLAY: '**DISPLAY(expr) [REPLY(var)];** — Writes a message to the operator console; optionally reads a reply.',
  EXEC: '**EXEC** — Introduces an embedded statement for another language subsystem.\n\nCommon forms:\n- `EXEC SQL SELECT ... ;` — embedded SQL\n- `EXEC CICS command ;` — CICS commands',
  FORMAT: '**FORMAT** — Defines a FORMAT label for use in GET EDIT / PUT EDIT format lists.',
  QUALIFY: '**QUALIFY;** — Opens a QUALIFY block that qualifies all unqualified references within it.',
  REINIT: '**REINIT var;** — Re-initializes a BASED variable to its INITIAL value.',

  ENTRY: '**ENTRY** — (1) In a procedure: declares an additional entry point. (2) In a DCL: attribute indicating the variable is an entry (procedure reference).',
  OPTIONS: '**OPTIONS(items)** — Specifies procedure, PACKAGE, or entry options. Common items: MAIN, RECURSIVE, REENTRANT, BYADDR, BYVALUE, FETCHABLE.',
  EXPORTS: "**EXPORTS(*|proc,...)** — PACKAGE attribute listing which procedures are exported (visible outside the package). `EXPORTS(*)` exports all.",
  RESERVES: "**RESERVES(*|var,...)** — PACKAGE attribute listing which variables are accessible from outside the package. `RESERVES(*)` allows all.",

  // --- I/O and statement qualifiers -------------------------------------------

  FILE: '**FILE(name)** — Identifies the file variable in I/O statements (READ, WRITE, OPEN, CLOSE, etc.).',
  INTO: '**INTO(variable)** — Specifies the target variable for a READ or GET operation.',
  FROM: '**FROM(variable)** — Specifies the source variable for a WRITE or REWRITE operation.',
  IN: '**IN(area)** — Specifies the AREA in which to allocate a BASED variable.',
  SET: '**SET(locator)** — Specifies the pointer or offset variable to be set by LOCATE, READ SET, or ALLOCATE SET.',
  KEY: '**KEY(expression)** — Specifies the key value for direct-access or keyed file operations.',
  KEYTO: '**KEYTO(variable)** — Specifies the variable to receive the key of the record just read.',
  KEYFROM: '**KEYFROM(expression)** — Specifies the key value to use when writing a new record.',
  TITLE: '**TITLE(expr)** — Specifies the data set name (ddname) to use when opening a file.',
  COPY: '**COPY** — In GET: causes the data read to also be written to SYSPRINT.',
  SKIP: '**SKIP [(n)]** — In PUT: advances n lines (default 1). In GET: skips n records.',
  IGNORE: '**IGNORE(n)** — In READ: skips n records without reading them into storage.',
  SNAP: '**SNAP** — In ON: requests a traceback dump when the condition is raised.',
  SYSTEM: '**SYSTEM** — In ON: specifies that the system default action is to be taken for the condition.',
  DATA: '**DATA** — In GET/PUT: uses data-directed I/O (name=value pairs).',
  EDIT: '**EDIT(list)(format)** — In GET/PUT: uses format-directed I/O with explicit format items.',
  LIST: '**LIST(items)** — In GET/PUT: uses list-directed (free-format) I/O.',
  STRING: '**STRING(expr)** — (1) In GET/PUT: performs I/O from/to a character string rather than a file. (2) As a builtin: returns a structure\'s elements concatenated.',
  REPLY: '**REPLY(variable)** — In DISPLAY: specifies a variable to receive the operator\'s reply.',
  PAGE: '**PAGE** — In PUT: advances to the top of the next page.',
  LINE: '**LINE(n)** — In PUT: advances to a specific line number on the current page. Also a format item.',
  THREAD: '**THREAD(task)** — In WAIT/CANCEL/DETACH: identifies the task variable.',
  ALIAS: '**ALIAS** — Used in `DEFINE ALIAS name type;` to create a type alias.',

  AND: '**AND** — Logical AND operator (equivalent to `&` or `&&`). Used in expressions and DEFAULT range specifications.',
  OR: '**OR** — Logical OR operator (equivalent to `|` or `||`). Used in expressions and DEFAULT range specifications.',
  NOT: '**NOT** — Logical NOT operator (equivalent to `¬` or `^`). Used in DEFAULT range specifications.',

  // --- Data type and attribute keywords ----------------------------------------

  FIXED: '**FIXED** — Fixed-point numeric type. Precision and optional scale in parentheses.\n\nExample: `DCL x FIXED DEC(7,2);` — 7 total digits, 2 after the decimal.',
  FLOAT: '**FLOAT** — Floating-point numeric type.\n\nExample: `DCL x FLOAT DEC(15);` — 15-digit decimal float (≈ double precision).',
  DECIMAL: '**DECIMAL** (abbrev: DEC) — Decimal arithmetic base for FIXED or FLOAT.',
  DEC: '**DEC** — Abbreviation for DECIMAL.',
  BINARY: '**BINARY** (abbrev: BIN) — Binary arithmetic base for FIXED or FLOAT.\n\nExample: `DCL x FIXED BIN(31);` — 32-bit signed integer.',
  BIN: '**BIN** — Abbreviation for BINARY.',
  CHARACTER: '**CHARACTER** (abbrev: CHAR) — Character string type.\n\nExample: `DCL name CHAR(30) VAR;` — varying-length string of up to 30 characters.',
  CHAR: '**CHAR** — Abbreviation for CHARACTER, and a built-in conversion function.',
  BIT: '**BIT** — Bit string type.\n\nExample: `DCL flags BIT(8);` — 8-bit string.',
  GRAPHIC: '**GRAPHIC** — DBCS (double-byte character set) string type.',
  UCHAR: '**UCHAR** — Unicode character type (UTF-16 code units).',
  WIDECHAR: '**WIDECHAR** — Wide character type (UCS-2 / UTF-16).',
  PICTURE: '**PICTURE** (abbrev: PIC) — Picture-edited character type specifying the exact layout of digits and formatting.\n\nExample: `DCL amt PIC \'999V99\';`',
  PIC: '**PIC** — Abbreviation for PICTURE.',
  WIDEPIC: '**WIDEPIC** — Wide picture type for DBCS picture strings.',
  REAL: '**REAL** — Specifies the real (non-complex) part of a number; opposite of COMPLEX.',
  COMPLEX: '**COMPLEX** — Complex number type with real and imaginary parts.\n\nExample: `DCL z COMPLEX FLOAT DEC(15);`',
  POINTER: '**POINTER** (abbrev: PTR) — Pointer type; holds the address of a storage location.\n\nExample: `DCL p POINTER; p = ADDR(x);`',
  PTR: '**PTR** — Abbreviation for POINTER.',
  OFFSET: '**OFFSET** — A relative address stored as an offset from the beginning of an AREA.',
  LABEL: '**LABEL** — Label variable type; holds the address of a statement label.',
  AREA: '**AREA** [(size)] — A region of storage used for allocating BASED variables.',
  VARYING: '**VARYING** (abbrev: VAR) — Specifies a variable-length string. The length is stored explicitly.',
  VAR: '**VAR** — Abbreviation for VARYING.',
  VARYING4: '**VARYING4** — Variable-length string with a 4-byte length prefix.',
  VARYINGZ: '**VARYINGZ** (abbrev: VARZ) — Null-terminated variable-length string (C-string layout).',
  VARZ: '**VARZ** — Abbreviation for VARYINGZ.',
  NONVARYING: '**NONVARYING** — Specifies a fixed-length string (default; opposite of VARYING).',
  ALIGNED: '**ALIGNED** — Specifies that a variable is naturally aligned in storage.',
  UNALIGNED: '**UNALIGNED** (abbrev: UNAL) — Specifies that a variable is packed without alignment padding.',
  UNAL: '**UNAL** — Abbreviation for UNALIGNED.',
  SIGNED: '**SIGNED** — Specifies a signed numeric data type.',
  UNSIGNED: '**UNSIGNED** — Specifies an unsigned numeric data type.',
  STATIC: '**STATIC** — Allocates the variable in static storage (persists for the program lifetime).',
  AUTOMATIC: '**AUTOMATIC** (abbrev: AUTO) — Allocates the variable on the stack (default for local variables). Freed on return.',
  AUTO: '**AUTO** — Abbreviation for AUTOMATIC.',
  BASED: '**BASED** [(locator)] — A variable accessed through a pointer or offset locator.\n\nExample: `DCL node BASED(p); ALLOCATE node SET(p);`',
  CONTROLLED: '**CONTROLLED** (abbrev: CTL) — Storage is explicitly allocated/freed with ALLOCATE/FREE. Supports a stack-like allocation model.',
  CTL: '**CTL** — Abbreviation for CONTROLLED.',
  DEFINED: '**DEFINED** (abbrev: DEF) — A DEFINED variable overlays the storage of a base variable.\n\nExample: `DCL overlay CHAR(2) DEF(base) POS(3);`',
  DEF: '**DEF** — Abbreviation for DEFINED.',
  EXTERNAL: '**EXTERNAL** (abbrev: EXT) — Variable or entry is visible outside the compilation unit (exported).',
  EXT: '**EXT** — Abbreviation for EXTERNAL.',
  INTERNAL: '**INTERNAL** (abbrev: INT) — Variable is local to the procedure (default; not exported).',
  INT: '**INT** — Abbreviation for INTERNAL.',
  BUILTIN: '**BUILTIN** — Declares a name as a reference to a PL/I built-in function, preventing it from being treated as a user variable.',
  PARAMETER: '**PARAMETER** — Attribute indicating that a variable is a formal procedure parameter.',
  VARIABLE: '**VARIABLE** — ENTRY attribute indicating the entry variable can refer to different procedures at run time.',
  LIMITED: '**LIMITED** — ENTRY attribute restricting the associated entry to use only LIMITED operations.',
  GENERIC: '**GENERIC** — ENTRY attribute associating a generic name with multiple specific entries selected by argument type.',
  CONDITION: '**CONDITION(name)** — Declares a named condition that can be raised with SIGNAL and handled with ON.',
  TASK: '**TASK** — Declares a task (multitasking) variable.',
  EVENT: '**EVENT** — Declares an event variable used for task synchronization.',

  SEQUENTIAL: '**SEQUENTIAL** (abbrev: SEQL) — Specifies sequential access order for a file.',
  SEQL: '**SEQL** — Abbreviation for SEQUENTIAL.',
  DIRECT: '**DIRECT** — Specifies direct (random-access) access order for a file.',
  BUFFERED: '**BUFFERED** (abbrev: BUF) — Specifies that file I/O is buffered.',
  BUF: '**BUF** — Abbreviation for BUFFERED.',
  UNBUFFERED: '**UNBUFFERED** (abbrev: UNBUF) — Specifies that file I/O is unbuffered (each operation goes directly to storage).',
  UNBUF: '**UNBUF** — Abbreviation for UNBUFFERED.',
  KEYED: '**KEYED** — Specifies a file that supports keyed (direct) access.',
  INPUT: '**INPUT** — Specifies that the file is opened for reading only.',
  OUTPUT: '**OUTPUT** — Specifies that the file is opened for writing only.',
  UPDATE: '**UPDATE** — Specifies that the file supports both reading and writing.',
  PRINT: '**PRINT** — Specifies a print file (adds carriage control, PAGE/LINE/SKIP tracking).',
  RECORD: '**RECORD** — Specifies record-oriented I/O (read/write complete records).',
  STREAM: '**STREAM** — Specifies stream-oriented I/O (reads/writes data items, ignoring record boundaries).',
  ENVIRONMENT: '**ENVIRONMENT** (abbrev: ENV) — Specifies file attributes such as block size and record format.',
  ENV: '**ENV** — Abbreviation for ENVIRONMENT.',
  EXCLUSIVE: '**EXCLUSIVE** — Specifies that a file is opened with exclusive access.',

  DIMENSION: '**DIMENSION** (abbrev: DIM) — Specifies array dimensions. Can be omitted; dimension bounds are written directly: `DCL a(10,20) FIXED;`',
  DIM: '**DIM** — Abbreviation for DIMENSION.',
  INITIAL: '**INITIAL** (abbrev: INIT) — Specifies the initial value(s) for a declared variable.\n\nExample: `DCL x FIXED BIN(31) INIT(0);`',
  INIT: '**INIT** — Abbreviation for INITIAL.',

  LIKE: '**LIKE** — Declares a structure with the same layout as an existing named structure.\n\nExample: `DCL t2 LIKE t1;`',
  TYPE: '**TYPE** — Specifies that a variable is an instance of a DEFINE\'d type.',
  ORDINAL: '**ORDINAL** — Type attribute for `DEFINE ORDINAL` enumeration types.',
  HANDLE: '**HANDLE** [(size)] — A typed pointer (handle) to a `DEFINE STRUCTURE` instance.',
  RETURNS: '**RETURNS(type)** — Specifies the return type of a function procedure, or the return type in ENTRY/RETURNS attributes.',
  PRECISION: '**PRECISION** (abbrev: PREC) — Specifies the precision (and optional scale) of a numeric variable.',
  PREC: '**PREC** — Abbreviation for PRECISION.',
  POSITION: '**POSITION** (abbrev: POS) — Used with DEFINED to specify the bit or character position within the base variable.',
  POS: '**POS** — Abbreviation for POSITION.',
  DATE: '**DATE** [(pattern)] — Declares a DATE variable with an optional date-string pattern (e.g., `\'YYYYMMDD\'`).',
  STRUCTURE: '**STRUCTURE** — In `DEFINE STRUCTURE`: creates a named structure type.',
  STRUCT: '**STRUCT** — Abbreviation for STRUCTURE in `DEFINE STRUCT`.',
  UNION: '**UNION** — In `DEFINE STRUCTURE` or DCL: declares a union overlay of its members.',
  VALUE: '**VALUE(expr)** — Specifies a compile-time constant value for a declared name.',
  VALUELIST: '**VALUELIST(v1, v2, ...)** — Restricts a parameter or return value to one of the listed values.',
  VALUERANGE: '**VALUERANGE(lo, hi)** — Restricts a parameter or return value to a specified range.',

  RECURSIVE: '**RECURSIVE** — Procedure option permitting direct or indirect recursive calls.',
  MAIN: '**MAIN** — Procedure option designating this procedure as the program entry point.',
  BYADDR: '**BYADDR** — Passes parameters or return values by address (reference).',
  BYVALUE: '**BYVALUE** — Passes parameters or return values by value (a copy is made).',
  DESCRIPTOR: '**DESCRIPTOR** — Passes a string descriptor (dope vector) for character parameters.',
  NODESCRIPTOR: '**NODESCRIPTOR** — Suppresses the descriptor for character parameters.',
  REENTRANT: '**REENTRANT** — Declares that the code is re-entrant (safe for concurrent execution; no modifiable static data).',
  REDUCIBLE: '**REDUCIBLE** — Declares that a function has no side effects and can be eliminated if its result is unused.',
  IRREDUCIBLE: '**IRREDUCIBLE** — Declares that a function has side effects and must not be eliminated.',
  NORETURN: '**NORETURN** — Declares that the procedure never returns (e.g., it always calls STOP).',
  FETCHABLE: '**FETCHABLE** — PACKAGE/PROC option allowing the procedure to be dynamically loaded with FETCH.',
  RENT: '**RENT** — Synonym for REENTRANT in the OPTIONS list.',
  INLINE: '**INLINE** — Suggests that the procedure may be inlined at call sites.',
  NOINLINE: '**NOINLINE** — Suppresses inlining of the procedure.',
  ORDER: '**ORDER** — Evaluates DO-loop specifications in order (default).',
  REORDER: '**REORDER** — Allows the compiler to reorder DO-loop specifications for optimization.',
  ASSEMBLER: '**ASSEMBLER** (abbrev: ASM) — Specifies assembler calling convention for the entry.',
  ASM: '**ASM** — Abbreviation for ASSEMBLER in OPTIONS.',
  COBOL: '**COBOL** — Specifies COBOL calling linkage convention for an ENTRY.',
  FORTRAN: '**FORTRAN** — Specifies FORTRAN calling linkage convention for an ENTRY.',
  NOEXECOPS: '**NOEXECOPS** — Suppresses processing of runtime options from PARM.',

  // --- Conditions (for ON / SIGNAL / REVERT) -----------------------------------

  ERROR: '**ERROR** condition — Raised when a condition propagates without a matching ON-unit; the "catch-all" condition.',
  FINISH: '**FINISH** condition — Raised when the program is about to terminate normally.',
  CONVERSION: '**CONVERSION** condition — Raised on an invalid character-to-numeric conversion.',
  OVERFLOW: '**OVERFLOW** (abbrev: OFL) condition — Raised on fixed-point overflow.',
  OFL: '**OFL** — Abbreviation for OVERFLOW condition.',
  UNDERFLOW: '**UNDERFLOW** (abbrev: UFL) condition — Raised on floating-point underflow.',
  UFL: '**UFL** — Abbreviation for UNDERFLOW condition.',
  ZERODIVIDE: '**ZERODIVIDE** (abbrev: ZDIV) condition — Raised when an integer division by zero occurs.',
  ZDIV: '**ZDIV** — Abbreviation for ZERODIVIDE condition.',
  FIXEDOVERFLOW: '**FIXEDOVERFLOW** (abbrev: FOFL) condition — Raised on fixed-point arithmetic overflow.',
  FOFL: '**FOFL** — Abbreviation for FIXEDOVERFLOW condition.',
  SUBSCRIPTRANGE: '**SUBSCRIPTRANGE** condition — Raised when an array subscript is out of the declared bounds.',
  STRINGRANGE: '**STRINGRANGE** condition — Raised when a string pseudo-variable reference is outside the string bounds.',
  STRINGSIZE: '**STRINGSIZE** condition — Raised when a string value is truncated on assignment.',
  STORAGE: '**STORAGE** condition / builtin — As a condition: raised when ALLOCATE cannot obtain storage. As a builtin function: `STORAGE(var)` returns the number of bytes occupied by the variable.',
  SIZE: '**SIZE** condition / builtin — As a condition: raised when a value is truncated due to precision loss on assignment. As a builtin: `SIZE(var)` returns the declared storage size in bytes.',
  ENDFILE: '**ENDFILE(file)** condition — Raised when the end of file is reached on the specified file.',
  ENDPAGE: '**ENDPAGE(file)** condition — Raised when the output page length limit is reached on a PRINT file.',
  UNDEFINEDFILE: '**UNDEFINEDFILE** (abbrev: UNDF) condition — Raised when an attempt is made to use a file that is not defined or opened.',
  UNDF: '**UNDF** — Abbreviation for UNDEFINEDFILE condition.',
  TRANSMIT: '**TRANSMIT(file)** condition — Raised on a hardware I/O transmission error.',
  INVALIDOP: '**INVALIDOP** condition — Raised on an invalid floating-point operation.',
  ANYCONDITION: '**ANYCONDITION** (abbrev: ANYCOND) condition — Matches any condition not handled by a more specific ON-unit.',
  ANYCOND: '**ANYCOND** — Abbreviation for ANYCONDITION.',
  ATTENTION: '**ATTENTION** condition — Raised when an attention interrupt is received from the system operator.',
  CONFORMANCE: '**CONFORMANCE** condition — Raised for XML/JSON conformance errors.',

  // --- Preprocessor directives -------------------------------------------------

  '%INCLUDE': '**%INCLUDE member;** — Includes source text from a library member at compile time. Equivalent to a source-level COPY.',
  '%IF': '**%IF condition %THEN ... [%ELSE ...] %ENDIF;** — Conditional compilation block.',
  '%DO': '**%DO;** — Begins a compile-time DO group in a preprocessor procedure.',
  '%END': '**%END;** — Closes a compile-time %DO group or %PROCEDURE.',
  '%DECLARE': '**%DECLARE name CHARACTER;** — Declares a compile-time (preprocessor) variable for text substitution.',
  '%GOTO': '**%GOTO label;** — Unconditional branch at compile time.',
  '%PROCEDURE': '**%PROCEDURE** — Begins a compile-time preprocessor procedure.',
  '%RETURN': '**%RETURN [(expr)];** — Returns from a compile-time preprocessor procedure.',
  '%ACTIVATE': '**%ACTIVATE name;** — Activates a preprocessor variable so that its value is substituted in subsequent source text.',
  '%DEACTIVATE': '**%DEACTIVATE name;** — Deactivates preprocessor substitution for the named variable.',
  '%NOTE': '**%NOTE(message [, severity]);** — Emits a compile-time informational message in the listing.',
  '%PROCESS': '**%PROCESS** (or `*PROCESS`) — Specifies compile-time options on the first source record.',
  '%SKIP': '**%SKIP [(n)];** — Skips n lines in the compiler listing (default 1).',
  '%PAGE': '**%PAGE;** — Advances to a new page in the compiler listing.',
  '%PRINT': '**%PRINT;** — Resumes printing of source lines in the compiler listing.',
  '%NOPRINT': '**%NOPRINT;** — Suppresses printing of source lines in the compiler listing.',
  '%POP': '**%POP;** — Restores a previously pushed compiler listing print state.',
  '%PUSH': '**%PUSH;** — Saves the current compiler listing print state.',

  // --- Built-in functions (most frequently used) --------------------------------

  SUBSTR: '**SUBSTR(str, start [, len])** — Returns a substring. Also a pseudo-variable on the left side of assignment.\n\nExample: `SUBSTR(s, 1, 3) = \'ABC\';`',
  LENGTH: '**LENGTH(string)** — Returns the current length of a VARYING string, or the declared length of a fixed string.',
  ADDR: '**ADDR(var)** — Returns a POINTER to the storage location of the variable.',
  ADDRBASED: '**ADDRBASED(ptr)** — Returns the POINTER value of the variable addressed by ptr.',
  NULL: '**NULL()** — Returns a null POINTER value.',
  SYSNULL: '**SYSNULL()** — Returns the system null pointer (equivalent to NULL() on most platforms).',
  ABS: '**ABS(x)** — Returns the absolute value of x.',
  MAX: '**MAX(x, y, ...)** — Returns the largest of the given numeric values.',
  MIN: '**MIN(x, y, ...)** — Returns the smallest of the given numeric values.',
  MOD: '**MOD(x, y)** — Returns x modulo y (remainder after division).',
  SQRT: '**SQRT(x)** — Returns the square root of x.',
  EXP: '**EXP(x)** — Returns e raised to the power x.',
  LOG: '**LOG(x)** — Returns the natural logarithm of x.',
  LOG2: '**LOG2(x)** — Returns the base-2 logarithm of x.',
  LOG10: '**LOG10(x)** — Returns the base-10 logarithm of x.',
  SIN: '**SIN(x)** — Returns the sine of x (x in radians).',
  COS: '**COS(x)** — Returns the cosine of x (x in radians).',
  TAN: '**TAN(x)** — Returns the tangent of x (x in radians).',
  ATAN: '**ATAN(x [, y])** — Returns the arctangent of x, or of x/y.',
  FLOOR: '**FLOOR(x)** — Returns the largest integer ≤ x.',
  CEIL: '**CEIL(x)** — Returns the smallest integer ≥ x.',
  ROUND: '**ROUND(x, n)** — Returns x rounded to n decimal digits.',
  TRUNC: '**TRUNC(x)** — Truncates x toward zero, returning the integer part.',
  SIGN: '**SIGN(x)** — Returns -1, 0, or 1 depending on the sign of x.',
  INDEX: '**INDEX(string, search [, start])** — Returns the position of search within string, or 0 if not found.',
  VERIFY: '**VERIFY(string, ref [, start])** — Returns the position of the first character in string NOT in ref, or 0.',
  TRANSLATE: '**TRANSLATE(string [, to [, from]])** — Translates characters in a string using a mapping table.',
  TRIM: '**TRIM(string [, leading [, trailing]])** — Removes leading and/or trailing characters (default: spaces).',
  LTRIM: '**LTRIM(string [, pad])** — Removes leading pad characters (default: spaces).',
  RTRIM: '**RTRIM(string [, pad])** — Removes trailing pad characters (default: spaces).',
  HIGH: '**HIGH(n)** — Returns a CHARACTER string of n bytes all equal to X\'FF\'.',
  LOW: '**LOW(n)** — Returns a CHARACTER string of n bytes all equal to X\'00\'.',
  HEX: '**HEX(string [, sep])** — Returns the hexadecimal representation of a character or bit string.',
  UNSPEC: '**UNSPEC(var)** — Returns or sets the internal bit-string representation of any variable.',
  SOURCEFILE: '**SOURCEFILE()** — Returns the name of the current source file as a character string.',
  SOURCELINE: '**SOURCELINE()** — Returns the current source line number as a FIXED BIN(31).',
  ONCODE: '**ONCODE()** — Returns the numeric condition code of the most recently raised condition.',
  ONFILE: '**ONFILE()** — Returns the name of the file involved in the most recently raised file condition.',
  ONLOC: '**ONLOC()** — Returns the program location string where the most recently raised condition occurred.',
  ONSOURCE: '**ONSOURCE()** — Returns (or sets, as pseudo-variable) the source string for CONVERSION conditions.',
  ONCHAR: '**ONCHAR()** — Returns (or sets) the offending character for a CONVERSION condition.',
  PROD: '**PROD(array)** — Returns the product of all elements in an array.',
  SUM: '**SUM(array)** — Returns the sum of all elements in an array.',
  ALLOCATION: '**ALLOCATION(var)** — Returns the number of currently allocated generations of a CONTROLLED variable.',
  EMPTY: '**EMPTY()** — Returns an empty AREA (used to initialize an AREA variable).',
  ENTRYADDR: '**ENTRYADDR(entry)** — Returns a POINTER to the code address of the specified entry.',
  MAXLENGTH: '**MAXLENGTH(string)** — Returns the declared maximum length of a VARYING string.',
  POINTER: '**POINTER(offset, area)** — Converts an OFFSET to a POINTER by adding the AREA base address.',
  COLLATE: '**COLLATE()** — Returns a 256-character string representing the entire character collating sequence.',
  BOOL: '**BOOL(x, y, op)** — Performs a boolean operation (op) on each bit of two bit strings x and y.',
  IMAG: '**IMAG(z)** — Returns the imaginary part of a complex number z.',
  CONJG: '**CONJG(z)** — Returns the complex conjugate of z.',
  DATETIME: '**DATETIME([format])** — Returns the current date and time as a formatted string.',
  DAYS: '**DAYS(date [, format])** — Converts a date string to the number of days since a reference date.',
  VALID: '**VALID(string, picture)** — Returns 1B if string conforms to the picture specification, 0B otherwise.',
};

// -- Monarch tokenizer ---------------------------------------------------------

export const PLI_HILITE = {
  defaultToken: '',
  ignoreCase: true,

  // Statement and control-flow keywords
  keywords: [
    'PROCEDURE', 'PROC', 'XPROC', 'XPROCEDURE', 'PACKAGE',
    'BEGIN', 'END',
    'DO', 'WHILE', 'UNTIL', 'TO', 'BY', 'UPTHRU', 'DOWNTHRU', 'REPEAT',
    'IF', 'THEN', 'ELSE',
    'SELECT', 'WHEN', 'OTHERWISE', 'OTHER',
    'CALL', 'RETURN', 'STOP', 'EXIT', 'GOTO', 'GO', 'ITERATE', 'LEAVE',
    'DECLARE', 'DCL', 'XDECLARE', 'XDCL', 'DEFAULT', 'DFT',
    'DEFINE', 'XDEFINE',
    'ALLOCATE', 'ALLOC', 'FREE',
    'ON', 'REVERT', 'RESIGNAL', 'SIGNAL',
    'GET', 'PUT', 'READ', 'WRITE', 'REWRITE', 'LOCATE',
    'OPEN', 'CLOSE', 'DELETE', 'FLUSH',
    'FETCH', 'RELEASE', 'DELAY', 'WAIT',
    'ATTACH', 'DETACH', 'CANCEL', 'THREAD',
    'ASSERT', 'DISPLAY',
    'EXEC',
    'FORMAT', 'QUALIFY', 'REINIT',
    'ENTRY', 'OPTIONS', 'EXPORTS', 'RESERVES',
    'FILE', 'INTO', 'FROM', 'IN', 'SET', 'KEY', 'KEYTO', 'KEYFROM',
    'TITLE', 'COPY', 'SKIP', 'IGNORE', 'SNAP', 'SYSTEM',
    'DATA', 'EDIT', 'LIST', 'STRING', 'REPLY', 'PAGE', 'LINE',
    'AND', 'OR', 'NOT',
    'ALIAS', 'UNION',
    'TRUE', 'FALSE', 'COMPARE', 'UNREACHABLE', 'TEXT',
  ],

  // Data type and variable attribute keywords
  attributes: [
    'FIXED', 'FLOAT', 'DECIMAL', 'DEC', 'BINARY', 'BIN',
    'CHARACTER', 'CHAR', 'BIT', 'GRAPHIC', 'UCHAR', 'WIDECHAR', 'AREA',
    'PICTURE', 'PIC', 'WIDEPIC',
    'REAL', 'COMPLEX',
    'POINTER', 'PTR', 'OFFSET', 'LABEL',
    'VARYING', 'VAR', 'VARYING4', 'VARYINGZ', 'VARZ', 'NONVARYING',
    'ALIGNED', 'UNALIGNED', 'UNAL',
    'SIGNED', 'UNSIGNED',
    'STATIC', 'AUTOMATIC', 'AUTO', 'BASED', 'CONTROLLED', 'CTL',
    'DEFINED', 'DEF', 'EXTERNAL', 'EXT', 'INTERNAL', 'INT',
    'BUILTIN', 'PARAMETER', 'VARIABLE', 'LIMITED', 'GENERIC',
    'CONDITION', 'TASK', 'EVENT',
    'SEQUENTIAL', 'SEQL', 'DIRECT',
    'BUFFERED', 'BUF', 'UNBUFFERED', 'UNBUF',
    'KEYED', 'INPUT', 'OUTPUT', 'UPDATE', 'PRINT',
    'RECORD', 'STREAM',
    'ENVIRONMENT', 'ENV', 'EXCLUSIVE',
    'CONNECTED', 'NONCONNECTED', 'NATIVE', 'NONNATIVE',
    'ASSIGNABLE', 'NONASSIGNABLE', 'NONASGN', 'MEMBER',
    'DIMENSION', 'DIM',
    'INITIAL', 'INIT', 'INITACROSS',
    'LIKE', 'TYPE', 'ORDINAL', 'HANDLE',
    'RETURNS', 'PRECISION', 'PREC', 'POSITION', 'POS',
    'DATE', 'STRUCTURE', 'STRUCT',
    'VALUE', 'VALUELIST', 'VALUELISTFROM', 'VALUERANGE',
    'RECURSIVE', 'MAIN', 'BYADDR', 'BYVALUE', 'DESCRIPTOR', 'NODESCRIPTOR',
    'REENTRANT', 'REDUCIBLE', 'IRREDUCIBLE', 'NORETURN',
    'FETCHABLE', 'RENT', 'AMODE31', 'AMODE64',
    'INLINE', 'NOINLINE', 'ORDER', 'REORDER',
    'ASSEMBLER', 'ASM', 'COBOL', 'FORTRAN', 'NOEXECOPS', 'WINMAIN', 'INTER',
    'LINKAGE', 'CDECL', 'OPTLINK', 'STDCALL',
    'CMPAT', 'NOMAP', 'NOMAPIN', 'NOMAPOUT',
    'DLLINTERNAL', 'FROMALIEN', 'RETCODE', 'FROMALIEN',
    // Condition names
    'ANYCONDITION', 'ANYCOND', 'ASSERTION', 'ATTENTION',
    'CONFORMANCE', 'CONVERSION', 'ERROR', 'FINISH',
    'FIXEDOVERFLOW', 'FOFL', 'INVALIDOP',
    'OVERFLOW', 'OFL', 'UNDERFLOW', 'UFL',
    'SIZE', 'STORAGE', 'STRINGRANGE', 'STRINGSIZE', 'SUBSCRIPTRANGE',
    'ZERODIVIDE', 'ZDIV',
    'ENDFILE', 'ENDPAGE',
    'UNDEFINEDFILE', 'UNDF', 'TRANSMIT',
    // XML/JSON attributes
    'XMLCONTENT', 'XMLIGNORE', 'XMLNAME', 'XMLATTR', 'XMLOMIT',
    'JSONIGNORE', 'JSONTRIMR', 'JSONNAME', 'JSONNULL', 'JSOMOMIT',
    'NULLINIT', 'NOINIT', 'INDFOR', 'BIGENDIAN', 'LITTLEENDIAN',
    'BACKWARDS', 'NORMAL', 'OPTIONAL', 'TRANSIENT',
    'OUTONLY', 'INONLY', 'INOUT',
    'DIMACROSS', 'RANGE', 'DESCRIPTORS',
  ],

  // Built-in function names (not duplicated in keywords or attributes)
  builtins: [
    'ABS', 'ACOS', 'ADDR', 'ADDRBASED', 'ADDRDATA',
    'ALLOCATION', 'ASIN', 'ATAN', 'ATAND', 'ATANH',
    'BOOL', 'BYTE',
    'CEIL', 'CHECK', 'COLLATE', 'COMPLETION', 'CONJG', 'COS', 'COSD', 'COSH',
    'DATETIME', 'DAYS', 'DAYSTODATE', 'DAYSTOSECS',
    'EMPTY', 'ENTRYADDR', 'EPSILON', 'ERF', 'ERFC', 'EXP',
    'FLOOR',
    'HEX', 'HIGH', 'IMAG', 'INDEX',
    'LENGTH', 'LINENO', 'LOG', 'LOG10', 'LOG2', 'LOW', 'LOWER', 'LTRIM',
    'MAXLENGTH', 'MAX', 'MIN', 'MOD',
    'NULL',
    'ONCHAR', 'ONCODE', 'ONCONDCOND', 'ONCONDID', 'ONCOUNT', 'ONFILE', 'ONINFO', 'ONKEY', 'ONLOC', 'ONSOURCE',
    'PLACE', 'POINTER', 'POINTERADD', 'POINTERVAL', 'POLY', 'PRESENT', 'PROD', 'PUTENV',
    'ROUND', 'RTRIM',
    'SEARCH', 'SEARCHR', 'SIGN', 'SIN', 'SIND', 'SINH', 'SOURCEFILE', 'SOURCELINE', 'SQRT', 'SUBSTR', 'SUM', 'SYSNULL',
    'TAN', 'TAND', 'TANH', 'TIME', 'TRANSLATE', 'TRIM', 'TRUNC',
    'UNALLOCATED', 'UNSPEC',
    'VALID', 'VARGLIST', 'VARGLISTSIZE', 'VERIFY', 'VERIFYR',
    'WCHAR', 'WCHARVAL',
  ],

  tokenizer: {
    root: [
      // Block comments /* ... */
      [/\/\*/, 'pli-comment', '@blockComment'],

      // Line comments //
      [/\/\/.*$/, 'pli-comment'],

      // *PROCESS / *PROCINC compiler options record (start of line)
      [/^\s*\*PROC(?:INC)?\b.*$/, 'pli-preprocessor'],

      // Preprocessor directives starting with %
      [/%[A-Z][A-Z0-9]*/, 'pli-preprocessor'],

      // String literals — single-quoted (with optional type suffix after closing quote)
      [/'/, 'pli-string', '@singleString'],

      // String literals — double-quoted
      [/"/, 'pli-string', '@doubleString'],

      // Numeric literals: integer, decimal, floating-point with optional exponent and type suffix
      [/(?:\d[\d_]*(?:\.[\d_]+)?|\.[\d_]+)(?:[eEsEdDqQ][-+]?\d+)?(?:[bBiI]*)/, 'pli-number'],

      // Identifiers: match keywords, attributes, builtins, then fall through to default
      [/[A-Z_$@#][A-Z0-9_$@#]*/, {
        cases: {
          '@keywords':   'pli-keyword',
          '@attributes': 'pli-attribute',
          '@builtins':   'pli-builtin',
          '@default':    '',
        }
      }],

      // Operators: arithmetic, comparison, boolean, assignment
      [/[+\-*\/=<>!^¬&|]/, 'pli-operator'],
      [/[,;:().\[\]{}]/, 'pli-operator'],

      // Whitespace (passthrough)
      [/\s+/, ''],
    ],

    blockComment: [
      [/[^*/]+/, 'pli-comment'],
      [/\*\//, 'pli-comment', '@pop'],
      [/[*/]/, 'pli-comment'],
    ],

    // Single-quoted strings; '' is an escaped single quote; optional type suffix (X, B, G, etc.)
    singleString: [
      [/''/, 'pli-string'],
      [/[^']+/, 'pli-string'],
      [/'[A-Za-z]*/, 'pli-string', '@pop'],
    ],

    // Double-quoted strings; "" is an escaped double quote; optional type suffix
    doubleString: [
      [/""/, 'pli-string'],
      [/[^"]+/, 'pli-string'],
      [/"[A-Za-z]*/, 'pli-string', '@pop'],
    ],
  }
};
