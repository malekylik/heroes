import { toInt32 } from '../coercion';

export type Pointer = number;

export abstract class Type {
    readonly size: number;
    readonly meta: {
        [key: string]: {
            offset: number;
        }
    }

    constructor() {
        this.meta = {};
    }
}

export class Primitive extends Type {
    readonly size: number;
    readonly meta: {
        value: {
            offset: number;
        }
    }

    constructor(size: number) {
        super();
        this.size = size;
        this.meta = {
            value: {
                offset: 0
            }
        };
    }
}

export function sizeof(t: Type): number {
    return t.size;
}

export function alignTo(size: number, value: number): number {
    return size + ((value - size % value) % value);
}

export function alignTo8(size: number): number {
    return alignTo(size, 8);
}

export function alignBin(size: number): number {
    return alignRec(size, 0, alignedSizes.length - 1);
}

function alignRec(size: number, l: number, r: number): number {
    if (r - l <= 1) return alignedSizes[r];

    const median: number = toInt32((r + l) / 2);

    if (size <= alignedSizes[median]) return alignRec(size, l, median);
    else return alignRec(size, median, r);
}

const alignedSizes = [
       0,   2**0,   2**1,   2**2,
    2**3,   2**4,   2**5,   2**6,   
    2**7,   2**8,   2**9,   2**10,  
    2**11,  2**12,  2**13,  2**14,  
    2**15,  2**16,  2**17,  2**18,  
    2**19,  2**20,  2**21,  2**22,  
    2**23,  2**24,  2**25,  2**26,  
    2**27,  2**28,  2**29,  2**30,  
    2**31,  2**32,
];

