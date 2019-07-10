import { toInt32 } from 'memory/coercion';
import { getInt8 } from 'memory/types/Int/Int8';
import { getInt32 } from 'memory/types/Int/Int32';
import { Allocator } from 'memory/allocator/allocator';
import { Pointer } from 'memory/types';

export const ELEMENT_HEIGTH: number = 28;

export function getElementIndx(scrollPosition: number): number {
  return toInt32(scrollPosition / ELEMENT_HEIGTH);
}

export function getElementIndxWithFrac(scrollPosition: number): number {
  return scrollPosition / ELEMENT_HEIGTH;
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
