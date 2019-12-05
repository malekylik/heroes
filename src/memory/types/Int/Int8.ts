import { Primitive, Pointer } from '../type';
import { Allocator } from 'memory/allocator/allocator';

export type Int8P = Pointer;
export const INT8_SIZE: number = 1;
export const Int8: Primitive = new Primitive(INT8_SIZE);

Int8.toString = function toString(): string {
    return 'Int8';
}

export function getInt8(a: Allocator, address: Int8P): number {
    return a.int8View[address];
}

export function setInt8(a: Allocator, address: Int8P, v: number): number {
    return a.int8View[address] = v;
}
