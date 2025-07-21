import keys from './ts-interface'

interface Type {
    name?: string;
    type?: string;
    optional?: boolean;
    keys?: Type[];
    items?: Type;
    required?: string[];
    format?: string;
    nullable?: boolean;
    properties?: { [key: string]: Type };
}

export function convert(typeName: string, path: string): any {
    const types = keys(typeName, path);
    // console.log({ types })
    const schema = {
        type: 'object',
        properties: Object.assign(
            {},
            ...types.map((type: any) => {
                return {
                    [type.name]: typeToObject(type)
                }
            })
        ),
        required: types.filter((e: any) => !e.optional).map((e: any) => e.name)
    };
    //console.log(util.inspect(schema, false, null, true))
    return schema 
}

function typeToObject(type: any): Type {
    // console.log(type)
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
                (typeKey: Type) => ({
                    [typeKey.name as string]: typeToObject(typeKey)
                })
            )),
            required: type.keys.filter((e: any) => !e.optional).map((e: any) => e.name)
        }
    } else if (type.type === 'any') {
        return {}
    } else if (type.type === 'Date') {
        return {
            type: 'string',
            format: 'date-time'
        }
    } else if (type.type === 'oneOf') {
        const nullable = type.types.find((t: any) => { return t.type === 'null' });
        const nonnull = type.types.filter((t: any) => { return t.type !== 'null' });
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
    } else if (type.type === 'boolean') {
        return {
            type: 'boolean'
        }
    } else {
        const error = new Error(`UnimplementedType: ${type.type}`);
        console.error('Error trying to convert type', { type, error })
        throw error;
    }
}
