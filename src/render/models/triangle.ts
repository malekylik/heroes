import { Model } from './model';
import { vec3 } from '../../linear-math';
import { Material } from '../material/material';

export class Triangle extends Model {

    public normal: vec3;
    private p1: vec3;
    private p2: vec3;

    constructor(public a: vec3, public b: vec3, public c: vec3, material: Material) {
        super(material);

        const ab: vec3 = a.sub(b);
        const ac: vec3 = a.sub(c);

        this.p1 = ab;
        this.p2 = ac;

        this.normal = ab.cross(ac);
    }

    intersectRay(cameraPos: vec3, pixelPos: vec3): { t1: number, t2: number } {
        const normal: vec3 = this.normal;
        const op: vec3 = cameraPos.sub(this.p1);
        const dDotN: number = pixelPos.dot(normal);

        if (dDotN === 0) {
            return {
                t1: Number.MAX_SAFE_INTEGER,
                t2: Number.MAX_SAFE_INTEGER,
            };
        }

        const t: number = -((normal.dot(op)) / dDotN);
        const P: vec3 = cameraPos.add(pixelPos.mul(t));

        const S: number = 0.5 * this.p1.cross(this.p2).length();
        const S1: number = 0.5 * this.b.sub(P).cross(this.c.sub(P)).length();
        const S2: number = 0.5 * P.sub(this.c).cross(P.sub(this.a)).length();

        const w1: number = S1 / S;
        const w2: number = S2 / S;
        const w3: number = 1 - w1 - w2;

        if (0 <= w1 + w2 + w3 && w1 + w2 + w3 <= 1) {
            return {
                t1: t,
                t2: t,
            };
        }

        return {
            t1: Number.MAX_SAFE_INTEGER,
            t2: Number.MAX_SAFE_INTEGER,
        };
    }

    getNormal(): vec3 {
        return this.normal.mul(1 / this.normal.length());
    }
}