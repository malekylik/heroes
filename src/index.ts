import * as glm from 'glm-js';
import * as OBJ from 'webgl-obj-loader';

import { fromEvent, Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

import { Canvas } from './render/canvas/canvas';
import { Camera } from './render/camera/camera';
import { Camera2D } from './render/camera/camera2d';
import { Camera3D } from './render/camera/camera3d';

const canvas: Canvas = Canvas.getCanvas();
const gl: WebGL2RenderingContext = canvas.gl;
const width: number = window.innerWidth;
const height: number = window.innerHeight;
const bgColor: glm.vec4 = glm.vec4(0.0, 0.5, 0.0, 1.0);
const perspective: glm.mat4 = glm.perspective(glm.radians(60), width / height, 1, 1000);
const translate: glm.mat4 = glm.translate(glm.vec3(0, 0, 0));
const path: string = './src/Teapot.obj';

const A_POSITION: string = 'a_Position';
const PERSPECTIVE: string = 'perspective';
const TRANSLATE: string = 'translate';
const ROTATION: string = 'rotation';
const VIEW: string = 'view';

let rotation: glm.mat4 = glm.toMat4(glm.angleAxis(glm.radians(45), glm.vec3(0, 1, 1)));
let verticesCoord: Float32Array;
let obj: OBJ.Mesh;

const VSHADER_SOURCE: string =
  `uniform mat4 ${TRANSLATE}; \n
  uniform mat4 ${ROTATION}; \n
  uniform mat4 ${PERSPECTIVE}; \n
  uniform mat4 ${VIEW}; \n
  attribute vec4 ${A_POSITION};\n
  void main() {\n
   gl_Position = ${PERSPECTIVE} * ${VIEW} * ${TRANSLATE} * ${ROTATION} * ${A_POSITION};\n
  }\n`;
const FSHADER_SOURCE: string =
  `void main() {\n
   gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\n
  }\n`;

const program: WebGLProgram = createProgram(VSHADER_SOURCE, FSHADER_SOURCE);
gl.useProgram(program);

const a_Position: number = gl.getAttribLocation(program, A_POSITION);
const perspectiveUniformLocation: WebGLUniformLocation =
  gl.getUniformLocation(program, PERSPECTIVE);
const translateUniformLocation: WebGLUniformLocation = gl.getUniformLocation(program, TRANSLATE);
const rotationUniformLocation: WebGLUniformLocation = gl.getUniformLocation(program, ROTATION);
const viewUniformLocation: WebGLUniformLocation = gl.getUniformLocation(program, VIEW);

function loadShader(type: number, source: string): WebGLShader {
  const shader: WebGLShader = gl.createShader(type);

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error: string = gl.getShaderInfoLog(shader);
    throw new Error(`invalid compile status shader: ${error}`);
  }

  return shader;
}

function createProgram(vShader: string, fShader: string): WebGLProgram {
  const vertexShader: WebGLShader = loadShader(gl.VERTEX_SHADER, vShader);
  const fragmentShader: WebGLShader = loadShader(gl.FRAGMENT_SHADER, fShader);
  const program: WebGLProgram = gl.createProgram();

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const error: string = gl.getProgramInfoLog(program);
    throw new Error(`not the last link operation was successful: ${error}`);
  }

  return program;
}

function render(time: number): void {
  rotation = glm.toMat4(glm.angleAxis(glm.radians(time / 20), glm.vec3(0, 1, 0)));
  camera.update();
  gl.uniformMatrix4fv(rotationUniformLocation, false, rotation.elements);
  gl.uniformMatrix4fv(viewUniformLocation, false, camera.view.elements);

  canvas.clear();

  gl.drawElements(gl.TRIANGLES, obj.indices.length, gl.UNSIGNED_INT, 0);
}

function main(time: number) {
  render(time);
  requestAnimationFrame(main);
}

async function start(): Promise<void> {
  const response: Response = await fetch(path);
  const stringObj: string = await response.text();

  obj = new OBJ.Mesh(stringObj);

  const vertexBuffer: WebGLBuffer = gl.createBuffer();
  const indicesBuffer: WebGLBuffer = gl.createBuffer();

  verticesCoord = new Float32Array(obj.vertices);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, verticesCoord, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(obj.indices), gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  requestAnimationFrame(main);
}

document.body.appendChild(canvas.canvasHTML);
canvas.setColor(bgColor);
canvas.enableDepthTest();
canvas.setSize(width, height);
canvas.canvasHTML.setAttribute('tabindex', '0');

const camera: Camera = new Camera3D();

gl.uniformMatrix4fv(perspectiveUniformLocation, false, perspective.elements);
gl.uniformMatrix4fv(translateUniformLocation, false, translate.elements);
gl.uniformMatrix4fv(rotationUniformLocation, false, rotation.elements);
gl.uniformMatrix4fv(viewUniformLocation, false, camera.view.elements);


const keyboardEventSubscription: Subscription = fromEvent(canvas.canvasHTML, 'keyup')
  .pipe(
    map((ev: KeyboardEvent) => ev),
  )
  .subscribe((ev: KeyboardEvent) => {
    camera.updateKeyboard(ev);
  });

const keyboardEventSubscription2: Subscription = fromEvent(canvas.canvasHTML, 'keydown')
  .pipe(
    map((ev: KeyboardEvent) => ev),
  )
  .subscribe((ev: KeyboardEvent) => {
    camera.updateKeyboard(ev);
  });

const mouseEventSubscription: Subscription = fromEvent(canvas.canvasHTML, 'mousemove')
  .pipe(
    map((ev: MouseEvent) => ev),
  )
  .subscribe((ev: MouseEvent) => {
    camera.updateMouse(ev);
  });

start();
