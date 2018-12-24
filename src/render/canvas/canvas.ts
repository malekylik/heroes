import { vec4 } from '../../linear-math';

export abstract class Canvas {

  private readonly _canvasHTML: HTMLCanvasElement;
  private _bgColor: vec4 = vec4(0.0, 0.0, 0.0, 1.0);

  get bgColor(): vec4 {
    return this._bgColor;
  }

  set bgColor(rgba: vec4) {
    this._bgColor = rgba;
  }

  get canvasHTML(): HTMLCanvasElement {
    return this._canvasHTML;
  }
  
  setSize(width: number, height: number): void {
    this._canvasHTML.style.width = `${width}px`;
    this._canvasHTML.style.height = `${height}px`;
    this._canvasHTML.width = width;
    this._canvasHTML.height = height;
  }

  abstract clear(): void;

  constructor(canvasHTML: HTMLCanvasElement) {
    this._canvasHTML = canvasHTML;
  }
}
