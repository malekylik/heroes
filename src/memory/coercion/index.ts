export function toInt32(v: number): number {
    return v | 0;
}

export function toUnsignedInt32(v: number): number {
    return (v << 32) >>> 32;
}
