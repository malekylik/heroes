import { Canvas } from './render/canvas/canvas';

const canvas: Canvas = Canvas.getCanvas();
const width: number = window.innerWidth;
const height: number = window.innerHeight;

document.body.appendChild(canvas.canvasHTML);

canvas.setSize(width, height);
