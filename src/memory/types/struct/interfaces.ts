import { Type, Pointer } from '..';

export type StructP = Pointer;

export interface StructDefenition {
    [key: string]: Type;
}

export interface FullPropertyDescription {
    name: string;
    type: Type;
    offset: number;
    size: number;
}

export interface StructMeta {
    [key: string]: {
        offset: number;
        type: Type;
    }
}

export interface StructGetters {
    [key: string]: (struct: StructP) => number;
}

export interface PropertyDescription { 
    property: string; 
    size: number;
    offset: number;
}

export interface FieldsPadding {
    name: number;
    type: number;
    offset: number;
    size: number;
}
