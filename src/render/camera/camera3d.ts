import * as glm from 'glm-js'

import { Camera } from './camera';
import { ACCURACY_ROUND } from '../../consts/consts';

export class Camera3D extends Camera {

    private _pitch: number = 0;
    private _yaw: number = 0;
    private _mousePosX: number = 0;
    private _mousePosY: number = 0;

    update(): void {
        if (this.stateKey.keyW) this.moveForward(this.cameraSpeed);
        if (this.stateKey.keyA) this.moveLeft(this.cameraSpeed);
        if (this.stateKey.keyS) this.moveBack(this.cameraSpeed);
        if (this.stateKey.keyD) this.moveRight(this.cameraSpeed);
        if (this.updateFlag) this.updateView();
    }

    updateMouse(ev: MouseEvent): void {
        if (this.stateKey.focus)
            this.moveMouse(ev.clientX, ev.clientY);
    }

    updateKeyboard(ev: KeyboardEvent): void {
        switch (ev.type) {
            case 'keydown': this.stateKey.setKey(ev.keyCode, true); break;
            case 'keyup': this.stateKey.setKey(ev.keyCode, false); break;
        }
    }

    moveMouse(x: number, y: number): void {
        
        if (this.stateKey.isFirstMouse) {
            this._mousePosX = x;
            this._mousePosY = y;

            this.stateKey.isFirstMouse = false;

            return;
        }

        const xOffset: number = (x - this._mousePosX) * this.mouseSpeed;
        const yOffset: number = (y - this._mousePosY) * this.mouseSpeed;

        this._mousePosX = x;
        this._mousePosY = y;

        this._yaw += xOffset;
        this._pitch -= yOffset;

        if (this._pitch > 89) this._pitch = 89;
        if (this._pitch < -89) this._pitch = -89;

        this.cameraFront.x = Math.cos(glm.radians(this._pitch)) * Math.cos(glm.radians(this._yaw));
        this.cameraFront.y = Math.sin(glm.radians(this._pitch));
        this.cameraFront.z = Math.cos(glm.radians(this._pitch)) * Math.sin(glm.radians(this._yaw));
        this.cameraFront = glm.normalize(this.cameraFront);

        super.moveMouse(x, y);
    }

    constructor(cameraPos: glm.vec3 = glm.vec3(0, 0, 200),
        cameraUp: glm.vec3 = glm.vec3(0, 1, 0),
        cameraFront: glm.vec3 = glm.vec3(0, 0, -1),
        cameraSpeed: number = 2,
        mouseSpeed: number = 0.5
    ) {
        super(cameraPos,
            cameraUp,
            cameraFront,
            cameraSpeed,
            mouseSpeed);

        this._pitch = glm.degrees(Math.round(Math.asin(this.cameraFront.y) * ACCURACY_ROUND) / ACCURACY_ROUND);
        this._yaw = glm.degrees(Math.asin(this.cameraFront.z / Math.cos(glm.radians(this._pitch))));
    }

}
