import { Model } from './model';
import { vec3 } from '../../linear-math';
import { Material } from '../material/material';

export class Triangle extends Model {

    public normal: vec3;
    private edge0: vec3;
    private edge1: vec3;
    private edge2: vec3;

    constructor(public a: vec3, public b: vec3, public c: vec3, material: Material) {
        super(material);
        
        const edge0: vec3 = this.b.sub(this.a);
        const edge1: vec3 = this.c.sub(this.b);
        const edge2: vec3 = this.a.sub(this.c);

        this.normal = edge0.cross(edge1);
        this.edge0 = edge0;
        this.edge1 = edge1;
        this.edge2 = edge2;
    }

    intersectRay(cameraPos: vec3, pixelPos: vec3): { t1: number, t2: number } {
        const normal: vec3 = this.normal;
        const op: vec3 = cameraPos.sub(this.a);
        const dDotN: number = pixelPos.dot(normal);

        if (dDotN === 0) {
            return {
                t1: Number.MAX_SAFE_INTEGER,
                t2: Number.MAX_SAFE_INTEGER,
            };
        }

        const t: number = -((normal.dot(op)) / dDotN);

        const P: vec3 = cameraPos.add(pixelPos.mul(t));

        const C0: vec3 = P.sub(this.a); 
        const C1: vec3 = P.sub(this.b); 
        const C2: vec3 = P.sub(this.c); 

        if (
            normal.dot(this.edge0.cross(C0)) > 0 &&
            normal.dot(this.edge1.cross(C1)) > 0 &&
            normal.dot(this.edge2.cross(C2)) > 0
        ) {
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