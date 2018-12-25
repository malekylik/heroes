import { Light } from "./light";
import { vec3 } from "../../linear-math";
import { Material } from "../material/material";

export class DirectionalLight extends Light {
    constructor(intensity: vec3, public direction: vec3) {
        super(intensity);
    }

    computeLight(_: vec3, normal: vec3, rayDirection: vec3, material: Material): vec3 {
        const lightDirection: vec3 = this.direction;

        return material.diffuse.mul(this.computeIntensity(lightDirection, normal, rayDirection, material));
    }
}
