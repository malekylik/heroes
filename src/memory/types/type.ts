import { toInt32 } from '../coercion';
import { binPowers } from '../../consts/utils';

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
    return alignRec(size, 0, binPowers.length - 1);
}

function alignRec(size: number, l: number, r: number): number {
    if (r - l === 0) return binPowers[l];

    const median: number = toInt32((r + l) / 2);

    if (size <= binPowers[median]) return alignRec(size, l, median);
    return alignRec(size, median + 1, r);
}
