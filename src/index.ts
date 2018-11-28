import * as glm from 'glm-js';
import * as OBJ from 'webgl-obj-loader';

import { Canvas } from './render/canvas/canvas';

const canvas: Canvas = Canvas.getCanvas();
const gl: WebGLRenderingContext = canvas.gl;
const width: number = window.innerWidth;
const height: number = window.innerHeight;
const bgColor: any = glm.vec4(0.0, 0.5, 0.0, 1.0);
const perspective: any = glm.perspective(glm.radians(90), width / height, 1, 1000);
const translate: any = glm.translate(glm.vec3(0, 0, -200 ));
const path: string = './src/groza_obj.obj';
const A_POSITION: string = 'a_Position';
const PERSPECTIVE: string = 'perspective';
const TRANSLATE: string = 'translate';
const ROTATION: string = 'rotation';        
let rotation: any = glm.toMat4(glm.angleAxis(glm.radians(45), glm.vec3(0, 1, 1)));
let verticesCoord: Float32Array;
let obj: any;

const VSHADER_SOURCE: string =
  `uniform mat4 ${TRANSLATE}; \n
  uniform mat4 ${ROTATION}; \n
  uniform mat4 ${PERSPECTIVE}; \n
  attribute vec4 ${A_POSITION};\n
  void main() {\n
   gl_Position = ${PERSPECTIVE} * ${TRANSLATE} * ${ROTATION} * ${A_POSITION};\n
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
  
  rotation = glm.toMat4(glm.angleAxis(glm.radians(time / 10), glm.vec3(0, 1, 0)));
  gl.uniformMatrix4fv(rotationUniformLocation, false, rotation.elements);

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

canvas.setColor(bgColor);
canvas.enableDepthTest();
canvas.setSize(width, height);

start();
