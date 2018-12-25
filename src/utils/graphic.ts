import { vec3 } from '../linear-math';
import { Sphere } from '../render/models/sphere';

export function closestIntersection(cameraPos: vec3, rayDirection: vec3, scene: Array<Sphere>, tMin: number, tMax: number): { closestSphere: Sphere, closestT: number } {
    let closestSphere: Sphere = null;
    let closestT: number = Number.MAX_SAFE_INTEGER;

    for (let sphere of scene) {
        const { t1, t2 }: { t1: number, t2: number } = sphere.intersectRay(cameraPos, rayDirection);

        if ((t1 >= tMin && t1 <= tMax) && t1 < closestT) {
            closestT = t1;
            closestSphere = sphere;
        }

        if ((t2 >= tMin && t2 <= tMax) && t2 < closestT) {
            closestT = t2;
            closestSphere = sphere;
        }
    }

    return {
        closestSphere,
        closestT,
    }
}
