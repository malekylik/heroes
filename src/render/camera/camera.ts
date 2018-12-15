import * as glm from 'glm-js'

export class Camera {

    private _cameraPos: glm.vec3 = glm.vec3(0, 0, 200);
    private _cameraUp: glm.vec3 = glm.vec3(0, 1, 0);
    private _cameraFront: glm.vec3 = glm.vec3(0, 0, -3);
    private _cameraSpeed: number = 10;
    private _sensetivity: number = 0.5;
    private _view: glm.mat4;
    private _pitch: number = 0;
    private _yaw: number = 0;
    private _mousePosX: number = 0;
    private _mousePosY: number = 0;

    get view(): glm.mat4 {
        return this._view;
    }

    get pitch(): number {
        return this._pitch;
    }

    get yaw(): number {
        return this._yaw;
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

    get sensetivity(): number {
        return this._sensetivity;
    }

    get cameraSpeed(): number {
        return this._cameraSpeed;
    }

    get mousePosX(): number {
        return this.mousePosX;
    }
    
    get mousePosY(): number {
        return this.mousePosY;
    }

    set view(view: glm.mat4) {
        this._view = view;
    }

    set cameraPos(cameraPos: glm.vec3) {
        this._cameraPos = cameraPos;
    }

    set cameraUp(cameraUp: glm.vec3) {
        this._cameraUp = cameraUp;
    }

    set cameraFront(cameraFront: glm.vec3) {
        this._cameraFront = cameraFront;
    }

    set cameraSpeed(cameraSpeed: number) {
        this._cameraSpeed = cameraSpeed;
    }

    set sensetivity(sensetivity: number) {
        this._sensetivity = sensetivity;
    }

    set pitch(pitch: number) {
        this._pitch = pitch;
    }

    set yaw(yaw: number) {
        this._yaw = yaw;
    }

    set mousePosX(posX: number) {
        this._mousePosX = posX;
    }
    
    set mousePosY(posY: number) {
        this._mousePosY = posY;
    }

    updateView(): void {
        this._view = glm.lookAt(this._cameraPos, this._cameraPos['+'](this._cameraFront), this._cameraUp);
    }

    moveForward(): void {
        this._cameraPos['+='](this._cameraFront['*'](this._cameraSpeed));
    }

    moveLeft(): void {
        this._cameraPos['-='](glm.normalize(glm.cross(this._cameraFront, this._cameraUp))['*'](this._cameraSpeed));
    }

    moveRight(): void {
        this._cameraPos['+='](glm.normalize(glm.cross(this._cameraFront, this._cameraUp))['*'](this._cameraSpeed));
    }

    moveBack(): void {
        this._cameraPos['-='](this._cameraFront['*'](this._cameraSpeed));
    }

    moveMouse(x: number, y: number): void {
        const xOffset: number = (x - this._mousePosX) * this._sensetivity;
        const yOffset: number = (y - this._mousePosY) * this._sensetivity;

        this._mousePosX = x;
        this._mousePosY = y;

        this._yaw += xOffset;
        this._pitch -= yOffset;

        if (this._pitch > 89) this._pitch = 89;
        if (this._pitch < -89) this._pitch = -89;

        this._cameraFront.x = Math.cos(glm.radians(this._pitch)) * Math.cos(glm.radians(this._yaw))
        this._cameraFront.y = Math.sin(glm.radians(this._pitch));
        this._cameraFront.z = Math.cos(glm.radians(this._pitch)) * Math.sin(glm.radians(this._yaw))
        this._cameraFront = glm.normalize(this._cameraFront);

        this.updateView();
    }

    constructor(cameraPos: glm.vec3 = glm.vec3(0, 0, 200),
        cameraUp: glm.vec3 = glm.vec3(0, 1, 0),
        cameraFront: glm.vec3 = glm.vec3(0, 0, -3),
        cameraSpeed: number = 10,
        sensetivity: number = 0.5
    ) {
        this._cameraPos = cameraPos;
        this._cameraUp = cameraUp;
        this._cameraFront = cameraFront;
        this._cameraSpeed = cameraSpeed;
        this._sensetivity = sensetivity;
        this.updateView();
    }

}
