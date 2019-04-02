import { Pointer, alignTo8, alignBin } from './types';
import { MemoryChunk } from './memory-chunk';
import { toInt32 } from './coercion';

export class Allocator {
    memory: SharedArrayBuffer;
    totalSize: number;
    freeSize: number;

    freeChuncks: MemoryChunk[];

    int32View: Int32Array;
    float64View: Float64Array;
}

export function createAllocator(size: number, options?: object): Allocator {
    const allocator: Allocator = new Allocator();
    const memory: SharedArrayBuffer = new ArrayBuffer(size);

    allocator.freeChuncks = new Array(1);
    allocator.freeChuncks[0] = {
        address: 0,
        size
    };

    allocator.totalSize = size;
    allocator.freeSize = size;

    allocator.memory = memory;

    allocator.int32View = new Int32Array(memory);
    allocator.float64View = new Float64Array(memory);

    return allocator;
}

export function allocate(allocator: Allocator, size: number): Pointer {
    const freeMemoryChunk: MemoryChunk = getFreeMemoryAddress(allocator.freeChuncks, size);

    if (freeMemoryChunk === null) return null; 

    const { address, size: chunkSize } = freeMemoryChunk;
    const addressWithAlignment: number = address < 8 ? alignBin(address) : alignTo8(address);

    if ((address + chunkSize) - (addressWithAlignment + size)) {
        const newAddress: number = addressWithAlignment + size;
        const newSize: number = (address + chunkSize) - newAddress;

        const zeroChunk: MemoryChunk = getZeroSizeMemoryChunk(allocator.freeChuncks);

        if (zeroChunk) {
            zeroChunk.address = newAddress;
            zeroChunk.size = newSize;
        } else {
            allocator.freeChuncks.push({
                address: newAddress,
                size: newSize,
            });
        }
    }

    freeMemoryChunk.size = addressWithAlignment - address;

    insertationSort(allocator.freeChuncks);

    return addressWithAlignment;
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

export function getFreeMemoryAddress(chunks: MemoryChunk[], size: number): MemoryChunk | null {
    return getFreeMemoryAddressRec(chunks, size, 0, chunks.length);
}

function getZeroSizeMemoryChunk(chunks: MemoryChunk[]): MemoryChunk | null {
    for (let i = 0; i < chunks.length; i++) {
        if (!chunks[i].size) return chunks[i];
    }

    return null;
}

function getFreeMemoryAddressRec(chunks: MemoryChunk[], size: number, l: number, r: number): MemoryChunk | null {
    const median: number = toInt32((r + l) / 2);
    const { address, size: chunkSize } = chunks[median];
    const sizeWithAlignment: number = chunkSize - (alignTo8(address) - address);

    if (r - l === 0) return sizeWithAlignment < size ? null : chunks[median];

    if (size <= sizeWithAlignment) return getFreeMemoryAddressRec(chunks, size, l, median);
    return getFreeMemoryAddressRec(chunks, size, median + 1, r);
}

function insertationSort(chunks: MemoryChunk[]): void {
    let temp: number;

    for (let i = 1; i < chunks.length; i++) {
        for (let j = i - 1; j < i; j++) {
            if (chunks[i].size < chunks[j].size) {
                temp = chunks[i].size;
                chunks[i].size = chunks[j].size;
                chunks[j].size = temp;

                temp = chunks[i].address;
                chunks[i].address = chunks[j].address;
                chunks[j].address = temp;
            } else break;
        }
    }
}
