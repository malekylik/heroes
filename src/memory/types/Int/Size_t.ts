import { Primitive, Pointer } from '../type';
import { Allocator } from 'memory/allocator/allocator';
import { toInt32 } from '../../coercion';

export type Size_tP = Pointer;
export const SIZE_T_SIZE: number = 4;
export const Size_t: Primitive = new Primitive(SIZE_T_SIZE);

Size_t.toString = function toString(): string {
    return 'Size_t';
}

export function getSize_t(a: Allocator, address: Size_tP): number {
    return a.uint32View[address >> 2];
}

export function setSize_t(a: Allocator, address: Size_tP, v: number): number {
    return a.uint32View[address >> 2] = v;
}
