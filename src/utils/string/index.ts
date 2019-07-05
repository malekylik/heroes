export function acsiiFromBin(strBin: ArrayBuffer) {
    return new TextDecoder('ascii').decode(strBin);
}

export function digitToHexDigitAsciiCode(d: number): number {
    switch (d) {
        case 0: return 48;
        case 1: return 49;
        case 2: return 50;
        case 3: return 51;
        case 4: return 52;
        case 5: return 53;
        case 6: return 54;
        case 7: return 55;
        case 8: return 56;
        case 9: return 57;
        case 10: return 65;
        case 11: return 66;
        case 12: return 67;
        case 13: return 68;
        case 14: return 69;
        case 15: return 70;
        default: return -1;
    }
}


