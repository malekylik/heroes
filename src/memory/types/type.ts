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

export function align(size: number): number {
    return size % 2 === 0 ? size : size + 1;
}

