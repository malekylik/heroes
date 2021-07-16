import { vec3 } from './linear-math';
import { Canvas2D } from './render/canvas/canvas2d';
import { Sphere } from './render/models/sphere';
import { Material } from './render/material/material';
import { Light, AmbientLight, PointLight, DirectionalLight } from './render/light';
import { closestIntersection, reflectRay } from './utils/graphic';
import { Model } from './render/models/model';
import { Triangle } from './render/models/triangle';

function canvasToViewport(x: number, y: number, vw: number, vh: number, cw: number, ch: number, d: number): vec3 {
  return vec3(x * vw / cw, y * vh / ch, d);
}

function traceRay(cameraPos: vec3, rayDirection: vec3, scene: Array<Model>, lights: Array<Light>, tMin: number, tMax: number, reflectionDepth: number): vec3 {

  const { closestSphere, closestT } = closestIntersection(cameraPos, rayDirection, scene, tMin, tMax);

  if (closestSphere === null) {
    return vec3(255, 255, 255);
  }

  const P: vec3 = cameraPos.add(rayDirection.mul(closestT));
  let N: vec3 = closestSphere.getNormal(P);

  let color: vec3 = vec3(0, 0, 0);
  const minusRayDirection: vec3 = rayDirection.mul(-1);

  for (let light of lights) {
    const L: vec3 | null = light.getDirection(P);

    if (L) {
      const { closestSphere: shadowSphere } = closestIntersection(P, L, scene, 0.001, tMax);

      if (shadowSphere) {
        continue;
      }
    }

    color = color.add(light.computeLight(P, N, minusRayDirection, closestSphere.material));
  }

  const reflective: number = closestSphere.material.reflective;
  if (!reflective || reflectionDepth <= 0) return color;

  const R: vec3 = reflectRay(minusRayDirection, N)
  const reflectedColor = traceRay(P, R, scene, lights, 0.001, tMax, reflectionDepth - 1);

  return color.mul(1 - reflective).add(reflectedColor.mul(reflective));
}

const canvas: Canvas2D = Canvas2D.getCanvas();

document.body.appendChild(canvas.canvasHTML);

canvas.setSize(400, 400);

const cameraPosition = vec3(0, 1, -5);

const Cw: number = canvas.canvasHTML.width;
const Ch: number = canvas.canvasHTML.height;

const halfCw: number = Math.floor(Cw / 2);
const halfCh: number = Math.floor(Ch / 2);

const Vw: number = 1;
const Vh: number = 1;
const d: number = 1;

const scene: Array<Model> = [
  new Triangle(vec3(1, 2, 3), vec3(0, 5, 3), vec3(3, 2, 3), new Material(vec3(255, 0, 0), vec3(255, 0, 0), 500, 0.2)),
  new Sphere(vec3(0, -1, 3), 1, new Material(vec3(255, 0, 0), vec3(255, 0, 0), 500, 0.2)),
  new Sphere(vec3(2, 0, 4), 1, new Material(vec3(0, 0, 255), vec3(0, 0, 255), 500, 0.3)),
  new Sphere(vec3(-2, 0, 4), 1, new Material(vec3(0, 255, 0), vec3(0, 255, 0), 10, 0.4)),
  new Sphere(vec3(0, -5001, 0), 5000, new Material(vec3(255, 255, 0), vec3(255, 255, 0), 1000, 0.5)),
];

const sceneLight: Array<Light> = [
  new AmbientLight(vec3(0.2, 0.2, 0.2)),
  new PointLight(vec3(0.6, 0.6, 0.6), vec3(2, 1, 0)),
  new DirectionalLight(vec3(0.2, 0.2, 0.2), vec3(1, 4, 4)),
];

const eventStack = {
  'w': false,
  's': false,
  'a': false,
  'd': false,
  'space': false,
  'control': false,
};

function render() {
  requestAnimationFrame(render);

    if (eventStack['w']) { 
      cameraPosition.z += 0.5;
    }
  
    if (eventStack['s']) {
      cameraPosition.z -= 0.5;
    }
  
  
    if (eventStack['a']) {
      cameraPosition.x -= 0.5;
    }
  
    if (eventStack['d']) {
      cameraPosition.x += 0.5;
    }


  if (eventStack['space']) {
    cameraPosition.y += 0.5;
  }


  if (eventStack['control']) {
    cameraPosition.y -= 0.5;
  }

  const now = Date.now();

  for (let x = -halfCw; x < halfCw; x++) {
    for (let y = -halfCh; y < halfCh; y++) {
      const rayDirection: vec3 = canvasToViewport(x, y, Vw, Vh, Cw, Ch, d);
      const color: vec3 = traceRay(cameraPosition, rayDirection, scene, sceneLight, d, Infinity, 2);

      canvas.putPixel(halfCw + x, halfCh - y - 1, color);
    }
  }

  canvas.render();

  console.log(`time: ${Date.now() - now}`);
}


canvas.canvasHTML.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'w') { 
    eventStack['w'] = true;
  }

  if (e.key.toLowerCase() === 's') {
    eventStack['s'] = true;
  }


  if (e.key.toLowerCase() === 'a') {
    eventStack['a'] = true;
  }

  if (e.key.toLowerCase() === 'd') {
    eventStack['d'] = true;
  }

  if (e.key.toLowerCase() === ' ') {
    eventStack['space'] = true;
  }


  if (e.key.toLowerCase() === 'control') {
    eventStack['control'] = true;
  }
})

canvas.canvasHTML.addEventListener('keyup', (e) => {
  if (e.key.toLowerCase() === 'w') { 
    eventStack['w'] = false;
  }

  if (e.key.toLowerCase() === 's') {
    eventStack['s'] = false;
  }


  if (e.key.toLowerCase() === 'a') {
    eventStack['a'] = false;
  }

  if (e.key.toLowerCase() === 'd') {
    eventStack['d'] = false;
  }

  if (e.key.toLowerCase() === ' ') {
    eventStack['space'] = false;
  }


  if (e.key.toLowerCase() === 'control') {
    eventStack['control'] = false;
  }
})

requestAnimationFrame(render);
