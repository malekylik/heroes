import { Canvas } from './canvas';
import { vec3, vec4 } from '../../linear-math';

export class Canvas2D extends Canvas {
    private readonly ctx: CanvasRenderingContext2D;

    private static canvas: Canvas2D;
    private buffer: ImageData;
    private canvasPitch: number;

    get context(): CanvasRenderingContext2D {
        return this.ctx;
    }

    clear(): void {
        for (let x = 0; x < this.canvasHTML.width; x++) {
            for (let y = 0; y < this.canvasHTML.height; y++) {
                this.putPixel(x, y, this.bgColor);
            }
        }
    }

    putPixel(x: number, y: number, color: vec3 | vec4): void {
        if (x < 0 || x >= this.canvasHTML.width || y < 0 || y >= this.canvasHTML.height) {
            throw new Error('out of range');
          }

          let offset = 4 * x + this.canvasPitch * y;
          this.buffer.data[offset++] = color.x;
          this.buffer.data[offset++] = color.y;
          this.buffer.data[offset++] = color.z;
          this.buffer.data[offset++] = 255;
    }

    render(): void {
        this.ctx.putImageData(this.buffer, 0, 0);
    }

    setSize(width: number, height: number): void {
        super.setSize(width, height);
        this.buffer = this.ctx.getImageData(0, 0, this.canvasHTML.width, this.canvasHTML.height);
        this.canvasPitch = this.buffer.width * 4;
    }

    static getCanvas(): Canvas2D {
        if (!Canvas2D.canvas) {
            const canvasHTML: HTMLCanvasElement = document.createElement('canvas');
            canvasHTML.tabIndex = 0;
            Canvas2D.canvas = new Canvas2D(canvasHTML);
        }

        return Canvas2D.canvas;
    }

    protected constructor(canvasHTML: HTMLCanvasElement) {
        super(canvasHTML);
        this.ctx = canvasHTML.getContext('2d');

        this.buffer = this.ctx.getImageData(0, 0, this.canvasHTML.width, this.canvasHTML.height);
        this.canvasPitch = this.buffer.width * 4;
    }
}
