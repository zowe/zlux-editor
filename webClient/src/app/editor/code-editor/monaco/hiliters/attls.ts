/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

// Monarch tokenizer and hover utilities for IBM z/OS Communications Server AT-TLS
// (Application Transparent Transport Layer Security) Policy Agent files.
//
// AT-TLS policy files declare named items (TTLSRule, TTLSGroupAction, PortRange,
// etc.) whose properties are enclosed in braces.  Properties ending in "Ref"
// cross-reference other named items across the file, which is where hover-help
// is most valuable.

// ---------------------------------------------------------------------------
// Monarch tokenizer
// ---------------------------------------------------------------------------

export const ATTLS_HILITE = {
  defaultToken: 'attls-default',
  ignoreCase: false,

  tokenizer: {
    root: [
      // Comment lines: optional whitespace, then '#'
      [/^\s*#.*/, 'attls-comment'],

      // Standalone brace/close-brace lines (at any indentation level)
      [/^\s*\{\s*$/, 'attls-brace'],
      [/^\s*\}\s*$/, 'attls-brace'],

      // Top-level declaration at column 0: TypeKeyword  ItemName
      // Split into three tokens via capture groups: type, whitespace, name
      [/^([A-Z]\w*)(\s+)(\S+)/, ['attls-type', 'white', 'attls-name']],

      // Top-level keyword alone (anonymous nested block, no name on line)
      [/^[A-Z]\w*\s*$/, 'attls-type'],

      // Indented property line: consume leading whitespace, then handle the key
      [/^\s+/, { token: 'white', next: '@propKey' }],

      // Fallback
      [/.*/, 'attls-default'],
    ],

    propKey: [
      // Brace/close-brace encountered inside an indented context (nested blocks)
      [/\s*\{\s*$/, { token: 'attls-brace', next: '@popall' }],
      [/\s*\}\s*$/, { token: 'attls-brace', next: '@popall' }],

      // Reference property key: any word ending in "Ref" followed by whitespace
      // (e.g. TTLSGroupActionRef, LocalPortRangeRef, TTLSCipherParmsRef)
      [/[\w.]+Ref(?=[ \t])/, { token: 'attls-ref-key', next: '@refValue' }],
      // Reference key alone on line (no following value)
      [/[\w.]+Ref$/, { token: 'attls-ref-key', next: '@popall' }],

      // Nested TTLS block header with no value (e.g. TTLSEnvironmentAdvancedParms)
      [/TTLS\w+(?=[ \t]*$)/, { token: 'attls-nested-type', next: '@popall' }],

      // Regular property key followed by a value
      [/[\w.]+(?=[ \t])/, { token: 'attls-key', next: '@propValue' }],
      // Regular property key alone on line
      [/[\w.]+$/, { token: 'attls-key', next: '@popall' }],

      // Fallback: treat remainder of line as default
      [/.+/, { token: 'attls-default', next: '@popall' }],
    ],

    refValue: [
      [/[ \t]+/, 'white'],
      // The referenced item name (e.g. gAct1, portR4, cAct~ZOWE-Server)
      [/\S+/, { token: 'attls-ref-value', next: '@popall' }],
    ],

    propValue: [
      [/[ \t]+/, 'white'],
      // Everything to end of line is the value
      [/.+/, { token: 'attls-value', next: '@popall' }],
    ],
  },
};

// ---------------------------------------------------------------------------
// Declaration parsing utilities used by the hover provider
// ---------------------------------------------------------------------------

/** Metadata for a named AT-TLS item found in the policy file. */
export interface AttlsItemDeclaration {
  typeName: string;
  itemName: string;
  /** 1-based line number of the "TypeKeyword  ItemName" line. */
  startLine: number;
  /** 1-based line number of the closing '}'. */
  endLine: number;
}

/**
 * Scans `lines` (the full file split on '\n') and returns a map from item
 * name to its declaration metadata.  Only named, top-level items that are
 * immediately followed (on the next non-blank line) by a lone '{' are included.
 */
export function parseAttlsDeclarations(lines: string[]): Map<string, AttlsItemDeclaration> {
  const declarations = new Map<string, AttlsItemDeclaration>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Non-indented declaration: starts at col 0, keyword + whitespace + name
    const declMatch = /^([A-Za-z]\w*)\s+(\S+)\s*$/.exec(line);
    if (!declMatch) continue;

    const typeName = declMatch[1];
    const itemName = declMatch[2];

    // Locate the opening brace on the next non-blank line
    let braceIndex = i + 1;
    while (braceIndex < lines.length && lines[braceIndex].trim() === '') {
      braceIndex++;
    }
    if (braceIndex >= lines.length || lines[braceIndex].trim() !== '{') continue;

    // Walk forward to find the matching closing brace, tracking nested depth
    let depth = 1;
    let closeIndex = braceIndex + 1;
    while (closeIndex < lines.length && depth > 0) {
      const trimmed = lines[closeIndex].trim();
      if (trimmed === '{') {
        depth++;
      } else if (trimmed === '}') {
        depth--;
      }
      if (depth > 0) closeIndex++;
    }

    declarations.set(itemName, {
      typeName,
      itemName,
      startLine: i + 1,      // convert to 1-based
      endLine: closeIndex + 1, // convert to 1-based
    });
  }

  return declarations;
}

/**
 * Returns the source text (declaration line through closing brace) for the
 * given declaration, suitable for display in a hover popup code block.
 */
export function extractDeclarationText(lines: string[], declaration: AttlsItemDeclaration): string {
  return lines.slice(declaration.startLine - 1, declaration.endLine).join('\n');
}

/**
 * Returns the word under the cursor in `lineText`, or null if the cursor is
 * not positioned on a word character.  Word characters are letters, digits,
 * underscores, and dots (the last to handle version tokens like TLSv1.2 and
 * numeric-led names like 3DESKEYCHECK).
 */
export function getHoveredKeyword(lineText: string, column: number): string | null {
  const col0 = column - 1; // 1-based column -> 0-based string index
  if (col0 < 0 || col0 >= lineText.length) return null;
  if (!/[\w.]/.test(lineText[col0])) return null;

  let start = col0;
  while (start > 0 && /[\w.]/.test(lineText[start - 1])) start--;
  let end = col0;
  while (end < lineText.length - 1 && /[\w.]/.test(lineText[end + 1])) end++;

  return lineText.slice(start, end + 1);
}

// ---------------------------------------------------------------------------
// Reference-finding utilities
// ---------------------------------------------------------------------------

/**
 * Returns the AT-TLS item name under the cursor, whether the cursor sits on a
 * declaration name (non-indented "TypeKeyword  name" line) or a reference
 * value (indented "SomeKeyRef  name" line).  Returns null otherwise.
 *
 * `column` is 1-based (Monaco's position.column is already 1-based).
 */
export function getItemNameAtPosition(lineText: string, column: number): string | null {
  // Is the cursor on a reference value?
  const refName = getHoveredRefName(lineText, column);
  if (refName) return refName;

  // Is the cursor on the name token of a declaration line?
  const declMatch = /^([A-Za-z]\w*)\s+(\S+)\s*$/.exec(lineText);
  if (declMatch) {
    const itemName = declMatch[2];
    const itemNameStart = lineText.indexOf(itemName, declMatch[1].length); // 0-based
    const col0 = column - 1; // 0-based
    if (col0 >= itemNameStart && col0 < itemNameStart + itemName.length) {
      return itemName;
    }
  }

  return null;
}

/** A single occurrence of an AT-TLS item name found by findAllAttlsReferences. */
export interface AttlsReference {
  /** 0-based line number. */
  line: number;
  /** 0-based column of the first character of the item name. */
  col: number;
  /** True when this occurrence is the item's declaration line. */
  isDeclaration: boolean;
}

/**
 * Scans `lines` (the full file split on '\n') and returns the locations of
 * every occurrence of `itemName` as either a declaration name or a reference
 * value.  Results are in document order.
 */
export function findAllAttlsReferences(lines: string[], itemName: string): AttlsReference[] {
  const results: AttlsReference[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Declaration: non-indented  TypeKeyword  itemName  (exact match)
    const declMatch = /^([A-Za-z]\w*)\s+(\S+)\s*$/.exec(line);
    if (declMatch && declMatch[2] === itemName) {
      const col = line.indexOf(itemName, declMatch[1].length);
      results.push({ line: i, col, isDeclaration: true });
      continue;
    }

    // Reference: indented  SomeTypeRef  itemName  (exact match)
    const refMatch = /^(\s+[\w.]+Ref)([ \t]+)(\S+)/.exec(line);
    if (refMatch && refMatch[3] === itemName) {
      const col = refMatch[1].length + refMatch[2].length; // 0-based start of value
      results.push({ line: i, col, isDeclaration: false });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Keyword documentation
// ---------------------------------------------------------------------------
// Brief descriptions shown in hover popups for AT-TLS policy keywords.
// Covers top-level declaration types, property keys, and nested block names.

export const ATTLS_KEYWORD_DOCS: Map<string, string> = new Map([
  // ── Top-level declaration types ──────────────────────────────────────────

  ['TTLSRule',
    '**TTLSRule** *(declaration)*\n\n' +
    'Defines a connection-matching rule. When a new TCP connection matches the ' +
    'address, port, jobname, and direction filters, the referenced group, ' +
    'environment, and connection actions are applied.'],

  ['TTLSGroupAction',
    '**TTLSGroupAction** *(declaration)*\n\n' +
    'Controls whether AT-TLS is enabled for matched connections (`TTLSEnabled On/Off`). ' +
    'Referenced by `TTLSGroupActionRef` in a `TTLSRule`.'],

  ['TTLSGroupAdvancedParms',
    '**TTLSGroupAdvancedParms** *(declaration)*\n\n' +
    'Advanced parameters for a group action: syslog facility, GSKit environment ' +
    'variable file path, etc. Referenced by `TTLSGroupAdvancedParmsRef`.'],

  ['TTLSEnvironmentAction',
    '**TTLSEnvironmentAction** *(declaration)*\n\n' +
    'Defines the TLS handshake environment: role (Server/Client/ServerWithClientAuth), ' +
    'keyring, cipher constraints, and protocol version limits. ' +
    'Referenced by `TTLSEnvironmentActionRef` in a `TTLSRule`.'],

  ['TTLSEnvironmentAdvancedParms',
    '**TTLSEnvironmentAdvancedParms** *(declaration or nested block)*\n\n' +
    'Constrains protocol versions, key sizes, renegotiation, and peer certificate ' +
    'requirements. Can appear inline inside a `TTLSEnvironmentAction` block or as ' +
    'a standalone declaration referenced by `TTLSEnvironmentAdvancedParmsRef`.'],

  ['TTLSConnectionAction',
    '**TTLSConnectionAction** *(declaration)*\n\n' +
    'Defines per-connection TLS behaviour: handshake role, cipher suite set, ' +
    'certificate labels, and trace level. ' +
    'Referenced by `TTLSConnectionActionRef` in a `TTLSRule`.'],

  ['TTLSConnectionAdvancedParms',
    '**TTLSConnectionAdvancedParms** *(declaration or nested block)*\n\n' +
    'Specifies TLS version switches, local certificate label (`CertificateLabel`), ' +
    'secondary map, and application-controlled mode for a connection action. ' +
    'Referenced by `TTLSConnectionAdvancedParmsRef`.'],

  ['TTLSCipherParms',
    '**TTLSCipherParms** *(declaration)*\n\n' +
    'Defines an ordered list of TLS cipher suites (`V3CipherSuites`). ' +
    'Referenced by `TTLSCipherParmsRef`.'],

  ['TTLSKeyringParms',
    '**TTLSKeyringParms** *(declaration or nested block)*\n\n' +
    'Specifies the SAF keyring used for certificates and keys (`Keyring OWNER/RINGNAME`). ' +
    'Can appear inline in a `TTLSEnvironmentAction` or as a standalone declaration ' +
    'referenced by `TTLSKeyringParmsRef`.'],

  ['TTLSSignatureParms',
    '**TTLSSignatureParms** *(declaration)*\n\n' +
    'Defines allowed signature algorithms for TLS 1.3 and certificate verification. ' +
    'Referenced by `TTLSSignatureParmsRef`.'],

  ['TTLSGskAdvancedParms',
    '**TTLSGskAdvancedParms** *(declaration)*\n\n' +
    'GSKit-specific advanced parameters such as FIPS mode, server-side key exchange ' +
    'curve settings, and session cache controls. ' +
    'Referenced by `TTLSGskAdvancedParmsRef`.'],

  ['PortRange',
    '**PortRange** *(declaration)*\n\n' +
    'Defines a named TCP port range used to match rule filters. The range is ' +
    'specified with the `Port` property (e.g. `Port 1024-65535`). ' +
    'Referenced by `LocalPortRangeRef` and `RemotePortRangeRef`.'],

  ['PortGroup',
    '**PortGroup** *(declaration)*\n\n' +
    'Defines a named collection of port ranges. The group lists individual ' +
    '`PortRange` references. Referenced by `LocalPortGroupRef` and `RemotePortGroupRef`.'],

  ['IpAddr',
    '**IpAddr** *(declaration)*\n\n' +
    'Defines a named IP address or subnet. Referenced by `LocalAddrRef` and `RemoteAddrRef`.'],

  ['IpAddrSet',
    '**IpAddrSet** *(declaration)*\n\n' +
    'Defines a named set of IP addresses or subnets. ' +
    'Referenced by `LocalAddrSetRef` and `RemoteAddrSetRef`.'],

  ['IpAddrGroup',
    '**IpAddrGroup** *(declaration)*\n\n' +
    'Defines a named group of `IpAddrSet` entries. ' +
    'Referenced by `LocalAddrGroupRef` and `RemoteAddrGroupRef`.'],

  // ── TTLSRule properties ───────────────────────────────────────────────────

  ['LocalAddr',
    '**LocalAddr** *(TTLSRule)*\n\nInline local IP address filter. Use `ALL` to match any address, ' +
    'or supply a specific address/subnet. For inbound rules the local address is the server side; ' +
    'for outbound rules it is the client side.'],

  ['RemoteAddr',
    '**RemoteAddr** *(TTLSRule)*\n\nInline remote IP address filter. Use `ALL` to match any address.'],

  ['LocalAddrRef',
    '**LocalAddrRef** *(TTLSRule)*\n\nReferences a named `IpAddr` for the local address filter.'],

  ['RemoteAddrRef',
    '**RemoteAddrRef** *(TTLSRule)*\n\nReferences a named `IpAddr` for the remote address filter.'],

  ['LocalAddrSetRef',
    '**LocalAddrSetRef** *(TTLSRule)*\n\nReferences a named `IpAddrSet` for the local address filter.'],

  ['RemoteAddrSetRef',
    '**RemoteAddrSetRef** *(TTLSRule)*\n\nReferences a named `IpAddrSet` for the remote address filter.'],

  ['LocalAddrGroupRef',
    '**LocalAddrGroupRef** *(TTLSRule)*\n\nReferences a named `IpAddrGroup` for the local address filter.'],

  ['RemoteAddrGroupRef',
    '**RemoteAddrGroupRef** *(TTLSRule)*\n\nReferences a named `IpAddrGroup` for the remote address filter.'],

  ['LocalPortRange',
    '**LocalPortRange** *(TTLSRule)*\n\nInline local port range (e.g. `7552-7558`). ' +
    'Matches the local TCP port of the connection.'],

  ['RemotePortRange',
    '**RemotePortRange** *(TTLSRule)*\n\nInline remote port range. ' +
    'Matches the remote TCP port of the connection.'],

  ['LocalPortRangeRef',
    '**LocalPortRangeRef** *(TTLSRule)*\n\nReferences a named `PortRange` for the local port filter.'],

  ['RemotePortRangeRef',
    '**RemotePortRangeRef** *(TTLSRule)*\n\nReferences a named `PortRange` for the remote port filter.'],

  ['LocalPortGroupRef',
    '**LocalPortGroupRef** *(TTLSRule)*\n\nReferences a named `PortGroup` for the local port filter.'],

  ['RemotePortGroupRef',
    '**RemotePortGroupRef** *(TTLSRule)*\n\nReferences a named `PortGroup` for the remote port filter.'],

  ['Direction',
    '**Direction** *(TTLSRule)*\n\nConnection direction to match.\n\n' +
    '- `Inbound` — connections accepted by the local stack\n' +
    '- `Outbound` — connections initiated by the local stack\n' +
    '- `Both` — either direction'],

  ['Priority',
    '**Priority** *(TTLSRule)*\n\nRule evaluation priority (1–1023). When multiple rules match a ' +
    'connection, the rule with the **highest** priority number wins.'],

  ['Jobname',
    '**Jobname** *(TTLSRule)*\n\nFilter by z/OS job name. Wildcards (`*`, `%`) are supported. ' +
    'Only connections from matching jobs will be selected by this rule.'],

  ['TTLSGroupActionRef',
    '**TTLSGroupActionRef** *(TTLSRule)*\n\nReferences a `TTLSGroupAction` that enables or disables ' +
    'AT-TLS for connections matched by this rule.'],

  ['TTLSEnvironmentActionRef',
    '**TTLSEnvironmentActionRef** *(TTLSRule)*\n\nReferences a `TTLSEnvironmentAction` that defines ' +
    'the TLS handshake parameters (role, keyring, protocol constraints) for this rule.'],

  ['TTLSConnectionActionRef',
    '**TTLSConnectionActionRef** *(TTLSRule)*\n\nReferences a `TTLSConnectionAction` that defines ' +
    'per-connection TLS settings (cipher suite, certificate label, trace) for this rule.'],

  // ── TTLSGroupAction / TTLSGroupAdvancedParms properties ───────────────────

  ['TTLSEnabled',
    '**TTLSEnabled** *(TTLSGroupAction)*\n\nEnables (`On`) or disables (`Off`) AT-TLS for ' +
    'connections matched by the parent rule. Disabled rules let connections pass unencrypted.'],

  ['Trace',
    '**Trace** *(TTLSGroupAction / TTLSConnectionAction)*\n\n' +
    'Trace level for diagnostics (0 = off, 1 = errors, 2 = events, 255 = verbose). ' +
    'Trace records are written to the SYSTCPDA syslog.'],

  ['TTLSGroupAdvancedParmsRef',
    '**TTLSGroupAdvancedParmsRef** *(TTLSGroupAction)*\n\nReferences a `TTLSGroupAdvancedParms` ' +
    'block for syslog facility and GSKit environment file settings.'],

  ['SyslogFacility',
    '**SyslogFacility** *(TTLSGroupAdvancedParms)*\n\nSyslog facility used for AT-TLS messages ' +
    '(e.g. `auth`, `daemon`).'],

  ['Envfile',
    '**Envfile** *(TTLSGroupAdvancedParms)*\n\nPath to a file containing GSKit environment ' +
    'variables (e.g. GSKIT_FIPS_MODE). Accepts a quoted z/OS UNIX path or a quoted dataset.'],

  // ── TTLSEnvironmentAction properties ──────────────────────────────────────

  ['HandshakeRole',
    '**HandshakeRole** *(TTLSEnvironmentAction / TTLSConnectionAction)*\n\n' +
    'Determines this endpoint\'s role in the TLS handshake.\n\n' +
    '- `Server` — accepts connections, presents a certificate\n' +
    '- `Client` — initiates connections, optionally presents a certificate\n' +
    '- `ServerWithClientAuth` — server that requires a client certificate\n' +
    '- `ClientWithServerAuth` — client that requires a server certificate'],

  ['EnvironmentUserInstance',
    '**EnvironmentUserInstance** *(TTLSEnvironmentAction)*\n\n' +
    'GSKit environment user instance number (0–255). Allows sharing or isolating ' +
    'GSKit session caches across multiple environment actions.'],

  ['TTLSKeyringParmsRef',
    '**TTLSKeyringParmsRef** *(TTLSEnvironmentAction)*\n\nReferences a `TTLSKeyringParms` ' +
    'block that specifies the SAF keyring holding the local certificate and trusted CAs.'],

  ['TTLSEnvironmentAdvancedParmsRef',
    '**TTLSEnvironmentAdvancedParmsRef** *(TTLSEnvironmentAction)*\n\nReferences a ' +
    '`TTLSEnvironmentAdvancedParms` block for protocol version limits, key size minimums, ' +
    'renegotiation policy, etc.'],

  ['TTLSGskAdvancedParmsRef',
    '**TTLSGskAdvancedParmsRef** *(TTLSEnvironmentAction)*\n\nReferences a ' +
    '`TTLSGskAdvancedParms` block for GSKit-specific settings such as FIPS mode and ' +
    'server key exchange curve preferences.'],

  ['TTLSSignatureParmsRef',
    '**TTLSSignatureParmsRef** *(TTLSEnvironmentAction / TTLSConnectionAction)*\n\n' +
    'References a `TTLSSignatureParms` block that controls allowed signature algorithms.'],

  ['CtraceClearText',
    '**CtraceClearText** *(TTLSEnvironmentAction / TTLSConnectionAction)*\n\n' +
    'Controls whether CTRACE captures unencrypted (clear-text) data for this connection. ' +
    'Values: `On` / `Off`. Should be `Off` in production for security.'],

  // ── TTLSEnvironmentAdvancedParms properties ───────────────────────────────

  ['ClientAuthType',
    '**ClientAuthType** *(TTLSEnvironmentAdvancedParms)*\n\n' +
    'Type of client certificate authentication when `HandshakeRole` is `ServerWithClientAuth`.\n\n' +
    '- `Full` — certificate must be valid and map to a SAF user ID\n' +
    '- `PassThru` — certificate is passed to the application without SAF mapping\n' +
    '- `SAFCheck` — certificate is checked by SAF but mapping is optional'],

  ['ApplicationControlled',
    '**ApplicationControlled** *(TTLSEnvironmentAdvancedParms / TTLSConnectionAdvancedParms)*\n\n' +
    'When `On`, the application controls AT-TLS handshake initiation via `setsockopt()`. ' +
    'When `Off` (default), the TCP stack triggers the handshake automatically.'],

  ['Renegotiation',
    '**Renegotiation** *(TTLSEnvironmentAdvancedParms)*\n\n' +
    'Controls TLS session renegotiation.\n\n' +
    '- `Enabled` — renegotiation is allowed\n' +
    '- `Disabled` — renegotiation is refused\n' +
    '- `Enforced` — peer must renegotiate when requested'],

  ['SSLv2',
    '**SSLv2** *(TTLSEnvironmentAdvancedParms / TTLSConnectionAdvancedParms)*\n\n' +
    'Enables (`On`) or disables (`Off`) SSL version 2. **Deprecated and insecure; should be `Off`.**'],

  ['SSLv3',
    '**SSLv3** *(TTLSEnvironmentAdvancedParms / TTLSConnectionAdvancedParms)*\n\n' +
    'Enables (`On`) or disables (`Off`) SSL version 3. **Deprecated and insecure; should be `Off`.**'],

  ['TLSv1',
    '**TLSv1** *(TTLSEnvironmentAdvancedParms / TTLSConnectionAdvancedParms)*\n\n' +
    'Enables (`On`) or disables (`Off`) TLS version 1.0. **Deprecated; should be `Off`.**'],

  ['TLSv1.1',
    '**TLSv1.1** *(TTLSEnvironmentAdvancedParms / TTLSConnectionAdvancedParms)*\n\n' +
    'Enables (`On`) or disables (`Off`) TLS version 1.1. **Deprecated; should be `Off`.**'],

  ['TLSv1.2',
    '**TLSv1.2** *(TTLSEnvironmentAdvancedParms / TTLSConnectionAdvancedParms)*\n\n' +
    'Enables (`On`) or disables (`Off`) TLS version 1.2.'],

  ['TLSv1.3',
    '**TLSv1.3** *(TTLSEnvironmentAdvancedParms / TTLSConnectionAdvancedParms)*\n\n' +
    'Enables (`On`) or disables (`Off`) TLS version 1.3.'],

  ['PEERMINCERTVERSION',
    '**PEERMINCERTVERSION** *(TTLSEnvironmentAdvancedParms)*\n\n' +
    'Minimum X.509 certificate version required from the peer. ' +
    'Values: `any`, `v1`, `v2`, `v3`.'],

  ['CLIENTEDHGROUPSIZE',
    '**CLIENTEDHGROUPSIZE** *(TTLSEnvironmentAdvancedParms)*\n\n' +
    'Minimum ECDH/DHE key exchange group size in bits for client-side connections. ' +
    'Values: `legacy` (1024), `2048`, `3072`, `4096`.'],

  ['SERVEREDHGROUPSIZE',
    '**SERVEREDHGROUPSIZE** *(TTLSEnvironmentAdvancedParms)*\n\n' +
    'Minimum ECDH/DHE key exchange group size in bits for server-side connections. ' +
    'Values: `legacy` (1024), `2048`, `3072`, `4096`.'],

  ['PEERMINDHKEYSIZE',
    '**PEERMINDHKEYSIZE** *(TTLSEnvironmentAdvancedParms)*\n\n' +
    'Minimum DH key size (in bits) accepted from the peer during key exchange.'],

  ['PEERMINRSAKEYSIZE',
    '**PEERMINRSAKEYSIZE** *(TTLSEnvironmentAdvancedParms)*\n\n' +
    'Minimum RSA key size (in bits) accepted from the peer\'s certificate.'],

  ['SERVERSCSV',
    '**SERVERSCSV** *(TTLSEnvironmentAdvancedParms)*\n\n' +
    'Server-side Certificate Status Validation. When `ON`, the server checks OCSP ' +
    'revocation status for peer certificates.'],

  ['MIDDLEBOXCOMPATMODE',
    '**MIDDLEBOXCOMPATMODE** *(TTLSEnvironmentAdvancedParms)*\n\n' +
    'TLS 1.3 middlebox compatibility mode. When `On`, adds legacy session ID and ' +
    'change-cipher-spec records to improve interoperability with TLS-inspecting proxies.'],

  ['CLIENTEXTENDEDMASTERSECRET',
    '**CLIENTEXTENDEDMASTERSECRET** *(TTLSEnvironmentAdvancedParms)*\n\n' +
    'When `ON`, enables the Extended Master Secret (RFC 7627) extension on client-side ' +
    'TLS connections, preventing certain session-resume attacks.'],

  ['SERVEREXTENDEDMASTERSECRET',
    '**SERVEREXTENDEDMASTERSECRET** *(TTLSEnvironmentAdvancedParms)*\n\n' +
    'When `ON`, enables the Extended Master Secret (RFC 7627) extension on server-side ' +
    'TLS connections.'],

  ['3DESKEYCHECK',
    '**3DESKEYCHECK** *(TTLSEnvironmentAdvancedParms)*\n\n' +
    'When `ON`, Triple DES keys are validated for parity and semi-weak key conditions. ' +
    'Values: `ON` / `OFF`.'],

  ['CertValidationMode',
    '**CertValidationMode** *(TTLSEnvironmentAdvancedParms)*\n\n' +
    'Controls how the peer\'s certificate chain is validated.\n\n' +
    '- `Any` — accept any verifiable certificate chain\n' +
    '- `PKIX` — strict RFC 5280 path validation'],

  // ── TTLSConnectionAction properties ──────────────────────────────────────

  ['TTLSCipherParmsRef',
    '**TTLSCipherParmsRef** *(TTLSConnectionAction)*\n\nReferences a `TTLSCipherParms` block ' +
    'that defines the ordered list of TLS cipher suites allowed for this connection.'],

  ['TTLSConnectionAdvancedParmsRef',
    '**TTLSConnectionAdvancedParmsRef** *(TTLSConnectionAction)*\n\nReferences a ' +
    '`TTLSConnectionAdvancedParms` block for connection-level settings such as TLS version ' +
    'switches and the local certificate label.'],

  // ── TTLSConnectionAdvancedParms properties ────────────────────────────────

  ['CertificateLabel',
    '**CertificateLabel** *(TTLSConnectionAdvancedParms)*\n\n' +
    'GSKit label of the local certificate to present during the TLS handshake. ' +
    'Must exist in the keyring specified by `TTLSKeyringParms`. Leave blank to use ' +
    'the keyring\'s default certificate.'],

  ['ServerCertificateLabel',
    '**ServerCertificateLabel** *(TTLSConnectionAdvancedParms)*\n\n' +
    'GSKit label of the server certificate to use. Takes precedence over `CertificateLabel` ' +
    'when both are present in a server-side action.'],

  ['SecondaryMap',
    '**SecondaryMap** *(TTLSConnectionAdvancedParms)*\n\n' +
    'When `On`, enables secondary (application-level) SAF identity mapping from the ' +
    'client certificate, allowing the application to obtain the mapped user ID.'],

  // ── TTLSKeyringParms properties ───────────────────────────────────────────

  ['Keyring',
    '**Keyring** *(TTLSKeyringParms)*\n\n' +
    'SAF keyring holding the local certificate, private key, and trusted CA certificates. ' +
    'Format: `OWNER/RINGNAME`, where `OWNER` is a SAF user ID and `RINGNAME` is the ring name.'],

  // ── TTLSCipherParms properties ────────────────────────────────────────────

  ['V3CipherSuites',
    '**V3CipherSuites** *(TTLSCipherParms)*\n\n' +
    'Adds a TLS cipher suite to the allowed list. Repeat the keyword for each suite. ' +
    'Suites are evaluated in the order listed; the first mutually supported suite is selected.'],

  // ── PortRange / PortGroup / IpAddr properties ─────────────────────────────

  ['Port',
    '**Port** *(PortRange)*\n\nDefines the TCP port or port range for this `PortRange` item. ' +
    'Single port: `8080`. Range: `1024-65535`.'],

  ['Addr',
    '**Addr** *(IpAddr / IpAddrSet)*\n\nIP address or subnet in CIDR notation ' +
    '(e.g. `192.168.1.0/24`) or a plain address (`10.0.0.1`).'],
]);

export function getHoveredRefName(lineText: string, column: number): string | null {
  // Match: leading whitespace, ref keyword (ends with "Ref"), whitespace, ref name
  const refLinePattern = /^(\s+)([\w.]+Ref)[ \t]+(\S+)/;
  const match = refLinePattern.exec(lineText);
  if (!match) return null;

  const refValue = match[3];

  // Determine the 1-based column range of the ref value within the line.
  // match[0] = full match = match[1] + match[2] + whitespace_gap + match[3]
  // So refValue starts at offset: match[0].length - match[3].length  (0-based)
  const refValueStartCol = match[0].length - refValue.length + 1; // 1-based
  const refValueEndCol = refValueStartCol + refValue.length - 1;   // 1-based, inclusive

  if (column >= refValueStartCol && column <= refValueEndCol) {
    // Exclude well-known literal values that are never declared items.
    // ALL, On/Off (any case), and bare numbers (including port ranges like 1024-65535).
    if (/^(ALL|On|Off)$/i.test(refValue) || /^\d[\d\-]*$/.test(refValue)) {
      return null;
    }
    return refValue;
  }
  return null;
}
