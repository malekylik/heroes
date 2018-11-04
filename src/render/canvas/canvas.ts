import * as glm from 'glm-js'

export class Canvas {

  private readonly _canvasHTML: HTMLCanvasElement;
  private readonly _gl: WebGLRenderingContext;
  private bgColor: any = glm.vec4(0.0, 0.0, 0.0, 1.0);

  private static canvas: Canvas;

  get canvasHTML(): HTMLCanvasElement {
    return this._canvasHTML;
  }

  get gl(): WebGLRenderingContext {
    return this._gl;
  }

  clear(): void {
    this._gl.clear(this._gl.COLOR_BUFFER_BIT);
  }

  setColor(rgba: any): void {
    this._gl.clearColor(rgba.r, rgba.g, rgba.b, rgba.a);
    this.bgColor = rgba;
  }

  setSize(width: number, height: number): void {
    this._canvasHTML.style.width = `${width}px`;
    this._canvasHTML.style.height = `${height}px`;
  }

  static getCanvas(): Canvas {
    if (!Canvas.canvas) {
      const canvasHTML: HTMLCanvasElement = document.createElement('canvas');
      Canvas.canvas = new Canvas(canvasHTML);
    }

    return Canvas.canvas;
  }

  private constructor(canvasHTML: HTMLCanvasElement) {
    this._canvasHTML = canvasHTML;
    this._gl = canvasHTML.getContext('webgl');
  }

}
