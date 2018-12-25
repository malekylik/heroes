import { vec3 } from './vec3';

export class Vec4 {
    private _v: vec3;
    private _w: number;

    constructor(x: number, y: number, z: number, w: number) {
        this._v = vec3(x, y, z);

        this._w = w;
     }

     get x(): number {
        return this._v.x;
    }

    set x(x: number) {
        this._v.x = x;
    }

    get y(): number {
        return this._v.y;
    }

    set y(y: number) {
        this._v.y = y;
    }

    get z(): number {
        return this._v.z;
    }

    set z(z: number) {
        this._v.z = z;
    }

    get "0"(): number {
        return this.x;
    }

    set "0"(x: number) {
        this.x = x;
    }

    get "1"(): number {
        return this.y;
    }

    set "1"(y: number) {
        this.y = y;
    }

    get "2"(): number {
        return this.z;
    }

    set "2"(z: number) {
        this.z = z;
    }

    get r(): number {
        return this.x;
    }

    set r(r: number) {
        this.x = r;
    }

    get g(): number {
        return this.y;
    }

    set g(g: number) {
        this.y = g;
    }

    get b(): number {
        return this.z;
    }

    set b(b: number) {
        this.z = b;
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

    mul(s: number): Vec4;
    mul(v: vec4): Vec4;
    mul(s: number | vec4): Vec4 {
        if (typeof s === 'number') {
            return new Vec4(this.x * s, this.y * s, this.z * s, this.w * s);
        } else {
            return new Vec4(this.x * s.x, this.y * s.y, this.z * s.z, this.w * s.w);
        }
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
