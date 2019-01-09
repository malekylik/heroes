import { Pointer } from './types';

export class Allocator {
    memory: SharedArrayBuffer;
    totalSize: number;
    freeSize: number;

    freeMemoryPoint: number;

    intView: Int32Array;
}

export function createAllocator(size: number, options?: object): Allocator {
    const allocator: Allocator = new Allocator();
    const memory: SharedArrayBuffer = new ArrayBuffer(size);

    allocator.totalSize = size;
    allocator.freeSize = size;

    allocator.freeMemoryPoint = 0;

    allocator.memory = memory;

    allocator.intView = new Int32Array(memory);

    return allocator;
}

export function allocate(allocator: Allocator, size: number): Pointer {
    const freeMemoryPoint: number = getFreeMemoryAddress(allocator, size);

    incrementFreePoint(allocator, size);

    return freeMemoryPoint;
}

function incrementFreePoint(allocator: Allocator, number: number): void {
    allocator.freeMemoryPoint += number;
}

function getFreeMemoryAddress(allocator: Allocator, size: number): number {
    size;
    return allocator.freeMemoryPoint;
}

export function get4Byte(a: Allocator, address: number): number {
    return a.intView[address >> 2];
}

export function set4Byte(a: Allocator, address: number, v: number): number {
    return a.intView[address >> 2] = v;
}
