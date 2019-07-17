/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

/*
  Inspired by https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding
  Original author: madmurphy
*/

function B64ToUint6 (char: number) {
  return char > 64 && char < 91 ?
    char - 65
    : char > 96 && char < 123 ?
    char - 71
    : char > 47 && char < 58 ?
    char + 4
    : char === 43 ?
    62
    : char === 47 ?
    63
    :
    0;
}

function UTF8ArrayToString (bytes: Uint8Array):string {
  let str = "";

  for (let part, len = bytes.length, index = 0; index < len; index++) {
    part = bytes[index];
    const charCode =  part > 251 && part < 254 && index + 5 < len ? /* six bytes */
      /* (part - 252 << 30) may be not so safe in ECMAScript! So...: */
      (part - 252) * 1073741824 + (bytes[++index] - 128 << 24) + (bytes[++index] - 128 << 18)
      + (bytes[++index] - 128 << 12) + (bytes[++index] - 128 << 6) + bytes[++index] - 128
    
      : part > 247 && part < 252 && index + 4 < len ? /* five bytes */
      (part - 248 << 24) + (bytes[++index] - 128 << 18) + (bytes[++index] - 128 << 12)
      + (bytes[++index] - 128 << 6) + bytes[++index] - 128
    
      : part > 239 && part < 248 && index + 3 < len ? /* four bytes */
      (part - 240 << 18) + (bytes[++index] - 128 << 12) + (bytes[++index] - 128 << 6) + bytes[++index] - 128
      : part > 223 && part < 240 && index + 2 < len ? /* three bytes */
      (part - 224 << 12) + (bytes[++index] - 128 << 6) + bytes[++index] - 128
      : part > 191 && part < 224 && index + 1 < len ? /* two bytes */
      (part - 192 << 6) + bytes[++index] - 128
      : /* part < 127 ? */ /* one byte */
      part;
    if ((index + 2) < len || charCode != 0) {
      str += String.fromCharCode(charCode);
    }

  }

  return str;

}

export function B64Decoder(b64: string) {
  const b64Length = b64.length
  const outLength = b64Length * 3 + 1 >>> 2;
  const byteArray = new Uint8Array(outLength);

  for (let mod3:number, mod4:number, Uint24 = 0, OutIndex = 0, InIndex = 0; InIndex < b64Length; InIndex++) {
    mod4 = InIndex & 3;
    Uint24 |= B64ToUint6(b64.charCodeAt(InIndex)) << 18 - 6 * mod4;
    if (mod4 === 3 || b64Length - InIndex === 1) {
      for (mod3 = 0; mod3 < 3 && OutIndex < outLength; mod3++, OutIndex++) {
        byteArray[OutIndex] = Uint24 >>> (16 >>> mod3 & 24) & 255;
      }
      Uint24 = 0;
    }
  }

  return UTF8ArrayToString(byteArray);
}
