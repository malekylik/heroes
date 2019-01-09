export {};

declare global {
    export class SharedArrayBuffer extends ArrayBuffer {
        constructor(length: number);
    } 

    interface Window { SharedArrayBuffer: SharedArrayBuffer; }

}

