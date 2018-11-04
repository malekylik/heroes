import * as glm from 'glm-js';

import { Canvas } from './render/canvas/canvas';

const canvas: Canvas = Canvas.getCanvas();
const width: number = window.innerWidth;
const height: number = window.innerHeight;
const bgColor: any = glm.vec4(0.0, 0.5, 0.0, 1.0);

canvas.setColor(bgColor);

function render(): void {
  canvas.clear();
}

function main(time: number) {
  requestAnimationFrame(main);
  render();
}

document.body.appendChild(canvas.canvasHTML);

canvas.setSize(width, height);

requestAnimationFrame(main);
