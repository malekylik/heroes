import * as glm from 'glm-js';

import { Camera } from './camera';
import { StateKeys } from '../../classes/StateKeys';

export class Camera2D extends Camera {

    private mousePosX: number = window.innerWidth / 2;
    private mousePosY: number = window.innerHeight / 2;
    private marginUp: number = 5;
    private marginBot: number = 5;
    private marginRight: number = 5;
    private marginLeft: number = 5;
    private StateKey: StateKeys = new StateKeys();

    update(): void {
        if (this.mousePosX < this.marginLeft) this.moveLeft(this.mouseSpeed);
        if (this.mousePosX > window.innerWidth - this.marginRight) this.moveRight(this.mouseSpeed);
        if (this.mousePosY < this.marginBot) this.moveUp(this.mouseSpeed);
        if (this.mousePosY > window.innerHeight - this.marginUp) this.moveDown(this.mouseSpeed);

        if (this.StateKey.keyW) this.moveUp(this.cameraSpeed);
        if (this.StateKey.keyA) this.moveLeft(this.cameraSpeed);
        if (this.StateKey.keyS) this.moveDown(this.cameraSpeed);
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
        if (this.StateKey.focus) {
            this.mousePosX = x;
            this.mousePosY = y;
            super.moveMouse(x, y);
        }
    }

    constructor() {
        super(glm.vec3(0, 0, 200),
            glm.vec3(0, 1, 0),
            glm.vec3(0, 0, -3),
            2,
            10);

        document.getElementById('mainCanvas').onfocus = () => { this.StateKey.setFocus(true); }
        document.getElementById('mainCanvas').onblur = () => { this.StateKey.setFocus(false); }
    }

}
