import * as glm from 'glm-js'

export class Canvas {

  private readonly _canvasHTML: HTMLCanvasElement;
  private readonly _gl: WebGLRenderingContext;
  private _bgColor: glm.vec4 = glm.vec4(0.0, 0.0, 0.0, 1.0);

  private static canvas: Canvas;

  get bgColor(): glm.vec4 {
    return this._bgColor;
  }

  get canvasHTML(): HTMLCanvasElement {
    return this._canvasHTML;
  }

  get gl(): WebGLRenderingContext {
    return this._gl;
  }

  clear(): void {
    this._gl.clear(this._gl.COLOR_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT);
  }

  enableDepthTest(): void {
    this._gl.enable(this._gl.DEPTH_TEST);
  }

  setColor(rgba: glm.vec4): void {
    this._gl.clearColor(rgba.r, rgba.g, rgba.b, rgba.a);
    this._bgColor = rgba;
  }

  setSize(width: number, height: number): void {
    this._canvasHTML.style.width = `${width}px`;
    this._canvasHTML.style.height = `${height}px`;
    this._gl.canvas.width = width;
    this._gl.canvas.height = height;
    this._gl.viewport(0, 0, this._gl.drawingBufferWidth, this._gl.drawingBufferHeight);
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
