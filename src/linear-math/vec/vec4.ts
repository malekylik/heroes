import { Vec3 } from './vec3';

export class Vec4 extends Vec3 {
    private _w: number;

    constructor(x: number, y: number, z: number, w: number) {
        super(x, y, z);

        this._w = w;
     }

    get w(): number {
        return this._w;
    }

    set w(w: number) {
        this._w = w;
    }

    get "3"(): number {
        return this.w;
    }

    set "3"(w: number) {
        this.w = w;
    }

    get a(): number {
        return this.z;
    }

    set a(a: number) {
        this.a = a;
    }

    dot(v: Vec4): number {
        return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
    }

    add(v: Vec4): Vec4 {
        return new Vec4(this.x + v.x, this.y + v.y, this.z + v.z, this.w + v.w);
    }

    sub(v: Vec4): Vec4 {
        return new Vec4(this.x - v.x, this.y - v.y, this.z - v.z, this.w - v.w);
    }

    mul(s: number): Vec4 {
        return new Vec4(this.x * s, this.y * s, this.z * s, this.w * s);
    }

    div(s: number): Vec4 {
        return new Vec4(this.x / s, this.y / s, this.z / s, this.w / s);
    }

    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    }
}

export type vec4 = Vec4;
export function vec4(x: number, y: number, z: number, w: number): vec4 {
    return new Vec4(x, y, z, w);
}
