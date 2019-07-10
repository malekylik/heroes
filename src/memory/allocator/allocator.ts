import { Pointer, alignTo8 } from '../types';
import { createMemoryState, mstate } from './dlmalloc.cpp';

export class Allocator {
    memory: ArrayBuffer;
    totalSize: number;
    freeSize: number;

    memoryState: mstate;

    programBreak: number;

    int8View: Int8Array;
    int32View: Int32Array;
    float64View: Float64Array;
}

export function createAllocator(size: number, options?: object): Allocator {
    size = alignTo8(size);

    const allocator: Allocator = new Allocator();
    const memory: ArrayBuffer = new ArrayBuffer(size);
    const alignedSize: number = size;

    // TODO
    allocator.programBreak = 32;

    allocator.totalSize = alignedSize;
    allocator.freeSize = alignedSize;

    allocator.memoryState = createMemoryState();

    allocator.memory = memory;

    allocator.int8View = new Int8Array(memory);
    allocator.int32View = new Int32Array(memory);
    allocator.float64View = new Float64Array(memory);

    return allocator;
}

export function sbrk(allocator: Allocator, amount: number): Pointer {
    const { programBreak, totalSize } = allocator;
    const newProgramBreak = programBreak + amount;

    if (newProgramBreak >= 0 && newProgramBreak <= totalSize) {
        allocator.programBreak = newProgramBreak;
        allocator.freeSize = allocator.totalSize - newProgramBreak;

        return programBreak;
    }

    return -1;
}

export function get1Byte(a: Allocator, address: number): number {
    return a.int8View[address];
}

export function set1Byte(a: Allocator, address: number, v: number): number {
    return a.int8View[address] = v;
}

export function get4Byte(a: Allocator, address: number): number {
    return a.int32View[address >> 2];
}

export function set4Byte(a: Allocator, address: number, v: number): number {
    return a.int32View[address >> 2] = v;
}

export function get8Byte(a: Allocator, address: number): number {
    return a.float64View[address >> 3];
}

export function set8Byte(a: Allocator, address: number, v: number): number {
    return a.float64View[address >> 3] = v;
}

export function getBytesCount(a: Allocator): number {
  return a.totalSize;
}
