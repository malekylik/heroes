import { Pointer, Primitive } from '..';
import { Allocator, get8Byte, set8Byte } from 'memory/allocator/allocator';

export type Float64P = Pointer;
export const FLOAT64_SIZE: number = 8;
export const Float64: Primitive = new Primitive(FLOAT64_SIZE);

Float64.toString = function toString(): string {
    return 'Float64';
}

export function getFloat64(a: Allocator, address: Float64P): number {
    return get8Byte(a, address);
}

export function setFloat64(a: Allocator, address: Float64P, v: number): number {
    return set8Byte(a, address, v);
}
