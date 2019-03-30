import { Type, sizeof } from '../';
import { align } from '../type';
import { StructGetters, StructMeta, StructP, FullPropertyDescription, PropertyDescription, StructDefenition } from './interfaces';

export class StructType extends Type {
    readonly size: number;
    readonly meta: StructMeta;
    readonly get: StructGetters;

    constructor(meta: StructMeta, size: number, getters: StructGetters) {
        super();
        this.size = size;
        this.meta = meta;

        this.get = getters;
    }
}

export function defineStruct(structDifinition: StructDefenition): StructType {
    const keys: string[] = Object.keys(structDifinition);
    const layout: Array<PropertyDescription> = new Array(keys.length);
    let size: number = 0;
    let propertySize: number = 0;
    let property: string;

    for (let i = 0; i < keys.length; i++) {
        property = keys[i];
        propertySize = sizeof(structDifinition[property]);
        size += propertySize;
        layout[i] = { property, size: propertySize };
    }

    layout.sort((l, r) => r.size - l.size);

    const meta: StructMeta = {};
    const getters: StructGetters = {};
    let offset = 0;

    for (let i = 0; i < layout.length; i++) {
        ({ property, size: propertySize } = layout[i]);
        meta[property] = {
            offset,
            type: structDifinition[property],
        };

        getters[property] = (function () {
            const _offset: number = offset;
            return function (struct: StructP): number {
                return struct + _offset;
            };
        })();

        offset += propertySize;
    }
    
    return new StructType(meta, align(size), getters);
}

export function getAddressFromStruct(structType: StructType, struct: StructP, property: string): number {
    return struct + structType.meta[property].offset;
}

export function getPropertyOffsetFromStruct(structType: StructType, property: string): number {
    return structType.meta[property].offset;
}

export function getPropertiesDescription(structType: StructType): Array<FullPropertyDescription> {
    const propertiesName: string[] = Object.keys(structType.meta);
    const properties: Array<FullPropertyDescription> = new Array(propertiesName.length);

    for (let i = 0; i < propertiesName.length; i++) {
        const name: string = propertiesName[i];
        const { offset, type } = structType.meta[name];
        properties[i] = {
            name: name,
            type: type,
            offset: offset,
            size: sizeof(type),
        };
    }

    return properties;
}

