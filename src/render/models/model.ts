import { vec3 } from '../../linear-math';
import { Material } from '../material/material';

export abstract class Model {
    constructor(public material: Material) {}

    abstract intersectRay(cameraPos: vec3, pixelPos: vec3): { t1: number, t2: number };
    abstract getNormal(p: vec3): vec3;
}
