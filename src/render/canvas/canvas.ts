export class Canvas {

  private readonly _canvasHTML: HTMLCanvasElement;
  private readonly _gl: WebGLRenderingContext;

  private static canvas: Canvas;

  get canvasHTML(): HTMLCanvasElement {
    return this._canvasHTML;
  }

  get gl(): WebGLRenderingContext {
    return this._gl;
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
