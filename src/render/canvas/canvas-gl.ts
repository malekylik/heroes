import { vec4 } from '../../linear-math';
import { Canvas } from './canvas';

export class CanvasGl extends Canvas {
    private readonly _gl: WebGLRenderingContext;

    private static canvas: CanvasGl;

    get gl(): WebGLRenderingContext {
        return this._gl;
    }

    clear(): void {
        this._gl.clear(this._gl.COLOR_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT);
    }

    enableDepthTest(): void {
        this._gl.enable(this._gl.DEPTH_TEST);
    }

    set bgColor(rgba: vec4) {
        super.bgColor = rgba;
        this._gl.clearColor(rgba.r, rgba.g, rgba.b, rgba.a);
    }

    setSize(width: number, height: number): void {
        super.setSize(width, height);
        this._gl.viewport(0, 0, this._gl.drawingBufferWidth, this._gl.drawingBufferHeight);
    }

    static getCanvas(): CanvasGl {
        if (!CanvasGl.canvas) {
            const canvasHTML: HTMLCanvasElement = document.createElement('canvas');
            CanvasGl.canvas = new CanvasGl(canvasHTML);
        }

        return CanvasGl.canvas;
    }

    protected constructor(canvasHTML: HTMLCanvasElement) {
        super(canvasHTML);
        this._gl = canvasHTML.getContext('webgl');
    }
}
