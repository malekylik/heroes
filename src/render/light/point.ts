import { Light } from './light';
import { vec3 } from '../../linear-math';
import { Material } from '../material/material';

export class PointLight extends Light {
    constructor(intensity: vec3, public position: vec3) {
        super(intensity);
    }

    computeLight(position: vec3, normal: vec3, rayDirection: vec3, material: Material): vec3 {
        const lightDirection: vec3 = this.position.sub(position);

        return material.diffuse.mul(this.computeIntensity(lightDirection, normal, rayDirection, material));
    }

    getDirection(p: vec3): null | vec3 {
        return this.position.sub(p);
    }
}
