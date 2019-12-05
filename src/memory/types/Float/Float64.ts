import { Pointer, Primitive } from '..';
import { Allocator } from 'memory/allocator/allocator';

export type Float64P = Pointer;
export const FLOAT64_SIZE: number = 8;
export const Float64: Primitive = new Primitive(FLOAT64_SIZE);

Float64.toString = function toString(): string {
    return 'Float64';
}

export function getFloat64(a: Allocator, address: Float64P): number {
    return a.float64View[address >> 3];
}

export function setFloat64(a: Allocator, address: Float64P, v: number): number {
    return a.float64View[address >> 3] = v;
}
