/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

/**
 * Monarch tokenizer and hover documentation for IBM High Level Assembler (HLASM) source files.
 *
 * HLASM statement layout (fixed-column format):
 *   Col  1-8  : Name field (label / symbol)
 *   Col  10-14: Operation field (mnemonic)
 *   Col  16-71: Operand field
 *   Col  73-80: Identification / sequence field
 *
 * Token classes emitted:
 *   hlasm-comment     --  full-line comments (col 1 = *) and end-of-line remarks
 *   hlasm-label       --  name-field symbols and sequence symbols
 *   hlasm-directive   --  assembler directives (CSECT, DC, DS, EQU, USING, ...)
 *   hlasm-macro-inst  --  macro and conditional assembly instructions
 *                      (MACRO, MEND, IF, ENDIF, AIF, AGO, ANOP, GBLA/B/C, ...)
 *   hlasm-keyword     --  machine instruction mnemonics (LR, ST, BNE, ...)
 *   hlasm-register    --  register references (R0-R15, Rn notation)
 *   hlasm-string      --  character literals enclosed in apostrophes
 *   hlasm-number      --  self-defining terms and hex literals (X'...', B'...', C'...')
 *   hlasm-operator    --  = , ( ) + - * / . notation
 *   hlasm-variable    --  variable symbols (&name)
 *   hlasm-seq         --  sequence symbols (.name)
 *   hlasm-cont        --  continuation marker X in column 72
 */

// -- Hover documentation -----------------------------------------------------

/**
 * Assembler directives with hover documentation.
 * Keys match the uppercase mnemonic exactly.
 */
export const HLASM_DIRECTIVES: Record<string, string> = {
  ACONTROL: '**ACONTROL** -- Sets assembler processing options inline in source.',
  ADATA: '**ADATA** -- Writes an associated-data record to SYSADATA for use by debuggers and cross-referencers.',
  AINSERT: '**AINSERT** -- Inserts a generated statement into the assembler input stream. Used inside macros to inject code dynamically.',
  ALIAS: '**ALIAS** -- Assigns an alternate external name to a symbol, exported to the object deck for linker resolution.',
  AMODE: '**AMODE** -- Addressing mode for the preceding CSECT/RSECT. Values: 24, 31, 64, or ANY.',
  CATTR: '**CATTR** -- Class attribute (GOFF only). Associates code or data with a named program-object class.',
  CCW: '**CCW** -- Channel Command Word (format 0). 8-byte I/O control block for EXCP channel programs. RMODE 24 only.',
  CCW0: '**CCW0** -- Channel Command Word (format 0). 8-byte I/O control block for EXCP channel programs. RMODE 24 only.',
  CCW1: '**CCW1** -- Channel Command Word (format 1). Like CCW0 but supports 31-bit data addresses.',
  CEJECT: '**CEJECT** -- Conditional page-eject. Advances to a new listing page only if fewer than n lines remain.',
  CNOP: '**CNOP** -- Inserts NOP instructions to align the location counter to a halfword, fullword, or doubleword boundary.',
  COM: '**COM** -- Initiates or continues a blank common section.',
  COPY: '**COPY** -- Copies source statements from a library member into the current assembly.',
  CSECT: '**CSECT** -- Begins or continues an executable (relocatable) code section.',
  CXD: '**CXD** -- Reserves a fullword the linker fills with the combined length of all external dummy sections.',
  DC: '**DC** -- Define Constant. Allocates initialized storage. Type codes: C=char, X=hex, F=fullword, H=halfword, A=addr, D=double, P=packed, Z=zoned.',
  DROP: '**DROP** -- Cancels a USING base-register designation.',
  DS: '**DS** -- Define Storage. Reserves uninitialized storage. Same type/length syntax as DC.',
  DSECT: '**DSECT** -- Dummy section. Describes storage layout without generating object code. Used to map control blocks.',
  DXD: '**DXD** -- Declares an external dummy section whose aggregate length the linker resolves into a CXD slot.',
  EJECT: '**EJECT** -- Forces a page-break in the assembler listing.',
  END: '**END** -- Ends the assembly. Optionally specifies the entry-point address.',
  ENTRY: '**ENTRY** -- Declares symbols in this module as externally visible entry points for the linker.',
  EQU: '**EQU** -- Assigns a value and optional attributes to a symbol without allocating storage.',
  EXITCTL: '**EXITCTL** -- Passes control information to a user-written assembler exit.',
  EXTRN: '**EXTRN** -- Declares symbols defined in another module, generating external references for the linker.',
  ICTL: '**ICTL** -- Overrides default statement-field boundaries. Must be the first non-comment statement.',
  ISEQ: '**ISEQ** -- Enables source-record sequence checking within the specified identification columns.',
  LOCTR: '**LOCTR** -- Redirects output to a named sub-section within the current control section.',
  LTORG: '**LTORG** -- Emits all pending literals at the current location. If omitted, the pool is placed at END.',
  MACRO: '**MACRO** -- Begins a macro definition. The next line is the prototype; MEND closes it.',
  MEND: '**MEND** -- Ends a macro definition.',
  MEXIT: '**MEXIT** -- Exits a macro expansion early.',
  MHELP: '**MHELP** -- Controls macro debugging diagnostics via a binary option mask.',
  MNOTE: '**MNOTE** -- Issues a user-defined severity message in the assembler listing. Severity >= 8 increments the return code.',
  OPSYN: '**OPSYN** -- Creates an alias for an instruction, directive, or macro name.',
  ORG: '**ORG** -- Sets the location counter to a specified address, optionally with alignment and offset.',
  POP: '**POP** -- Restores PRINT or USING settings previously saved by PUSH.',
  PRINT: '**PRINT** -- Controls assembler listing options: ON/OFF, GEN/NOGEN, DATA/NODATA.',
  PUNCH: '**PUNCH** -- Writes a record directly to SYSPUNCH without assembling it.',
  PUSH: '**PUSH** -- Saves the current PRINT or USING state for later restoration with POP.',
  REPRO: '**REPRO** -- Copies the next source record verbatim to SYSPUNCH.',
  RMODE: '**RMODE** -- Residence mode: 24=below 16 MB, 31=below 2 GB, ANY=linker decides.',
  RSECT: '**RSECT** -- Read-only section. Verifies no self-modifying instructions are present. Use for LPA or common storage.',
  SPACE: '**SPACE** -- Inserts blank lines in the assembler listing.',
  START: '**START** -- Starts the first control section, optionally setting the initial location counter value.',
  TITLE: '**TITLE** -- Sets the assembler listing page heading and optional 8-character deck ID.',
  USING: '**USING** -- Establishes base-register addressability so the assembler can compute displacements automatically.',
  WXTRN: '**WXTRN** -- Weak external. Like EXTRN but unresolved references are treated as zero instead of errors.',
  XATTR: '**XATTR** -- Extended attribute (GOFF). Attaches linkage attributes to an external symbol.',
};

/**
 * Conditional-assembly and macro instructions with hover documentation.
 */
export const HLASM_MACRO_INSTS: Record<string, string> = {
  AIF: '**AIF**  --  Assembler IF. Conditional branch based on a logical expression evaluated at assembly time. Jumps to a sequence symbol if the condition is true. Part of conditional assembly; not a machine instruction.',
  AIFB: '**AIFB**  --  Synonym of AIF. Identical behavior; supported for compatibility.',
  AGO: '**AGO**  --  Assembler GO. Unconditional branch to a sequence symbol at assembly time. Used to skip over code sections during conditional assembly.',
  ANOP: '**ANOP**  --  Assembler No-OPeration. Acts as a target for AGO/AIF branches (provides a sequence symbol) without generating any object code.',
  ASPACE: '**ASPACE**  --  Assembler SPACE. Inserts blank lines in the listing during a macro expansion, equivalent to SPACE but valid inside macro bodies.',
  AEJECT: '**AEJECT**  --  Assembler EJECT. Forces a listing page-break from within a macro expansion.',
  ACTR: '**ACTR**  --  Assembler CounTeR. Sets the maximum number of AIF/AGO branches the assembler will follow in a single expansion. Prevents infinite loops. Default is 4096.',
  AREAD: '**AREAD**  --  Assembler READ. Reads the next source record into a SETC variable at assembly time. Used for generative programming where input data drives code generation.',
  GBLA: '**GBLA**  --  Global Arithmetic SET symbol declaration. Declares one or more `&name` variables as global arithmetic (integer) variables, shared across all macro invocations in the assembly.',
  GBLB: '**GBLB**  --  Global Binary SET symbol declaration. Declares one or more `&name` variables as global binary (boolean, 0/1) variables.',
  GBLC: '**GBLC**  --  Global Character SET symbol declaration. Declares one or more `&name` variables as global character-string variables.',
  LCLA: '**LCLA**  --  Local Arithmetic SET symbol declaration. Declares local arithmetic variables, scoped to the current macro invocation.',
  LCLB: '**LCLB**  --  Local Binary SET symbol declaration. Declares local boolean variables, scoped to the current macro invocation.',
  LCLC: '**LCLC**  --  Local Character SET symbol declaration. Declares local character-string variables, scoped to the current macro invocation.',
  SETA: '**SETA**  --  SET Arithmetic. Assigns an integer value to an arithmetic SET symbol. Supports arithmetic operators `+ - * /` and built-in functions like `FIND` and `INDEX`.',
  SETAF: '**SETAF**  --  SET Arithmetic Func. Calls an external function module to compute the value assigned to an arithmetic SET symbol.',
  SETB: '**SETB**  --  SET Binary. Assigns a boolean (0 or 1) value to a binary SET symbol. The operand is a logical expression: `(expression)` or a 0/1 literal.',
  SETC: '**SETC**  --  SET Character. Assigns a character string to a character SET symbol. Supports concatenation, substring notation, and type-attribute queries.',
  SETCF: '**SETCF**  --  SET Character Func. Calls an external function module to compute the character string assigned to a SETC symbol.',
};

/**
 * Commonly used z/Architecture machine instruction mnemonics with hover documentation.
 * Covers the instructions most frequently encountered in z/OS systems-programming assembler.
 */
export const HLASM_INSTRUCTIONS: Record<string, string> = {
  // Load/Store
  L:    '**L**  --  Load. Loads a 32-bit value from storage into a GPR. `L R1,D2(X2,B2)`',
  LR:   '**LR**  --  Load Register. Copies the 32-bit content of one GPR to another. `LR R1,R2`',
  LH:   '**LH**  --  Load Halfword. Sign-extends a 16-bit memory value into a 32-bit GPR.',
  LHI:  '**LHI**  --  Load Halfword Immediate. Sign-extends a 16-bit immediate into a 32-bit GPR.',
  LG:   '**LG**  --  Load (64-bit). Loads a 64-bit value from storage into a GPR.',
  LGR:  '**LGR**  --  Load Register (64-bit). Copies the full 64-bit content of a GPR.',
  LGF:  '**LGF**  --  Load Fullword -> 64-bit. Sign-extends a 32-bit memory value into a 64-bit GPR.',
  LGFR: '**LGFR**  --  Load Fullword Register -> 64-bit. Sign-extends the lower 32 bits of a GPR into 64 bits.',
  LGH:  '**LGH**  --  Load Halfword -> 64-bit. Sign-extends a 16-bit memory value into a 64-bit GPR.',
  LGHI: '**LGHI**  --  Load Halfword Immediate -> 64-bit. Sign-extends a 16-bit immediate into 64 bits.',
  LA:   '**LA**  --  Load Address. Computes an effective address `D2(X2,B2)` and loads it into a GPR. Does not access storage; the result is always 31-bit.',
  LAY:  '**LAY**  --  Load Address (long displacement). Like LA but with a 20-bit signed displacement.',
  LAG:  '**LAG**  --  Load Address 64-bit. Computes and loads a 64-bit effective address.',
  LAM:  '**LAM**  --  Load Access Multiple. Loads a range of access registers from storage.',
  LARL: '**LARL**  --  Load Address Relative Long. Loads the address of a label into a GPR using a PC-relative displacement (no base register needed).',
  LAE:  '**LAE**  --  Load Address Extended. Loads both a GPR and an access register from a storage address.',
  ST:   '**ST**  --  Store. Stores the low 32 bits of a GPR to storage.',
  STG:  '**STG**  --  Store (64-bit). Stores all 64 bits of a GPR to storage.',
  STH:  '**STH**  --  Store Halfword. Stores the low 16 bits of a GPR to storage.',
  STC:  '**STC**  --  Store Character. Stores the low 8 bits of a GPR to storage.',
  STCM: '**STCM**  --  Store Characters under Mask. Stores selected bytes of a GPR based on a 4-bit byte mask.',
  STM:  '**STM**  --  Store Multiple. Stores a consecutive range of GPRs to storage (wraps at 15->0).',
  STMG: '**STMG**  --  Store Multiple (64-bit). Stores full 64-bit GPR range to storage.',
  LM:   '**LM**  --  Load Multiple. Loads a consecutive range of GPRs from storage.',
  LMG:  '**LMG**  --  Load Multiple (64-bit). Loads full 64-bit GPR range from storage.',
  LMH:  '**LMH**  --  Load Multiple High. Loads the high halves of a range of GPRs from storage.',
  MVC:  '**MVC**  --  Move Character. Copies up to 256 bytes from one storage location to another. `MVC D1(L,B1),D2(B2)`. The copy proceeds left-to-right, byte by byte.',
  MVCL: '**MVCL**  --  Move Character Long. Copies up to 16 MB; padding character can be specified. Operands in even-odd register pairs.',
  MVCP: '**MVCP**  --  Move to Primary. Copies bytes from a secondary address space to the primary address space.',
  MVCS: '**MVCS**  --  Move to Secondary. Copies bytes from the primary address space to a secondary address space.',
  MVI:  '**MVI**  --  Move Immediate. Stores a 1-byte immediate value to storage.',
  MVHHI: '**MVHHI**  --  Move Halfword Halfword Immediate. Stores a 16-bit immediate to a halfword in storage.',
  MVHI: '**MVHI**  --  Move Halfword Immediate. Stores a sign-extended 16-bit immediate as a 32-bit fullword in storage.',
  MVGHI: '**MVGHI**  --  Move Halfword Immediate (64-bit). Stores a sign-extended 16-bit immediate as a 64-bit doubleword in storage.',
  ICM:  '**ICM**  --  Insert Characters under Mask. Loads selected bytes from storage into a GPR under a 4-bit byte mask. Sets the condition code based on the result.',
  IC:   '**IC**  --  Insert Character. Inserts a single byte from storage into the low 8 bits of a GPR without clearing the other bytes.',
  IIHH: '**IIHH / IIHL / IILH / IILL**  --  Insert Immediate (Half). Inserts a 16-bit immediate into a quarter of a 64-bit GPR without affecting the other 48 bits.',
  IIHL: '**IIHL**  --  Insert Immediate High-Low. Inserts a 16-bit immediate into bits 16-31 of a 64-bit GPR.',
  IILH: '**IILH**  --  Insert Immediate Low-High. Inserts a 16-bit immediate into bits 32-47 of a 64-bit GPR.',
  IILL: '**IILL**  --  Insert Immediate Low-Low. Inserts a 16-bit immediate into the low 16 bits of a 64-bit GPR.',
  // Arithmetic
  A:    '**A**  --  Add (32-bit). Adds a fullword in storage to a GPR. Sets condition code.',
  AR:   '**AR**  --  Add Register (32-bit). Adds two GPRs. Sets condition code.',
  AH:   '**AH**  --  Add Halfword. Sign-extends a halfword from storage and adds to a GPR.',
  AHI:  '**AHI**  --  Add Halfword Immediate. Adds a 16-bit signed immediate to a 32-bit GPR.',
  AG:   '**AG**  --  Add (64-bit). Adds a doubleword in storage to a 64-bit GPR.',
  AGR:  '**AGR**  --  Add Register (64-bit). Adds two 64-bit GPRs.',
  AGFI: '**AGFI**  --  Add Fullword Immediate (64-bit). Adds a sign-extended 32-bit immediate to a 64-bit GPR.',
  AGHI: '**AGHI**  --  Add Halfword Immediate (64-bit). Adds a 16-bit immediate to a 64-bit GPR.',
  AGFR: '**AGFR**  --  Add Fullword Register (64-bit). Sign-extends the lower 32 bits of one GPR and adds to a 64-bit GPR.',
  AL:   '**AL**  --  Add Logical (32-bit). Like A but treated as unsigned; no overflow exception.',
  ALR:  '**ALR**  --  Add Logical Register (32-bit). Adds two GPRs as unsigned 32-bit values.',
  ALG:  '**ALG**  --  Add Logical (64-bit). Adds a doubleword as unsigned 64-bit value.',
  ALGR: '**ALGR**  --  Add Logical Register (64-bit). Unsigned 64-bit GPR add.',
  ALGF: '**ALGF**  --  Add Logical Fullword (64-bit). Zero-extends a 32-bit memory value and adds to a 64-bit GPR.',
  ALGFR: '**ALGFR**  --  Add Logical Fullword Register (64-bit). Zero-extends the lower 32 bits of one GPR and adds to a 64-bit GPR.',
  ALHHLR: '**ALHHLR**  --  Add Logical High-High-Low Register. Adds the high halves of two GPRs.',
  ALY:  '**ALY**  --  Add Logical (long displacement). Like AL with 20-bit displacement.',
  S:    '**S**  --  Subtract (32-bit). Subtracts a fullword in storage from a GPR.',
  SR:   '**SR**  --  Subtract Register (32-bit). Subtracts one GPR from another.',
  SH:   '**SH**  --  Subtract Halfword. Sign-extends a halfword from storage and subtracts from a GPR.',
  SHI:  '**SHI**  --  Subtract Halfword Immediate (synonym of AHI with negated immediate).',
  SG:   '**SG**  --  Subtract (64-bit).',
  SGR:  '**SGR**  --  Subtract Register (64-bit).',
  SGFR: '**SGFR**  --  Subtract Fullword Register (64-bit). Sign-extends lower 32 bits and subtracts.',
  SL:   '**SL**  --  Subtract Logical (32-bit). Unsigned subtract.',
  SLR:  '**SLR**  --  Subtract Logical Register (32-bit). Unsigned subtract of two GPRs.',
  SLG:  '**SLG**  --  Subtract Logical (64-bit).',
  SLGR: '**SLGR**  --  Subtract Logical Register (64-bit).',
  SLGFR: '**SLGFR**  --  Subtract Logical Fullword Register (64-bit).',
  M:    '**M**  --  Multiply (32x64). Multiplies a 32-bit GPR by a fullword in storage; 64-bit result in even-odd pair.',
  MR:   '**MR**  --  Multiply Register. Even-odd pair x GPR -> 64-bit result.',
  MH:   '**MH**  --  Multiply Halfword. Multiplies a GPR by a halfword; 32-bit result (no overflow check).',
  MHI:  '**MHI**  --  Multiply Halfword Immediate.',
  MG:   '**MG**  --  Multiply (64-bit). 64x64 -> 128-bit in even-odd pair.',
  MGR:  '**MGR**  --  Multiply Register (64-bit).',
  MGHI: '**MGHI**  --  Multiply Halfword Immediate (64-bit).',
  MS:   '**MS**  --  Multiply Single (32-bit). Multiplies two 32-bit values; 32-bit result (low half).',
  MSR:  '**MSR**  --  Multiply Single Register.',
  MSG:  '**MSG**  --  Multiply Single (64-bit). 64-bit x storage doubleword -> 64-bit result.',
  MSGR: '**MSGR**  --  Multiply Single Register (64-bit).',
  MSFI: '**MSFI**  --  Multiply Single Fullword Immediate.',
  MSGFI: '**MSGFI**  --  Multiply Single Fullword Immediate (64-bit).',
  D:    '**D**  --  Divide (64/32). Divides a 64-bit value in an even-odd GPR pair by a 32-bit storage operand.',
  DR:   '**DR**  --  Divide Register.',
  DL:   '**DL**  --  Divide Logical (unsigned) 64/32.',
  DLR:  '**DLR**  --  Divide Logical Register.',
  DLG:  '**DLG**  --  Divide Logical (128/64). Unsigned 128/64 -> quotient + remainder.',
  DLGR: '**DLGR**  --  Divide Logical Register (64-bit).',
  // Compare
  C:    '**C**  --  Compare (32-bit). Compares a GPR to a fullword in storage; sets condition code. No result stored.',
  CR:   '**CR**  --  Compare Register (32-bit). Compares two GPRs.',
  CH:   '**CH**  --  Compare Halfword. Sign-extends a halfword from storage and compares.',
  CHI:  '**CHI**  --  Compare Halfword Immediate. Compares a GPR to a 16-bit signed immediate.',
  CG:   '**CG**  --  Compare (64-bit).',
  CGR:  '**CGR**  --  Compare Register (64-bit).',
  CGFI: '**CGFI**  --  Compare Fullword Immediate (64-bit).',
  CGHI: '**CGHI**  --  Compare Halfword Immediate (64-bit).',
  CGFR: '**CGFR**  --  Compare Fullword Register (64-bit).',
  CL:   '**CL**  --  Compare Logical (32-bit). Unsigned comparison of a GPR to a fullword.',
  CLR:  '**CLR**  --  Compare Logical Register (32-bit).',
  CLG:  '**CLG**  --  Compare Logical (64-bit).',
  CLGR: '**CLGR**  --  Compare Logical Register (64-bit).',
  CLGFR: '**CLGFR**  --  Compare Logical Fullword Register (64-bit). Zero-extends lower 32 bits of one GPR.',
  CLM:  '**CLM**  --  Compare Logical under Mask. Compares selected bytes of a GPR with storage bytes under a 4-bit mask.',
  CLC:  '**CLC**  --  Compare Logical Character. Compares up to 256 bytes of storage.',
  CLCL: '**CLCL**  --  Compare Logical Character Long. Compares up to 16 MB; padding character supported.',
  CLI:  '**CLI**  --  Compare Logical Immediate. Compares a single byte in storage to an 8-bit immediate.',
  CLFI: '**CLFI**  --  Compare Logical Fullword Immediate. Unsigned compare of a GPR to a 32-bit immediate.',
  CLGFI: '**CLGFI**  --  Compare Logical Fullword Immediate (64-bit).',
  CRT:  '**CRT**  --  Compare and Trap (Register, 32-bit). Compares two GPRs and traps (program interrupt) if the condition is true rather than branching. Eliminates a branch.',
  CGRT: '**CGRT**  --  Compare and Trap Register (64-bit).',
  // Branch
  B:    '**B**  --  Branch (unconditional). Extended mnemonic for `BC 15,...`.',
  BR:   '**BR**  --  Branch Register (unconditional). Extended mnemonic for `BCR 15,R`.',
  BC:   '**BC**  --  Branch on Condition. Branches to an address if the condition code matches the mask. `BC 8,...` = branch if equal.',
  BCR:  '**BCR**  --  Branch on Condition Register. Branches to the address in a GPR if condition code matches mask. `BCR 15,R14` = branch to R14 unconditionally (i.e. return).',
  BCTR: '**BCTR**  --  Branch on CounT Register. Decrements a GPR and branches if not zero (32-bit counter). The branch target is in another GPR. `BCTR R,0` = no branch, just decrement.',
  BCTG: '**BCTG**  --  Branch on CounT (64-bit). Decrements a 64-bit GPR and branches if not zero.',
  BXH:  '**BXH**  --  Branch on indeX High. Adds an increment (odd GPR) to an index (GPR), then branches if the result is greater than the comparand (even GPR).',
  BXHG: '**BXHG**  --  Branch on indeX High (64-bit).',
  BXLE: '**BXLE**  --  Branch on indeX Low or Equal. Like BXH but branches when result <= comparand.',
  BXLEG: '**BXLEG**  --  Branch on indeX Low or Equal (64-bit).',
  BE:   '**BE**  --  Branch if Equal. Extended mnemonic for `BC 8,...`. CC = 0.',
  BNE:  '**BNE**  --  Branch if Not Equal. Extended mnemonic for `BC 7,...`.',
  BH:   '**BH**  --  Branch if High. Extended mnemonic for `BC 2,...`. CC = 2.',
  BNH:  '**BNH**  --  Branch if Not High. Extended mnemonic for `BC 13,...`.',
  BL:   '**BL**  --  Branch if Low. Extended mnemonic for `BC 4,...`. CC = 1.',
  BNL:  '**BNL**  --  Branch if Not Low. Extended mnemonic for `BC 11,...`.',
  BZ:   '**BZ**  --  Branch if Zero. Extended mnemonic for `BC 8,...`. Synonym of BE for condition-code contexts.',
  BNZ:  '**BNZ**  --  Branch if Not Zero. Extended mnemonic for `BC 7,...`.',
  BO:   '**BO**  --  Branch if Overflow. Extended mnemonic for `BC 1,...`. CC = 3.',
  BNO:  '**BNO**  --  Branch if No Overflow. Extended mnemonic for `BC 14,...`.',
  BRC:  '**BRC**  --  Branch Relative on Condition. PC-relative branch with immediate displacement; no base register needed.',
  BRCL: '**BRCL**  --  Branch Relative on Condition Long. PC-relative branch with 32-bit displacement.',
  JAS:  '**JAS**  --  Jump And Save (extended mnemonic). PC-relative branch-and-link using BRAS.',
  BRAS: '**BRAS**  --  Branch Relative And Save. Saves the return address (PC+1) in a GPR and branches via PC-relative displacement. Commonly used to establish addressability: `BRAS R12,*+4` then `USING *-4,R12`.',
  BRASL: '**BRASL**  --  Branch Relative And Save Long. Like BRAS with a 32-bit displacement.',
  BASR: '**BASR**  --  Branch And Save Register. Saves the return address in R1 and branches to the address in R2. `BASR R12,0` saves the current PC into R12 and falls through (base register setup).',
  BAS:  '**BAS**  --  Branch And Save. Like BASR but the target is a storage address.',
  BASSM: '**BASSM**  --  Branch And Save and Set Mode. Saves the return address + current AMODE in R1, then loads a new AMODE from the target address and branches. Used for AMODE switching.',
  BSM:  '**BSM**  --  Branch and Set Mode. Branches and changes AMODE; does not save the return address.',
  BAKR: '**BAKR**  --  Branch And Keep Registers. Saves the current register state on the linkage stack and branches. The pair with PR (Program Return). Used by authorized code for safe call/return.',
  PR:   '**PR**  --  Program Return. Restores registers from the linkage stack and returns from a BAKR call.',
  // Bitwise / logical
  N:    '**N**  --  AND (32-bit). Bitwise AND of a GPR with a fullword in storage.',
  NR:   '**NR**  --  AND Register (32-bit). Bitwise AND of two GPRs.',
  NG:   '**NG**  --  AND (64-bit). Bitwise AND of a 64-bit GPR with a doubleword in storage.',
  NGR:  '**NGR**  --  AND Register (64-bit).',
  NI:   '**NI**  --  AND Immediate. Bitwise AND of a storage byte with an 8-bit immediate.',
  NC:   '**NC**  --  AND Character. Bitwise AND of two storage fields (up to 256 bytes).',
  NIHH: '**NIHH**  --  AND Immediate High-High. ANDs bits 0-15 of a 64-bit GPR with a 16-bit immediate.',
  NIHL: '**NIHL**  --  AND Immediate High-Low. ANDs bits 16-31.',
  NILH: '**NILH**  --  AND Immediate Low-High. ANDs bits 32-47.',
  NILL: '**NILL**  --  AND Immediate Low-Low. ANDs the low 16 bits.',
  O:    '**O**  --  OR (32-bit). Bitwise OR of a GPR with a fullword.',
  OR:   '**OR**  --  OR Register (32-bit).',
  OG:   '**OG**  --  OR (64-bit).',
  OGR:  '**OGR**  --  OR Register (64-bit).',
  OI:   '**OI**  --  OR Immediate. Bitwise OR of a storage byte with an 8-bit immediate.',
  OC:   '**OC**  --  OR Character. Bitwise OR of two storage fields.',
  OIHH: '**OIHH**  --  OR Immediate High-High.',
  OIHL: '**OIHL**  --  OR Immediate High-Low.',
  OILH: '**OILH**  --  OR Immediate Low-High.',
  OILL: '**OILL**  --  OR Immediate Low-Low.',
  X:    '**X**  --  XOR (32-bit). Exclusive-OR of a GPR with a fullword.',
  XR:   '**XR**  --  XOR Register (32-bit). `XR R,R` sets R to zero efficiently.',
  XG:   '**XG**  --  XOR (64-bit).',
  XGR:  '**XGR**  --  XOR Register (64-bit). `XGR R,R` zeroes the 64-bit GPR.',
  XI:   '**XI**  --  XOR Immediate. Exclusive-OR of a storage byte with an 8-bit immediate.',
  XC:   '**XC**  --  XOR Character. Exclusive-OR of two storage fields. `XC AREA(len),AREA` zeroes the area.',
  // Shift
  SRL:  '**SRL**  --  Shift Right Logical (32-bit). Shifts low 32 bits right by 0-63 positions, filling with zeros.',
  SRLG: '**SRLG**  --  Shift Right Logical (64-bit).',
  SLL:  '**SLL**  --  Shift Left Logical (32-bit).',
  SLLG: '**SLLG**  --  Shift Left Logical (64-bit).',
  SRA:  '**SRA**  --  Shift Right Arithmetic (32-bit). Sign-extending right shift.',
  SRAG: '**SRAG**  --  Shift Right Arithmetic (64-bit).',
  SLA:  '**SLA**  --  Shift Left Arithmetic (32-bit). Sets overflow if sign bit changes.',
  SLAG: '**SLAG**  --  Shift Left Arithmetic (64-bit).',
  SRDL: '**SRDL**  --  Shift Right Double Logical. Right-shifts an even-odd GPR pair as a 64-bit value.',
  SLDA: '**SLDA**  --  Shift Left Double Arithmetic.',
  SRDA: '**SRDA**  --  Shift Right Double Arithmetic.',
  SLDL: '**SLDL**  --  Shift Left Double Logical.',
  // Translate / convert
  TR:   '**TR**  --  TRanslate. Replaces each byte of a field with the byte at the corresponding offset in a 256-byte translate table. Used for EBCDIC<->ASCII conversion and character classification.',
  TRT:  '**TRT**  --  TRanslate and Test. Scans a field, translates each byte via a table; stops when a nonzero table entry is found. Returns the address and value of the stop byte.',
  TRTE: '**TRTE**  --  Translate and Test Extended. Like TRT but handles 1-byte, 2-byte, and 4-byte table entries.',
  TRTR: '**TRTR**  --  Translate and Test Reverse. Like TRT but scans right-to-left.',
  TROT: '**TROT**  --  Translate One to Two. Converts a single-byte source string to a two-byte-per-character destination using a table.',
  TROO: '**TROO**  --  Translate One to One. Single-byte source and destination, extended function codes.',
  TRTO: '**TRTO**  --  Translate Two to One. Two-byte source mapped to one-byte destination.',
  TRTT: '**TRTT**  --  Translate Two to Two. Two-byte source mapped to two-byte destination.',
  PACK: '**PACK**  --  Converts zoned-decimal digits (one per byte) to packed-decimal format (two digits per byte). The sign nibble is placed in the low half of the last byte.',
  UNPK: '**UNPK**  --  Converts packed-decimal digits to zoned-decimal format.',
  CVB:  '**CVB**  --  Convert to Binary. Converts a packed-decimal doubleword in storage to a 32-bit binary integer in a GPR.',
  CVD:  '**CVD**  --  Convert to Decimal. Converts a 32-bit binary integer to a packed-decimal doubleword and stores it.',
  CVBG: '**CVBG**  --  Convert to Binary (64-bit). Converts a packed quadword to a 64-bit GPR.',
  CVDG: '**CVDG**  --  Convert to Decimal (64-bit). Converts to packed quadword.',
  // Decimal arithmetic
  AP:   '**AP**  --  Add Packed. Adds two packed-decimal fields in storage.',
  SP:   '**SP**  --  Subtract Packed.',
  MP:   '**MP**  --  Multiply Packed.',
  DP:   '**DP**  --  Divide Packed.',
  CP:   '**CP**  --  Compare Packed.',
  ZAP:  '**ZAP**  --  Zero and Add Packed. Zeroes the destination then adds the source packed-decimal field.',
  SRP:  '**SRP**  --  Shift and Round Packed. Shifts a packed-decimal field left or right by a specified number of digit positions with optional rounding.',
  ED:   '**ED**  --  EDit. Formats a packed-decimal field into a printable character string using an edit pattern.',
  EDMK: '**EDMK**  --  EDit and MarK. Like ED but also stores the address of the first significant digit into R1.',
  // String / search
  SRST: '**SRST**  --  Search String. Scans a string for a specified delimiter byte (in R0). Returns address of the delimiter or the end of the string.',
  SRSTU: '**SRSTU**  --  Search String Unicode. Like SRST for UTF-16 strings.',
  MVST: '**MVST**  --  Move String. Copies a string up to and including a specified delimiter byte (in R0).',
  CLST: '**CLST**  --  Compare Logical String. Compares two null-terminated strings byte-by-byte.',
  // Test
  TM:   '**TM**  --  Test under Mask. ANDs a storage byte with an 8-bit immediate mask; sets the condition code based on whether selected bits are all 0, mixed, or all 1.',
  TMY:  '**TMY**  --  Test under Mask (long displacement). Like TM with a 20-bit signed displacement.',
  TMHH: '**TMHH**  --  Test under Mask High-High. Tests bits 0-15 of a 64-bit GPR.',
  TMHL: '**TMHL**  --  Test under Mask High-Low. Tests bits 16-31.',
  TMLH: '**TMLH**  --  Test under Mask Low-High. Tests bits 32-47.',
  TMLL: '**TMLL**  --  Test under Mask Low-Low. Tests bits 48-63.',
  // Synchronization / atomics
  CS:   '**CS**  --  Compare and Swap (32-bit). Atomic: if storage = R1, swap storage <-> R3, CC=0; else load storage into R1, CC=1. Used to implement lock-free data structures.',
  CSG:  '**CSG**  --  Compare and Swap (64-bit).',
  CDS:  '**CDS**  --  Compare Double and Swap (2x32-bit). Atomic compare-and-swap on a 64-bit aligned even-odd pair.',
  CDSG: '**CDSG**  --  Compare Double and Swap (2x64-bit). Atomic 128-bit compare-and-swap.',
  // Privileged / system
  SPKA: '**SPKA**  --  Set PSW Key from Address. Loads a new storage protection key from the low bits of a GPR. Requires supervisor state.',
  MODESET: '**MODESET**  --  IBM macro (not a machine instruction). Switches CPU state between problem state and supervisor state. Common in SVC and authorized assembler routines.',
  SVC:  '**SVC**  --  SuperVisor Call. Generates a supervisor-call interrupt with the given interrupt code (0-255). Used to invoke z/OS services.',
  STIMER: '**STIMER**  --  IBM macro. Causes the task to wait for a specified interval or until a timer event.',
  ESTAEX: '**ESTAEX**  --  IBM macro. Establishes an Extended STAE (recovery) exit routine that is called when the task encounters an error.',
  WTO:  '**WTO**  --  Write To Operator (IBM macro). Issues a multi-line or single-line message to the system console and optionally to the job log.',
  ABEND: '**ABEND**  --  ABnormal END (IBM macro). Terminates the current task/job step abnormally with a user abend code. Can request a system dump.',
  ATTACH: '**ATTACH**  --  IBM macro. Creates a new z/OS task (subtask) and attaches it to the current task.',
  SDUMPX: '**SDUMPX**  --  IBM macro. Requests a supervisor dump (system dump) of the specified address space(s) and/or storage areas.',
  ALESERV: '**ALESERV**  --  IBM macro. Services the Access List Entry (ALE) for cross-memory addressing in AR mode.',
  // Miscellaneous
  NOP:  '**NOP**  --  No OPeration. Extended mnemonic for `BC 0,...`. Does nothing; used for alignment or patch space.',
  NOPR: '**NOPR**  --  No OPeration Register. Extended mnemonic for `BCR 0,R`. Two-byte no-op.',
  EX:   "**EX**  --  EXecute. Executes a single instruction at the target address with its second byte OR'd with the low byte of the executing GPR. Used to vary operand lengths at runtime.",
  EXRL: '**EXRL**  --  EXecute Relative Long. Like EX but the target is specified by a PC-relative displacement.',
  LNR:  '**LNR**  --  Load Negative Register. Loads the negated absolute value of a 32-bit GPR.',
  LNGR: '**LNGR**  --  Load Negative Register (64-bit).',
  LPR:  '**LPR**  --  Load Positive Register. Loads the absolute value of a 32-bit GPR.',
  LPGR: '**LPGR**  --  Load Positive Register (64-bit).',
  LCR:  '**LCR**  --  Load Complement Register. Loads the two\'s complement (negation) of a 32-bit GPR.',
  LCGR: '**LCGR**  --  Load Complement Register (64-bit).',
  STCK: '**STCK**  --  Store Clock. Stores the 64-bit TOD clock value to a doubleword in storage. Used for timing and unique-ID generation.',
  STCKF: '**STCKF**  --  Store Clock Fast. Like STCK but uses the faster "fast" TOD format.',
  STCKE: '**STCKE**  --  Store Clock Extended. Stores a 128-bit extended TOD clock value.',
};

// -- Tokenizer ----------------------------------------------------------------

/**
 * HLASM Monarch tokenizer.
 *
 * Fixed-column layout (standard HLASM source):
 *   Col  1    : * = full-line comment
 *   Col  1-8  : Name field (label)
 *   Col  10-14: Operation (mnemonic)
 *   Col  16+  : Operands
 *   Col  72   : Continuation indicator (X)
 *   Col  73-80: Sequence / ID field (ignored by assembler, not colorized)
 *
 * However, many HLASM sources (including these examples) use 2-space indentation
 * rather than strict column alignment. The tokenizer handles both conventions.
 */
export const HLASM_HILITE = {
  defaultToken: '',
  ignoreCase: false,

  // Keyword sets used in the tokenizer
  directives: [
    'ACONTROL','ADATA','AINSERT','ALIAS','AMODE',
    'CATTR','CCW','CCW0','CCW1','CEJECT','CNOP',
    'COM','COPY','CSECT','CXD',
    'DC','DROP','DS','DSECT','DXD',
    'EJECT','END','ENTRY','EQU','EXITCTL','EXTRN',
    'ICTL','ISEQ','LOCTR','LTORG',
    'MACRO','MEND','MEXIT','MHELP','MNOTE',
    'OPSYN','ORG','POP','PRINT','PUNCH','PUSH',
    'REPRO','RMODE','RSECT','SPACE','START','TITLE',
    'USING','WXTRN','XATTR',
  ],

  macroInsts: [
    'ACTR','AEJECT','AIF','AIFB','AGO','ANOP','AREAD','ASPACE',
    'GBLA','GBLB','GBLC',
    'LCLA','LCLB','LCLC',
    'SETA','SETAF','SETB','SETC','SETCF',
  ],

  tokenizer: {
    root: [
      // ---- Full-line comment: * in column 1 ----
      [/^\*.*$/, 'hlasm-comment'],

      // ---- Label in name field (cols 1-8), then transition to mnemonic ----
      [/^([A-Z$#@][A-Z0-9$#@]*)(\s+)/, ['hlasm-label', '']],

      // ---- No label  --  line starts with whitespace ----
      [/^\s+/, ''],

      // Fall through into mnemonic recognition
      { include: '@mnemonic' },
    ],

    mnemonic: [
      // Assembler directives
      [/\b(ACONTROL|ADATA|AINSERT|ALIAS|AMODE|CATTR|CCW0?1?|CEJECT|CNOP|COM|COPY|CSECT|CXD|DC|DROP|DS|DSECT|DXD|EJECT|END|ENTRY|EQU|EXITCTL|EXTRN|ICTL|ISEQ|LOCTR|LTORG|MACRO|MEND|MEXIT|MHELP|MNOTE|OPSYN|ORG|POP|PRINT|PUNCH|PUSH|REPRO|RMODE|RSECT|SPACE|START|TITLE|USING|WXTRN|XATTR)\b/,
        { token: 'hlasm-directive', next: '@operandLine' }],

      // Macro/conditional-assembly instructions
      [/\b(ACTR|AEJECT|AIFB?|AGO|ANOP|AREAD|ASPACE|GBLA|GBLB|GBLC|LCLA|LCLB|LCLC|SETA[FC]?|SETB|SETC[F]?)\b/,
        { token: 'hlasm-macro-inst', next: '@operandLine' }],

      // Machine instructions (broad set)
      [/\b(ABEND|ADBR?|AEBR?|ADB?|AEB?|AFI|AGFR?|AGHI|AGFI|AGR?|AG|AGSI|AH[IY]?|ALHHLR|ALG[FR]?|ALR?|ALY|APR?|AR?|AXBR?|BAKR|BAS[RL]?M?|BASR?|BCR?|BCT[RG]|BRAS[L]?|BRC[L]?|BXHG?|BXLEG?|B[EHLNOPRZ][ELNOPRZ]?R?|CBR?|CDBR?|CDSG?|CDSTR?|CDS|CEBR?|CEQ?|CFC|CFI|CG[FHIR]?|CGDT?R?|CGIT?|CGRT?|CGS?R?|CHI?|CHHSI|CHRL|CHSI|CIH|CIT|CLCL[U]?|CLC[LE]?|CLF[I]?|CLG[EFIR]?|CLGT|CLGTR?|CLHF|CLHHR|CLHHS|CLHHU|CLHL[R]?|CLI[Y]?|CLIH|CLIY|CLJNL?[EHLOPRZ]|CLMH?|CLR[LT]?|CLRJ|CLT|CLTJ|CLY|CMH?|CMDP?F?R?|CNOP|CPX|CR[JT]?|CRB|CRJ|CS[GY]?|CSGR?|CSST|CSX|CXBR?|CXFBR?|CDB|CGRT|CLGRT|SLLG|SLLK|DDBR?|DEBR?|DIDBR?|DIEBR?|DL[GR]?|DR?|DSGFR?|DSGR?|DSST|DXR|EDBR?|EEXTR?|ESXTR?|EX[RL]?|FLOGR|IEDTR?|IEXTR?|IC[MY]?|IIHF|IIHH|IIHL|IILF|IILH|IILL|IPTE|KDB[ER]?|KDTR?|KXBR?|KXTR?|LA[EGMY]?|LAA[LG]?|LAAG?|LACG?|LAE|LAM[H]?|LAOG?|LARL|LAXG?|LBEAR|LBR?|LCG[FR]?|LCGR|LCR?|LDE[BR]?|LDETR?|LDGR?|LDR?|LDXBR?|LDXTR?|LEDTR?|LFAS|LFHAT|LG[ABCDEFHIMRSTVX]?|LGD[TR]?|LGF[IR]?|LGFRL|LGHI|LGH[RL]?|LGII?|LGMH|LGR?|LGRP|LGSW?|LH[ILRY]?|LHHR|LHRL|LHY|LKPAI?|LLB[HLR]?|LLC[HLR]?|LLD[HLR]?|LLESG?|LLGC[HR]?|LLGF[HR]?|LLGFRL|LLGHR?|LLGTR?|LLH[HR]?|LLHRL|LLIHF|LLIHH|LLIHL|LLILF|LLILH|LLILL|LLZRGF|LM[GH]?|LMD|LNDFR?|LNG[FR]?|LNGR|LNR?|LNXBR|LPDFR?|LPG[FR]?|LPGR|LPR?|LPXBR|LR[DFGV]?|LRL|LRV[GH]?|LRVGR?|LT[GY]?|LTDBR?|LTEBR?|LTGFR?|LTGR?|LTGF?|LTR?|LTXBR?|LTXTR?|LXDBR?|LXDTR?|LXEBR?|LXETR?|LXLBR|LXSBR|M[ACG]?|MA[CDY]?|MC|MDB[IR]?|MDTR?|MEEBR?|MH[IY]?|MLG?R?|MOD[FI]?|MP|MSG[FIR]?|MS[DFIYRP]?|MVC[DKL]?|MVCP?S?|MVGHI|MVI[Y]?|MVN|MVO|MVS|MVZ|NIAI|NC|NI[Y]?|NGR?|NIHF|NIHH|NIHL|NILF|NILH|NILL|NOP[R]?|NR?|OC|OI[Y]?|OGR?|OIHF|OIHH|OIHL|OILF|OILH|OILL|OR?|PACK|PCC|PCKMO|PFD[RL]?|PFPO|PKA|PKU|PLO|POP|PR|PRNO|PTER?|QPACI?|RLL[G]?|RNSBG|ROSBG|RISBGN?|RISBHG|RISBLG|RXSBG|S[ALG]?|SAC|SACF|SCOND|SDB[IR]?|SDTR?|SEBR?|SGRK?|SFASR|SFPC|SHI?|SLAK?|SLBGR?|SLBR?|SLB|SLDA|SLDL|SLGFR?|SLGRK?|SLGR?|SLG[SY]?|SLLG|SLLK|SLL[KY]?|SLR[GK]?|SLRK|SLY?|SQDBR?|SQDR?|SQEBR?|SQXBR?|SRA[GK]?|SRAG?|SRDA|SRDL|SRLG|SRLK?|SRST[U]?|SRLU|SSAIR?|SSK|SSM|ST[ACKM]?|STCM[HY]?|STC[KY]?|STFLE?|STFPC|STG|STH[RL]?|STMG?[H]?|STRV[GH]?|SVC|SXR|SXTR?|SY?|TM[HY]?|TMHH|TMHL|TMLH|TMLL|TP|TPI|TR[?]?|TRE|TROO|TROOT|TROT|TRTE?[SU]?|TRTR?[EU]?|TRTT|TS|UNPK[U]?|VA[B]?|VC[EFK]?|VN[M]?|VSTR?|VX[E]?|WFC|WTC|XI[Y]?|XGR?|XC|XR?|ZAP|CLST|CVBG?|CVDG?|EX[RL]?|LM[GH]?|MVN|MVZ|TR|TRT[E]?[SU]?|BAKR|PR|BXHG?|BXLEG?)\b/,
        { token: 'hlasm-keyword', next: '@operandLine' }],

      { include: '@operandRest' },
    ],

    operandLine: [
      // Skip whitespace between mnemonic and operands, then enter operand processing
      [/\s+/, { token: '', next: '@operandWithComment' }],
      // Keyword with no operands (end of line)
      [/$/, { token: '', next: '@popall' }],
    ],

    operandWithComment: [
      // End of line (empty or only trailing spaces) -- pop back to root
      [/ *$/, { token: '', next: '@popall' }],
      // Space after operand content = start of end-of-line comment
      [/ .*$/, { token: 'hlasm-comment', next: '@popall' }],
      // Continuation indicator X at end of line
      [/X$/, { token: 'hlasm-cont', next: '@popall' }],
      { include: '@operandRest' },
    ],

    operandRest: [
      // Variable symbol (&name)
      [/&[A-Z#@$][A-Z0-9#@$_]*(\([^)]*\))?/, 'hlasm-variable'],

      // Sequence symbol (.name)
      [/\.[A-Z#@$][A-Z0-9#@$]*/, 'hlasm-seq'],

      // Register references: R0-R15, with parentheses context
      [/\b(R(?:1[0-5]|[0-9]))\b/, 'hlasm-register'],

      // Hex, binary, character, and duplication literals: X'...' B'...' C'...' etc.
      [/[0-9]*[ABCDEFGHKLPQSUVXYZ]'[^']*'/, 'hlasm-number'],

      // Self-defining terms and numeric literals
      [/[0-9]+/, 'hlasm-number'],

      // String literals in apostrophes
      [/'[^']*'/, 'hlasm-string'],

      // Operators and delimiters
      [/[=,().*+\-\/]/, 'hlasm-operator'],

      // Ordinary symbols and keywords (plain identifier)
      [/[A-Z$#@][A-Z0-9$#_@]*/, ''],
    ],
  }
};
