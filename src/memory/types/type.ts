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

export function alignTo2(size: number): number {
    return alignTo(size, 2);
}

export function alignTo4(size: number): number {
    return alignTo(size, 4);
}

export function alignTo8(size: number): number {
    return alignTo(size, 8);
}

export function align32Bit(size: number): number {
    if (size < 3) return size;

    return alignTo4(size);
}

export function align64Bit(size: number): number {
    return size < 5 ? align32Bit(size) : alignTo8(size);
}

export const align: (size: number) => number = align32Bit;

export function padTo(size: number, value: number): number {
    return (-size & (value - 1));
}
