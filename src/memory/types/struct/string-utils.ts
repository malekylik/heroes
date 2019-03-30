import { StructType, getPropertiesDescription } from './struct';
import { FullPropertyDescription, FieldsPadding } from './interfaces';

export function structToString(structType: StructType): string {
    const properties: Array<FullPropertyDescription> = getPropertiesDescription(structType);

    properties.sort((l, r) => l.offset - r.offset);

    const fieldsPadding = getFieldsPadding(properties);

    return getPropertiesHeadString(fieldsPadding) + getPropertieString(properties, fieldsPadding);
}

const PropertyHeader: string = 'Propery';
const TypeHeader: string = 'Type';
const OffsetHeader: string = 'Offset';
const SizeHeader: string = 'Size';

function getFieldsPadding(properties: Array<FullPropertyDescription>): FieldsPadding {
    let nameLength: number = PropertyHeader.length;
    let typeLength: number = TypeHeader.length;
    let offsetLength: number = OffsetHeader.length;
    let sizeLength: number = SizeHeader.length;

    for (let i = 0; i < properties.length; i++) {
        const { name, type, offset, size } = properties[i];
        const typeStr: string = type.toString();

        if (nameLength < name.length) nameLength = name.length;
        if (typeLength < typeStr.length) typeLength = typeStr.length;
        if (offsetLength < offset.toString().length) offsetLength = offset.toString().length;
        if (sizeLength < size.toString().length) sizeLength = size.toString().length;
    }

    return {
        name: nameLength,
        type: typeLength,
        offset: offsetLength,
        size: sizeLength,
    };
}

function getPropertiesHeadString(fieldsPadding: FieldsPadding): string {
    const { 
        name: nameLength,
        type: typeLength,
        offset: offsetLength,
        size: sizeLength,
    } = fieldsPadding;

    return `${PropertyHeader.padStart(nameLength, ' ')} | ${TypeHeader.padStart(typeLength, ' ')} | ${OffsetHeader.padStart(offsetLength, ' ')} | ${SizeHeader.padStart(sizeLength, ' ')}\n`;
}

function getPropertieString(properties: Array<FullPropertyDescription>, fieldsPadding: FieldsPadding): string {
    let str: string = '';
    
    for (let i = 0; i < properties.length; i++) {
        str += getPropertyString(properties[i], fieldsPadding);
     }

    return str;
}

function getPropertyString(property: FullPropertyDescription, fieldsPadding: FieldsPadding): string {
    const { name, type, offset, size } = property;
    const { 
        name: nameLength,
        type: typeLength,
        offset: offsetLength,
        size: sizeLength,
    } = fieldsPadding;

    return (`${name.padStart(nameLength, ' ')} | ${type.toString().padStart(typeLength, ' ')} | ${offset.toString().padStart(offsetLength, ' ')} | ${size.toString().padStart(sizeLength, ' ')}\n`);
}

