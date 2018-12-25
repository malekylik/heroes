// import * as OBJ from 'webgl-obj-loader';

import { vec3 } from './linear-math';
import { Canvas2D } from './render/canvas/canvas2d';
import { Sphere } from './render/models/sphere';
import { Material } from './render/material/material';
import { Light, AmbientLight, PointLight, DirectionalLight } from './render/light';

function canvasToViewport(x: number, y: number, vw: number, vh: number, cw: number, ch: number, d: number): vec3 {
  return vec3(x * vw / cw, y * vh / ch, d);
}

function traceRay(cameraPos: vec3, rayDirection: vec3, scene: Array<Sphere>, ligths: Array<Light>, tMin: number, tMax: number): vec3 {
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

  if (closestSphere === null) {
    return vec3(255, 255, 255);
  }

  const P: vec3 = cameraPos.add(rayDirection.mul(closestT));
  let N: vec3 = P.sub(closestSphere.center);
  N = N.mul(1 / N.length());

  let color: vec3 = vec3(0, 0, 0);
  const minusRayDirection: vec3 = rayDirection.mul(-1);

  for (let ligth of ligths) {
    color = color.add(ligth.computeLight(P, N, minusRayDirection, closestSphere.material));
  }

  return color;
}

const canvas: Canvas2D = Canvas2D.getCanvas();

document.body.appendChild(canvas.canvasHTML);

canvas.setSize(400, 400);

const cameraPosition = vec3(0, 0, 0);

const Cw: number = canvas.canvasHTML.width;
const Ch: number = canvas.canvasHTML.height;

const halfCw: number = Math.floor(Cw / 2);
const halfCh: number = Math.floor(Ch / 2);

const Vw: number = 1;
const Vh: number = 1;
const d: number = 1;

const scene: Array<Sphere> = [
  new Sphere(vec3(0, -1, 3), 1, new Material(vec3(255, 0, 0), vec3(255, 0, 0), 500)),
  new Sphere(vec3(2, 0, 4), 1, new Material(vec3(0, 0, 255), vec3(0, 0, 255), 500)),
  new Sphere(vec3(-2, 0, 4), 1, new Material(vec3(0, 255, 0), vec3(0, 255, 0), 10)),
  new Sphere(vec3(0, -5001, 0), 5000, new Material(vec3(255, 255, 0), vec3(255, 255, 0), 1000)),
];

const sceneLight: Array<Light> = [
  new AmbientLight(vec3(0.2, 0.2, 0.2)),
  new PointLight(vec3(0.6, 0.6, 0.6), vec3(2, 1, 0)),
  new DirectionalLight(vec3(0.2, 0.2, 0.2), vec3(1, 4, 4)),
];

const now = Date.now();

for (let x = -halfCw; x < halfCw; x++) {
  for (let y = -halfCh; y < halfCh; y++) {
    const rayDirection: vec3 = canvasToViewport(x, y, Vw, Vh, Cw, Ch, d);
    const color: vec3 = traceRay(cameraPosition, rayDirection, scene, sceneLight, 1, Infinity);

    canvas.putPixel(halfCw + x, halfCh - y - 1, color);
  }
}

canvas.render();

console.log(`time: ${Date.now() - now}`);
