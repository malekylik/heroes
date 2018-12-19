import * as glm from 'glm-js'

import { Camera } from './camera';
import { Keys } from '../../consts/keys'

export class Camera3D extends Camera {

    private _pitch: number = 0;
    private _yaw: number = 0;
    private _mousePosX: number = 0;
    private _mousePosY: number = 0;

    update(): void {
        if (this.updateFlag) this.updateView();
    }

    updateMouse(ev: MouseEvent): void {
        this.moveMouse(ev.clientX, ev.clientY);
    }

    updateKeyboard(ev: KeyboardEvent): void {
        switch (ev.keyCode) {
            case Keys.W: this.moveForward(this.cameraSpeed); break;
            case Keys.A: this.moveLeft(this.cameraSpeed); break;
            case Keys.S: this.moveBack(this.cameraSpeed); break;
            case Keys.D: this.moveRight(this.cameraSpeed); break;
        }
    }

    moveMouse(x: number, y: number): void {
        const xOffset: number = (x - this._mousePosX) * this.mouseSpeed;
        const yOffset: number = (y - this._mousePosY) * this.mouseSpeed;

        this._mousePosX = x;
        this._mousePosY = y;

        this._yaw += xOffset;
        this._pitch -= yOffset;

        if (this._pitch > 89) this._pitch = 89;
        if (this._pitch < -89) this._pitch = -89;

        this.cameraFront.x = Math.cos(glm.radians(this._pitch)) * Math.cos(glm.radians(this._yaw))
        this.cameraFront.y = Math.sin(glm.radians(this._pitch));
        this.cameraFront.z = Math.cos(glm.radians(this._pitch)) * Math.sin(glm.radians(this._yaw))
        this.cameraFront = glm.normalize(this.cameraFront);

        super.moveMouse(x, y);
    }

    constructor() {
        super();
    }

}
