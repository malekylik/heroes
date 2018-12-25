import { vec3 } from '../../linear-math';
import { Material } from '../material/material';
import { Light } from './light';

export class AmbientLight extends Light {
    computeLight(_: vec3, __: vec3, ___: vec3, material: Material): vec3 {
        return material.ambient.mul(this.intensity);
    }
}
