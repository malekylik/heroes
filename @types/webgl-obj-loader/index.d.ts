declare module 'webgl-obj-loader' {
    export class options {
        enableWTextureCoord: boolean;
        calcTangentsAndBitangents: boolean;
    }

    export class Layout {

    }

    export class Mesh {
        vertices: number[];
        vertexNormals: number[];
        vertexMaterialIndices: number[];
        textures: number[];
        textureStride: number;
        indices: number[];
        materialNames: string[];
        materialIndices: { [propName: string]: number };
        name: string;
        
        /**
         * Create a Mesh
         * @param {String} objectData - a string representation of an OBJ file with
         *     newlines preserved.
         * @param {Object} options - a JS object containing valid options. See class
         *     documentation for options.
         * @param {bool} options.enableWTextureCoord - Texture coordinates can have
         *     an optional "w" coordinate after the u and v coordinates. This extra
         *     value can be used in order to perform fancy transformations on the
         *     textures themselves. Default is to truncate to only the u an v
         *     coordinates. Passing true will provide a default value of 0 in the
         *     event that any or all texture coordinates don't provide a w value.
         *     Always use the textureStride attribute in order to determine the
         *     stride length of the texture coordinates when rendering the element
         *     array.
         * @param {bool} options.calcTangentsAndBitangents - Calculate the tangents
         *     and bitangents when loading of the OBJ is completed. This adds two new
         *     attributes to the Mesh instance: `tangents` and `bitangents`.
         */
        constructor(objectData: string, options?: object);

        /**
         * @param {Layout} layout - A {@link Layout} object that describes the
         * desired memory layout of the generated buffer
         * @return {ArrayBuffer} The packed array in the ... TODO
         */
        makeBufferData(layout: Layout): ArrayBuffer;
    }
}