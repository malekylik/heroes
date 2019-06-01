export function assert(condition: boolean): void {
    if (!condition) {
        throw "Assertation doesn't work!";
    }
}

export function createArray<U>(length: number, initValue: U): Array<U> {
    const arr: Array<U> = new Array<U>(length);

    for (let i = length - 1; i >= 0; i--) {
        arr[i] = initValue;
    }

    return arr;
}
