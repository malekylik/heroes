declare module 'glm-js' {

    export type mat4 = {
        0: vec4;
        1: vec4;
        2: vec4;
        3: vec4;
        address: string;
        array: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
        base64: string;
        buffer: ArrayBuffer;
        elements: Float32Array;
        glsl: string;
        json: string;
        object: {
            0: { x: number, y: number, z: number, w: number };
            1: { x: number, y: number, z: number, w: number };
            2: { x: number, y: number, z: number, w: number };
            3: { x: number, y: number, z: number, w: number };
        }

        byteLength: number;
        components: number;

        '*': (vec: vec4 | mat4) => mat4;
        '*=': (vec: mat4) => mat4;
        '=': (vec: mat4 |
                [number, number, number, number] |
                [number, number, number, number, number, number, number, number, number] |
                [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number]
            ) => mat4;
        '==': (vec: mat4) => boolean;
        '~=': (vec: mat4) => boolean;
        copy: (vec: mat4 | 
                    [number, number, number, number] |
                    [number, number, number, number, number, number, number, number, number] |
                    [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number]
                ) => mat4;
        eql: (vec: mat4) => boolean;
        eql_epsilon: (vec: mat4) => boolean;
        mul: (vec: vec4 | mat4) => mat4;
        mul_eq: (vec: mat4) => mat4;
        
    }

    export type vec2 = {};
    export type vec3 = {
        x: number;
        y: number;
        z: number;
        0: number;
        1: number;
        2: number;
        address: string;
        array: number[];
        b: number;
        base64: string;
        buffer: ArrayBuffer;
        elements: Float32Array;
        g: number;
        glsl: string;
        json: string;
        object: { x: number, y: number, z: number };
        r: number;
        rg: vec2;
        rgb: vec3;
        xy: vec2;
        xyz: vec3;
        xz: vec2;
        xzy: vec3;
        yx: vec2;
        yz: vec2;
        zx: vec2;

        byteLength: number;
        components: number;

        '*': (vec: number | vec3 | quat) => vec3;
        '*=': (vec: number) => vec3;
        '+': (vec: number | vec3) => vec3;
        '+=': (vec: vec3) => vec3;
        '-': (vec: vec3) => vec3;
        '-=': (vec: vec3) => vec3;
        '/': (vec: number) => vec3;
        '/=': (vec: number) => vec3;
        '=': (vec: vec3 | [number, number, number]) => vec3;
        '==': (vec: vec3) => boolean;
        '~=': (vec: vec3) => boolean;
        add: (vec: number | vec3) => vec3;
        add_eq: (vec: vec3) => vec3;
        copy: (vec: vec3 | [number, number, number]) => vec3;
        div: (vec: number) => vec3;
        div_eq: (vec: number) => vec3;
        eql: (vec: vec3) => boolean;
        eql_epsilon: (vec: vec3) => boolean;
        mul: (vec: number | vec3 | quat) => vec3;
        mul_eq: (vec: number) => vec3;
        sub: (vec: vec3) => vec3;
        sub_eq: (vec: vec3) => vec3;
    };
    export type vec4 = {
        w: number;
        x: number;
        y: number;
        z: number;
        0: number;
        1: number;
        2: number;
        3: number;
        a: number;
        address: string;
        array: number[];
        b: number;
        base64: string;
        buffer: ArrayBuffer;
        elements: Float32Array;
        g: number;
        glsl: string;
        json: string;
        object: { x: number, y: number, z: number, w: number };
        r: number;
        rg: vec2;
        rgb: vec3;
        rgba: vec4;
        wxyz: vec4;
        wxz: vec3;
        wz: vec2;
        xw: vec2;
        xy: vec2;
        xyw: vec3;
        xyz: vec3;
        xyzw: vec4;
        xz: vec2;
        xzw: vec3;
        xzy: vec3;
        yx: vec2;
        yz: vec2;
        yzw: vec3;
        zw: vec2;
        zx: vec2;

        byteLength: number;
        components: number;

        '*': (vec: number | vec4 | quat | mat4) => vec4;
        '*=': (vec: number) => vec4;
        '+': (vec: number | vec4) => vec4;
        '+=': (vec: vec4) => vec4;
        '-': (vec: vec4) => vec4;
        '-=': (vec: vec4) => vec4;
        '/': (vec: number) => vec4;
        '/=': (vec: number) => vec4;
        '=': (vec: vec4 | [number, number, number, number]) => vec4;
        '==': (vec: vec4) => boolean;
        '~=': (vec: vec4) => boolean;
        add: (vec: number | vec4) => vec4;
        add_eq: (vec: vec4) => vec4;
        copy: (vec: vec4 | [number, number, number, number]) => vec4;
        div: (vec: number) => vec4;
        div_eq: (vec: number) => vec4;
        eql: (vec: vec4) => boolean;
        eql_epsilon: (vec: vec4) => boolean;
        mul: (vec: number | vec4 | quat) => vec4;
        mul_eq: (vec: number) => vec4;
        sub: (vec: vec4) => vec4;
        sub_eq: (vec: vec4) => vec4;
    };

    export function vec3(x: number, y: number, z: number): vec3;
    export function vec4(x: number, y: number, z: number, a: number): vec4;
    export type quat = {};

    /**
     * Generates a perspective projection matrix with the given bounds
     *
     * @param {number} fovy Vertical field of view in radians
     * @param {number} aspect Aspect ratio. typically viewport width/height
     * @param {number} near Near bound of the frustum
     * @param {number} far Far bound of the frustum
     * @returns {mat4} out
     */
    export function perspective(fovy: number, aspect: number, near: number, far: number): mat4;

    /**
     * Converts degrees to radians
     *
     * @param {number} angle degrees
     * @returns {number} radians
     */
    export function radians(angle: number): number;

    export function translate(vec: vec3): mat4;

    export function angleAxis(angle: number, vec: vec3): quat;

    export function toMat4(q: quat): mat4;

}
