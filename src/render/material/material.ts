import { vec3 } from "../../linear-math";

export class Material {
    constructor(public ambient: vec3, public diffuse: vec3, public specular: number, public reflective: number) {}
}
