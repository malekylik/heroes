import { toInt32 } from 'memory/coercion';
import { getInt8 } from 'memory/types/Int/Int8';
import { getInt32 } from 'memory/types/Int/Int32';
import { Allocator } from 'memory/allocator';
import { Pointer } from 'memory/types';

export const ELEMENT_HEIGTH: number = 28;

export function getElementIndx(scrollPosition: number): number {
  return toInt32(scrollPosition / ELEMENT_HEIGTH);
}

export function getElementInContainerCount(wrapperHeight: number): number {
  return toInt32(wrapperHeight / ELEMENT_HEIGTH);
}

export function getValue(allocator: Allocator, byteSize: number, address: Pointer): number {
  switch(byteSize) {
    case 1: return getInt8(allocator, address);
    case 4: return getInt32(allocator, address);
    default: return -1;
  }
}

export function getAddressOffset(length: number): number {
  return 0;
}

export function get1ByteValueOffset(length: number): number {
  return getAddressOffset(length) + getAddressLength(length);
}

export function get4ByteValueOffset(length: number): number {
  return get1ByteValueOffset(length) + get1ByteValueLength(length);
}

export function getAddressLength(length: number): number {
  return length;
}

export function get1ByteValueLength(length: number): number {
  return length;
}

export function get4ByteValueLength(length: number): number {
  return toInt32(length / 4);
}
