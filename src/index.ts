const util = require('util')
import { type } from 'os';
import keys from './ts-interface'
export default function convert(typeName: string, path: string = null, requiredFrom: string): any {
    const types = keys(typeName, path)
    const schema = {
        type: 'object',
        properties: Object.assign(
            {},
            ...types.map((type) => {
                return {
                    [type.name]: typeToObject(type)
                }
            })
        ),
        required: types.filter(e => !e.optional).map(e => e.name)
    };
    //console.log(util.inspect(schema, false, null, true))
    return schema 
}

function typeToObject(type) {
    console.log(type)
    if (type.type.endsWith('[]')) {
        return {
            type: 'array',
            items: typeToObject({
                type: type.type.slice(0, type.type.length-2)
            })
        }
    } else if (type.type === 'string') {
        return {
            type: 'string'
        }
    } else if (type.type === 'number') {
        return {
            type: 'number'
        }
    } else if (type.type === 'array') {
        return {
            type: 'array',
            items: typeToObject(type.items)
        }
    } else if (type.type === 'object') {
        return {
            type: 'object',
            properties: Object.assign({}, ...type.keys.map(
                typeKey => ({
                    [typeKey.name]: typeToObject(typeKey)
                })
            )),
            required: type.keys.filter(e => !e.optional).map(e => e.name)
        }
    } else if (type.type === 'any') {
        return {}
    } else if (type.type === 'Date') {
        return {
            type: 'string',
            format: 'date-time'
        }
    } else if (type.type === 'oneOf') {
        const nullable = type.types.find((t) => { return t.type === 'null' });
        const nonnull = type.types.filter((t) => { return t.type !== 'null' });
        return Object.assign(
            {},
            (
            nonnull.length > 1 
                ? { oneOf: nonnull.map(typeToObject) }
                : typeToObject(nonnull[0])
            ),
            (
                nullable ? { nullable: true} : {}
            )
        );
    } else {
        console.log(type.type)
        throw new Error('UnimplementedType')
    }
}
