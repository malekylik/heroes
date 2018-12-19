import * as glm from 'glm-js';

import { Subject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

export abstract class Camera implements Updateable {

    private _cameraPos: glm.vec3;
    private _cameraUp: glm.vec3;
    private _cameraFront: glm.vec3;
    private _view: glm.mat4;
    private _cameraSpeed: number;
    private _mouseSpeed: number;
    private flagUpdater: Subject<boolean> = new Subject();
    protected updateFlag: boolean = false;

    get view(): glm.mat4 {
        return this._view;
    }

    get cameraPos(): glm.vec3 {
        return this._cameraPos;
    }

    get cameraUp(): glm.vec3 {
        return this._cameraUp;
    }

    get cameraFront(): glm.vec3 {
        return this._cameraFront;
    }

    get mouseSpeed(): number {
        return this._mouseSpeed;
    }

    get cameraSpeed(): number {
        return this._cameraSpeed;
    }

    set view(view: glm.mat4) {
        this._view = view;
        this.flagUpdater.next(true);
    }

    set cameraPos(cameraPos: glm.vec3) {
        this._cameraPos = cameraPos;
        this.flagUpdater.next(true);
    }

    set cameraUp(cameraUp: glm.vec3) {
        this._cameraUp = cameraUp;
        this.flagUpdater.next(true);
    }

    set cameraFront(cameraFront: glm.vec3) {
        this._cameraFront = cameraFront;
        this.flagUpdater.next(true);
    }

    set cameraSpeed(cameraSpeed: number) {
        this._cameraSpeed = cameraSpeed;
    }

    set mouseSpeed(mouseSpeed: number) {
        this._mouseSpeed = mouseSpeed;
    }

    moveForward(distance: number = this._cameraSpeed): void {
        this._cameraPos['+='](this._cameraFront['*'](distance));
        this.flagUpdater.next(true);
    }

    moveLeft(distance: number = this._cameraSpeed): void {
        this._cameraPos['-='](glm.normalize(glm.cross(this._cameraFront, this._cameraUp))['*'](distance));
        this.flagUpdater.next(true);
    }

    moveRight(distance: number = this._cameraSpeed): void {
        this._cameraPos['+='](glm.normalize(glm.cross(this._cameraFront, this._cameraUp))['*'](distance));
        this.flagUpdater.next(true);
    }

    moveBack(distance: number = this._cameraSpeed): void {
        this._cameraPos['-='](this._cameraFront['*'](distance));
        this.flagUpdater.next(true);
    }

    moveUp(distance: number = this._cameraSpeed): void {
        this._cameraPos['+='](this.cameraUp['*'](distance));
        this.flagUpdater.next(true);
    }

    moveDown(distance: number = this._cameraSpeed): void {
        this._cameraPos['-='](this.cameraUp['*'](distance));
        this.flagUpdater.next(true);
    }

    moveMouse(x: number, y: number): void {
        this.flagUpdater.next(true);
    }

    protected updateView(): void {
        this._view = glm.lookAt(this._cameraPos, this._cameraPos['+'](this._cameraFront), this._cameraUp);
        this.flagUpdater.next(false);
    }

    abstract updateKeyboard(ev: KeyboardEvent): void;
    abstract updateMouse(ev: MouseEvent): void;
    abstract update(): void;

    constructor(cameraPos: glm.vec3 = glm.vec3(0, 0, 200),
        cameraUp: glm.vec3 = glm.vec3(0, 1, 0),
        cameraFront: glm.vec3 = glm.vec3(0, 0, -3),
        cameraSpeed: number = 2,
        mouseSpeed: number = 5
    ) {
        this._cameraPos = cameraPos;
        this._cameraUp = cameraUp;
        this._cameraFront = cameraFront;
        this._cameraSpeed = cameraSpeed;
        this._mouseSpeed = mouseSpeed;
        this.updateView();

        this.flagUpdater
            .pipe(distinctUntilChanged())
            .subscribe((flag: boolean) => this.updateFlag = flag);
    }

}
