// import * as OBJ from 'webgl-obj-loader';

import { vec3 } from './linear-math';
import { Canvas2D } from './render/canvas/canvas2d';
import { Sphere } from './render/models/sphere';
import { Material } from './render/material/material';

abstract class Light {
  constructor(public intensity: vec3) { }

  abstract computeLight(position: vec3, normal: vec3, material: Material): vec3;
}

 class AmbientLight extends Light {
  computeLight(_: vec3, __: vec3, material: Material): vec3 {
    return material.ambient.mul(this.intensity);
  }
}

class PointLight extends Light {
  constructor(intensity: vec3, public position: vec3) {
    super(intensity);
  }
  
  computeLight(position: vec3, normal: vec3, material: Material): vec3 {
    const L: vec3 = this.position.sub(position);
    const nDotL = normal.dot(L);
    let i: vec3 = vec3(0, 0, 0);

    if (nDotL > 0) {
      i = this.intensity.mul(nDotL / (normal.length() * L.length()));
    } else {
      i = vec3(0, 0, 0);
    }

    return material.diffuse.mul(i);
  }
}

class DirectionalLight extends Light {
  constructor(intensity: vec3, public direction: vec3) {
    super(intensity);
  }

  computeLight(_: vec3, normal: vec3, material: Material): vec3 {
    const L: vec3 = this.direction;
    const nDotL = normal.dot(L);
    let i: vec3;

    if (nDotL > 0) {
      i = this.intensity.mul(nDotL / (normal.length() * L.length()));
    } else {
      i = vec3(0, 0, 0);
    }

    return material.diffuse.mul(i);
  }
}

function canvasToViewport(x: number, y: number, vw: number, vh: number, cw: number, ch: number, d: number): vec3 {
  return vec3(x * vw / cw, y * vh / ch, d);
}

function clamp(v: vec3): vec3 {
  return vec3(Math.min(255, Math.max(0, v.x)), Math.min(255, Math.max(0, v.y)), Math.min(255, Math.max(0, v.z)));
}

function traceRay(cameraPos: vec3, pixelPos: vec3, scene: Array<Sphere>, ligths: Array<Light>, tMin: number, tMax: number): vec3 {
  let closestSphere: Sphere = null;
  let closestT: number = Number.MAX_SAFE_INTEGER;

  for (let sphere of scene) {
    const { t1, t2 }: { t1: number, t2: number } = sphere.intersectRay(cameraPos, pixelPos);

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
    return vec3(0, 0, 0);
  }

  const P: vec3 = cameraPos.add(pixelPos.mul(closestT));
  let N: vec3 = P.sub(closestSphere.center);
  N = N.mul(1 / N.length());

  let color: vec3 = vec3(0, 0, 0);

  for (let ligth of ligths) {
    color = color.add(ligth.computeLight(P, N, closestSphere.material));
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
  new Sphere(vec3(0, -1, 3), 1, new Material(vec3(255, 0, 0), vec3(120, 50, 0), 500)),
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
    const direction: vec3 = canvasToViewport(x,y, Vw, Vh, Cw, Ch, d);
    const color: vec3 = clamp(traceRay(cameraPosition, direction, scene, sceneLight, 1, Infinity));

    canvas.putPixel(halfCw + x,halfCh - y - 1, color);
  }
}

canvas.render();

console.log(`time: ${Date.now() - now}`);

// import { CanvasGl } from './render/canvas/canvas-gl';

// const canvas: CanvasGl = CanvasGl.getCanvas();
// const gl: WebGLRenderingContext = canvas.gl;
// const width: number = window.innerWidth;
// const height: number = window.innerHeight;
// const bgColor: glm.vec4 = glm.vec4(0.0, 0.5, 0.0, 1.0);
// const perspective: glm.mat4 = glm.perspective(glm.radians(90), width / height, 1, 1000);
// const translate: glm.mat4 = glm.translate(glm.vec3(-200, -200, -200));
// const path: string = './src/IronMan.obj';
// const A_POSITION: string = 'a_Position';
// const PERSPECTIVE: string = 'perspective';
// const TRANSLATE: string = 'translate';
// const ROTATION: string = 'rotation';        
// let rotation: glm.mat4 = glm.toMat4(glm.angleAxis(glm.radians(45), glm.vec3(0, 1, 1)));
// let verticesCoord: Float32Array;
// let obj: OBJ.Mesh;

// const VSHADER_SOURCE: string =
//   `uniform mat4 ${TRANSLATE}; \n
//   uniform mat4 ${ROTATION}; \n
//   uniform mat4 ${PERSPECTIVE}; \n
//   attribute vec4 ${A_POSITION};\n
//   void main() {\n
//    gl_Position = ${PERSPECTIVE} * ${TRANSLATE} * ${ROTATION} * ${A_POSITION};\n
//   }\n`;
// const FSHADER_SOURCE: string =
//   `void main() {\n
//    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\n
//   }\n`;

// const program: WebGLProgram = createProgram(VSHADER_SOURCE, FSHADER_SOURCE);
// gl.useProgram(program);

// const a_Position: number = gl.getAttribLocation(program, A_POSITION);
// const perspectiveUniformLocation: WebGLUniformLocation =
//   gl.getUniformLocation(program, PERSPECTIVE);
// const translateUniformLocation: WebGLUniformLocation = gl.getUniformLocation(program, TRANSLATE);
// const rotationUniformLocation: WebGLUniformLocation = gl.getUniformLocation(program, ROTATION);

// function loadShader(type: number, source: string): WebGLShader {
//   const shader: WebGLShader = gl.createShader(type);

//   gl.shaderSource(shader, source);
//   gl.compileShader(shader);

//   if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
//     const error: string = gl.getShaderInfoLog(shader);
//     throw new Error(`invalid compile status shader: ${error}`);
//   }

//   return shader;
// }

// function createProgram(vShader: string, fShader: string): WebGLProgram {
//   const vertexShader: WebGLShader = loadShader(gl.VERTEX_SHADER, vShader);
//   const fragmentShader: WebGLShader = loadShader(gl.FRAGMENT_SHADER, fShader);
//   const program: WebGLProgram = gl.createProgram();

//   gl.attachShader(program, vertexShader);
//   gl.attachShader(program, fragmentShader);
//   gl.linkProgram(program);

//   if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
//     const error: string = gl.getProgramInfoLog(program); 
//     throw new Error(`not the last link operation was successful: ${error}`);
//   }

//   return program;
// }

// function render(time: number): void {
//   const vertexBuffer: WebGLBuffer = gl.createBuffer();
//   const indicesBuffer: WebGLBuffer = gl.createBuffer();

//   rotation = glm.toMat4(glm.angleAxis(glm.radians(time / 10), glm.vec3(0, 1, 0)));
//   gl.uniformMatrix4fv(rotationUniformLocation, false, rotation.elements);

//   verticesCoord = new Float32Array(obj.vertices);

//   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
//   gl.bufferData(gl.ARRAY_BUFFER, verticesCoord, gl.STATIC_DRAW);
//   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
//   gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(obj.indices), gl.STATIC_DRAW);
//   gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
//   gl.enableVertexAttribArray(a_Position);

//   canvas.clear();
//   gl.drawElements(gl.TRIANGLES, obj.indices.length, gl.UNSIGNED_SHORT, 0);

//   gl.deleteBuffer(vertexBuffer);
//   gl.deleteBuffer(indicesBuffer);
// }

// function main(time: number) {
//   render(time);
//   requestAnimationFrame(main);
// }

// async function start(): Promise<void> {
//   const response: Response = await fetch(path);
//   const stringObj: string = await response.text();

//   obj = new OBJ.Mesh(stringObj);

//   requestAnimationFrame(main);
// }

// document.body.appendChild(canvas.canvasHTML);

// gl.uniformMatrix4fv(perspectiveUniformLocation, false, perspective.elements);
// gl.uniformMatrix4fv(translateUniformLocation, false, translate.elements);
// gl.uniformMatrix4fv(rotationUniformLocation, false, rotation.elements);

// canvas.bgColor = bgColor;
// canvas.enableDepthTest();
// canvas.setSize(width, height);

// start();
