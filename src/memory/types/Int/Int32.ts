import { Primitive, Pointer } from '../type';
import { Allocator, get4Byte, set4Byte } from '../../allocator';
import { toInt32 } from '../../coercion';

export type Int32P = Pointer;
export const INT_SIZE: number = 4;
export const Int: Primitive = new Primitive(INT_SIZE);

export function getInt32(a: Allocator, address: Int32P): number {
    return get4Byte(a, address);
}

export function setInt32(a: Allocator, address: Int32P, v: number): number {
    return set4Byte(a, address, toInt32(v));
}

