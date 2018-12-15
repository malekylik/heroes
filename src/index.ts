import * as glm from 'glm-js';
import * as OBJ from 'webgl-obj-loader';

import { fromEvent, Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

import { Canvas } from './render/canvas/canvas';

enum Keys { W = 119, A = 97, S = 115, D = 100 };

const canvas: Canvas = Canvas.getCanvas();
const gl: WebGLRenderingContext = canvas.gl;
const width: number = window.innerWidth;
const height: number = window.innerHeight;
const bgColor: glm.vec4 = glm.vec4(0.0, 0.5, 0.0, 1.0);
const perspective: glm.mat4 = glm.perspective(glm.radians(90), width / height, 1, 1000);
const translate: glm.mat4 = glm.translate(glm.vec3(0, 0, 0));
const path: string = './src/groza_obj.obj';

const A_POSITION: string = 'a_Position';
const PERSPECTIVE: string = 'perspective';
const TRANSLATE: string = 'translate';
const ROTATION: string = 'rotation';
const VIEW: string = 'view';

const cameraPos: glm.vec3 = glm.vec3(0, 0, 200);
const cameraUp: glm.vec3 = glm.vec3(0, 1, 0);
const cameraSpeed: number = 10;
const sensetivity: number = 0.5;

let cameraFront: glm.vec3 = glm.vec3(0, 0, -3);
let pitch: number = 0;
let yaw: number = 0;

let view: glm.mat4 = glm.lookAt(cameraPos, cameraPos['+'](cameraFront), cameraUp);
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
  const vertexBuffer: WebGLBuffer = gl.createBuffer();
  const indicesBuffer: WebGLBuffer = gl.createBuffer();

  rotation = glm.toMat4(glm.angleAxis(glm.radians(time / 20), glm.vec3(0, 1, 0)));
  gl.uniformMatrix4fv(rotationUniformLocation, false, rotation.elements);

  view = glm.lookAt(cameraPos, cameraPos['+'](cameraFront), cameraUp);
  gl.uniformMatrix4fv(viewUniformLocation, false, view.elements);

  verticesCoord = new Float32Array(obj.vertices);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, verticesCoord, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(obj.indices), gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  canvas.clear();
  gl.drawElements(gl.TRIANGLES, obj.indices.length, gl.UNSIGNED_SHORT, 0);

  gl.deleteBuffer(vertexBuffer);
  gl.deleteBuffer(indicesBuffer);
}

function main(time: number) {
  render(time);
  requestAnimationFrame(main);
}

async function start(): Promise<void> {
  const response: Response = await fetch(path);
  const stringObj: string = await response.text();

  obj = new OBJ.Mesh(stringObj);

  requestAnimationFrame(main);
}

document.body.appendChild(canvas.canvasHTML);

gl.uniformMatrix4fv(perspectiveUniformLocation, false, perspective.elements);
gl.uniformMatrix4fv(translateUniformLocation, false, translate.elements);
gl.uniformMatrix4fv(rotationUniformLocation, false, rotation.elements);
gl.uniformMatrix4fv(viewUniformLocation, false, view.elements);

canvas.setColor(bgColor);
canvas.enableDepthTest();
canvas.setSize(width, height);
canvas.canvasHTML.setAttribute('tabindex', '0');

const source: Observable<Event> = fromEvent(canvas.canvasHTML, 'keypress');
const keyboardEventSubscription: Subscription = source
  .pipe(
    map((ev: KeyboardEvent) => ev.keyCode),
  )
  .subscribe((keyCode: number) => {
    switch (keyCode) {
      case Keys.W: cameraPos['+='](cameraFront['*'](cameraSpeed)); break;
      case Keys.A: cameraPos['-='](glm.normalize(glm.cross(cameraFront, cameraUp))['*'](cameraSpeed)); break;
      case Keys.S: cameraPos['-='](cameraFront['*'](cameraSpeed)); break;
      case Keys.D: cameraPos['+='](glm.normalize(glm.cross(cameraFront, cameraUp))['*'](cameraSpeed)); break;
    }
  });

let lastX: number = 0;
let lastY: number = 0;

const mouseEventSubscription: Subscription = fromEvent(canvas.canvasHTML, 'mousemove')
  .pipe(
    map((ev: MouseEvent) => ev),
  )
  .subscribe((ev: MouseEvent) => {
    const xOffset: number = (ev.clientX - lastX) * sensetivity;
    const yOffset: number = (ev.clientY - lastY) * sensetivity;
    
    lastX = ev.clientX;
    lastY = ev.clientY;

    yaw += xOffset;
    pitch -= yOffset;
    
    if(pitch > 89) pitch = 89;
    if(pitch < -89) pitch = -89;
    
    cameraFront.x = Math.cos(glm.radians(pitch)) * Math.cos(glm.radians(yaw))
    cameraFront.y = Math.sin(glm.radians(pitch));
    cameraFront.z = Math.cos(glm.radians(pitch)) * Math.sin(glm.radians(yaw))
    cameraFront = glm.normalize(cameraFront);

    view = glm.lookAt(cameraPos, cameraPos['+'](cameraFront), cameraUp);
  });

start();
