import * as glm from 'glm-js'

import { Camera } from './camera';
import  { Keys } from '../../consts/keys'

export class Camera2D extends Camera {

    private mousePosX: number = window.innerWidth / 2;
    private mousePosY: number = window.innerHeight / 2;
    private marginUp: number = 5;
    private marginBot: number = 5;
    private marginRight: number = 5;
    private marginLeft: number = 5;

    update(): void {
        if (this.mousePosX < this.marginLeft) this.moveLeft(this.mouseSpeed);
        if (this.mousePosX > window.innerWidth - this.marginRight) this.moveRight(this.mouseSpeed);
        if (this.mousePosY < this.marginBot) this.moveUp(this.mouseSpeed);
        if (this.mousePosY > window.innerHeight - this.marginUp) this.moveDown(this.mouseSpeed);
        if (this.updateFlag) this.updateView();
    }

    updateMouse(ev: MouseEvent): void {
        this.moveMouse(ev.clientX, ev.clientY);
    }
    
    updateKeyboard(ev: KeyboardEvent): void {
        switch (ev.keyCode) {
            case Keys.W: this.moveUp(this.cameraSpeed); break;
            case Keys.A: this.moveLeft(this.cameraSpeed); break;
            case Keys.S: this.moveDown(this.cameraSpeed); break;
            case Keys.D: this.moveRight(this.cameraSpeed); break;
        }
    }

    moveMouse(x: number, y: number): void {
        this.mousePosX = x;
        this.mousePosY = y;
        super.moveMouse(x, y);
    }

    constructor() {
        super();
    }

}
