import { vec3 } from '../../linear-math';
import { Material } from '../material/material';
import { Model } from './model';

export class Sphere extends Model {
    constructor(public center: vec3, private radius: number, material: Material) { 
        super(material);
    }

    intersectRay(cameraPos: vec3, pixelPos: vec3): { t1: number, t2: number } {
        const oc: vec3 = cameraPos.sub(this.center);

        const k1: number = pixelPos.dot(pixelPos);
        const k2: number = oc.dot(pixelPos) * 2;
        const k3: number = oc.dot(oc) - this.radius * this.radius;

        const discriminant: number = k2 * k2 - 4 * k1 * k3;

        if (discriminant < 0) {
            return {
                t1: Number.MAX_SAFE_INTEGER,
                t2: Number.MAX_SAFE_INTEGER,
            };
        }

        return {
            t1: (-k2 + Math.sqrt(discriminant)) / (2 * k1),
            t2: (-k2 - Math.sqrt(discriminant)) / (2 * k1),
        };
    }

    getNormal(p: vec3): vec3 {
        let N: vec3 = p.sub(this.center);
        return N.mul(1 / N.length());
    }
}
