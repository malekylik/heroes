import { Type } from '.';
import { sizeof, align, Pointer } from './type';

export type ArrayP = Pointer;

export class ArrayType extends Type {
    readonly size: number;
    readonly meta: {
        value: {
            offset: number;
            type: Type;
        }
    }

    private _length: number;

    constructor(type: Type, length: number, size: number) {
        super();
        this.size = size;
        this._length = length;
        this.meta = {
            value: {
                type,
                offset: sizeof(type),
            }
        };
    }

    get length(): number {
        return this._length;
    }
}

export function defineArray(type: Type, length: number): ArrayType {
    const size: number = align(sizeof(type) * length);
    
    return new ArrayType(type, length, size);
}

export function getAddressFromArray(arrayType: ArrayType, array: ArrayP, i: number): number {
    return array + arrayType.meta.value.offset * i;
}

