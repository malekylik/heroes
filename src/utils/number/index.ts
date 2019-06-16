import { hexPowers } from '../../consts/utils';
import { toInt32 } from '../../memory/coercion';
import { digitToHexDigitAsciiCode, acsiiFromBin } from '../string';

export function numbersToHex(ns: number[], padN: number = 0): string[] {
  let numbersN = ns.length;
  const hexNumbers = new Array(numbersN);
  const str = numbersToHexStr(ns, padN);
  let start = str.length;
  let end = start;

  while (numbersN--) {
    while (start-- && str[start] !== ' ');

    hexNumbers[numbersN] = str.slice(start + 1, end);

    end = start;
  }
 
  return hexNumbers;
}

export function numbersToHexStr(ns: number[], padN: number = 0): string {
  let numbersN = ns.length;
  let gapsN = max(0, numbersN - 1);
  let bytes = nsDigitsForHex(ns, padN);

  bytes += gapsN;

  let buffer = new ArrayBuffer(bytes); 
  let view = new Uint8Array(buffer);
  let digits = 0;
  let digit = 0;
  let n = 0;
  let tempBytes = 0;

  while (numbersN--) {
    n = ns[numbersN];
    digits = max(nDigitsForHex(n), padN);
    tempBytes = bytes;
    bytes -= digits;

    while (digits--) {
      view[tempBytes - digits - 1] = digitToHexDigitAsciiCode(max(0, digit = toInt32(n / hexPowers[digits])));
      n -= digit * hexPowers[digits];
    }

    if (--bytes && gapsN) {
      view[bytes] = 32;
      gapsN -= 1;
    }
  }

  return acsiiFromBin(buffer);
}

export function numberToHex(n: number, padN: number = 0): string {
  return numbersToHex([n], padN)[0];
}

export function nsDigitsForHex(ns: number[], padN: number = 0): number {
  let numbersN = ns.length;
  let bytes = 0;

  while (numbersN-- && (bytes += max(nDigitsForHex(ns[numbersN]), padN)));

  return bytes;
}


export function nDigitsForHex(n: number): number {
  let digits = hexPowers.length - 1;

  while(n < hexPowers[digits]) digits--;

  digits += 1;

  return max(1, digits);
}

export function min(a: number, b: number) {
  return a < b ? a : b;
}

export function max(a: number, b: number) {
  return a < b ? b : a;
}
