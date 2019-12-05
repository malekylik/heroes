import { Primitive, Pointer } from '../type';
import { Allocator } from 'memory/allocator/allocator';

export type Int32P = Pointer;
export const INT32_SIZE: number = 4;
export const Int32: Primitive = new Primitive(INT32_SIZE);

Int32.toString = function toString(): string {
    return 'Int32';
}

export function getInt32(a: Allocator, address: Int32P): number {
    return a.int32View[address >> 2];
}

export function setInt32(a: Allocator, address: Int32P, v: number): number {
    return a.int32View[address >> 2] = v;
}
