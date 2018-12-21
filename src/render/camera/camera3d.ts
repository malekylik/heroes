import * as glm from 'glm-js'

import { Camera } from './camera';
import { StateKeys } from '../../classes/StateKeys';

export class Camera3D extends Camera {

    private _pitch: number = 0;
    private _yaw: number = 0;
    private _mousePosX: number = 0;
    private _mousePosY: number = 0;
    private StateKey: StateKeys = new StateKeys();

    update(): void {
        if (this.StateKey.keyW) this.moveForward(this.cameraSpeed);
        if (this.StateKey.keyA) this.moveLeft(this.cameraSpeed);
        if (this.StateKey.keyS) this.moveBack(this.cameraSpeed);
        if (this.StateKey.keyD) this.moveRight(this.cameraSpeed); 
        if (this.updateFlag) this.updateView();
    }

    updateMouse(ev: MouseEvent): void {
        this.moveMouse(ev.clientX, ev.clientY);
    }

    updateKeyboard(ev: KeyboardEvent): void {
        switch (ev.type) {
            case 'keydown': this.StateKey.setKey(ev.keyCode, true); break;
            case 'keyup': this.StateKey.setKey(ev.keyCode, false); break;
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
