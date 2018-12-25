import { vec3 } from '../../linear-math';
import { Material } from '../material/material';
import { reflectRay } from '../../utils/graphic';

export abstract class Light {
    constructor(public intensity: vec3) { }
  
    abstract computeLight(position: vec3, normal: vec3, rayDirection: vec3, material: Material): vec3;
    abstract getDirection(p: vec3): null | vec3;

    protected computeIntensity(lightDirection: vec3, normal: vec3, rayDirection: vec3, material: Material): vec3 {
      const nDotL = normal.dot(lightDirection);
      let i: vec3 = vec3(0, 0, 0);
  
      if (nDotL > 0) {
        i = this.intensity.mul(nDotL / (normal.length() * lightDirection.length()));
      }
  
      if (material.specular != -1) {
        const reflectionDirection = reflectRay(lightDirection, normal);
        const reflectionDDotRayD: number = reflectionDirection.dot(rayDirection);
  
        if (reflectionDDotRayD > 0) {
          i = i.add(this.intensity.mul(Math.pow(reflectionDDotRayD / (reflectionDirection.length() * rayDirection.length()), material.specular)));
        }
      }
  
      return i;
    }
  }
  