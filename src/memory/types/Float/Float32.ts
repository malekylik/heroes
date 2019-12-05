import { Pointer, Primitive } from '..';
import { Allocator } from 'memory/allocator/allocator';

export type Float32P = Pointer;
export const FLOAT32_SIZE: number = 4;
export const Float32: Primitive = new Primitive(FLOAT32_SIZE);

Float32.toString = function toString(): string {
    return 'Float32';
}

export function getFloat32(a: Allocator, address: Float32P): number {
    return a.float32View[address >> 2];
}

export function setFloat32(a: Allocator, address: Float32P, v: number): number {
    return a.float32View[address >> 2] = v;
}
