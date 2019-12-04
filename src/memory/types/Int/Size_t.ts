import { Primitive, Pointer } from '../type';
import { Allocator, get4Byte, set4Byte } from 'memory/allocator/allocator';
import { toInt32 } from '../../coercion';

export type Size_tP = Pointer;
export const SIZE_T_SIZE: number = 4;
export const Size_t: Primitive = new Primitive(SIZE_T_SIZE);

Size_t.toString = function toString(): string {
    return 'Size_t';
}

export function getSize_t(a: Allocator, address: Size_tP): number {
    return get4Byte(a, address);
}

export function setSize_t(a: Allocator, address: Size_tP, v: number): number {
    return set4Byte(a, address, toInt32(v));
}
