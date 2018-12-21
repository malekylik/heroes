import { Keys } from '../consts/keys';

export class StateKeys {
    keyW: boolean = false;
    keyA: boolean = false;
    keyS: boolean = false;
    keyD: boolean = false;

    setKey(keyCode: number, state: boolean): void {
        switch (keyCode) {
            case Keys.W: this.keyW = state; break;
            case Keys.A: this.keyA = state; break;
            case Keys.S: this.keyS = state; break;
            case Keys.D: this.keyD = state; break;
        }
    }
}