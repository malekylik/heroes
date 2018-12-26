export class Vec3 {
    private _x: number;
    private _y: number;
    private _z: number;

    constructor(x: number, y: number, z: number) {
        this._x = x;
        this._y = y;
        this._z = z;
     }

    get x(): number {
        return this._x;
    }

    set x(x: number) {
        this._x = x;
    }

    get y(): number {
        return this._y;
    }

    set y(y: number) {
        this._y = y;
    }

    get z(): number {
        return this._z;
    }

    set z(z: number) {
        this._z = z;
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

    dot(v: Vec3): number {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    add(v: Vec3): Vec3 {
        return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
    }

    sub(v: Vec3): Vec3 {
        return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    mul(s: number): Vec3;
    mul(v: vec3): Vec3;
    mul(s: number | vec3): Vec3 {
        if (typeof s === 'number') {
            return new Vec3(this.x * s, this.y * s, this.z * s);
        } else {
            return new Vec3(this.x * s.x, this.y * s.y, this.z * s.z);
        }
    }

    cross(v: vec3): vec3 {
        return new Vec3(this.y * v.z - this.z * v.y, -(this.x * v.z - this.z * v.x), this.x * v.y - this.y * v.x);
    }

    div(s: number): Vec3 {
        return new Vec3(this.x / s, this.y / s, this.z / s);
    }

    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
}

export type vec3 = Vec3;
export function vec3(x: number, y: number, z: number): vec3 {
    return new Vec3(x, y, z);
}
