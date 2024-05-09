"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts_morph_1 = require("ts-morph");
function isNativeType(typeString) {
    return ['number', 'boolean', 'string', 'Date', 'null', 'undefined', 'any'].includes(typeString.replace('[]', ''));
}
// interfaceName is name of the interface file below the root, ./src is considered the root
const Keys = (interfaceName, definitionFile) => {
    // console.log('definitionfile', definitionFile)
    const project = new ts_morph_1.Project();
    let sourceFile;
    // Add the file to look into
    try {
        // console.log('trying', definitionFile)
        sourceFile = project.addSourceFileAtPath(definitionFile);
    }
    catch (e) {
        // console.log('failed', e)
        // Maybe should add .d.ts
        sourceFile = project.addSourceFileAtPath(`${definitionFile}.ts`);
    }
    const imports = sourceFile.getImportDeclarations();
    // console.log(sourceFile.getInterfaces().map(i => i.getName())))
    // TODO: Implement a way to get types defined using `type Foo = {}` syntax.
    // Seems this would have to be the way: sourceFile.getTypeAliases().map(i => (i.getStructure().type as string).split('\r\n')
    const node = sourceFile.getInterface(interfaceName); // Get the interface node
    if (!node) {
        console.error('Failed to find the following:', { interfaceName, definitionFile });
        throw new Error('NoNode');
    }
    return node.getProperties().map((p) => {
        // Retrieve metadata about the type so we can try to parse this into swagger
        const actualType = p.getFullText();
        const type = p.getType().getText();
        const name = p.getName();
        const optional = p.hasQuestionToken();
        // console.log({ actualType, type, name })
        const types = type
            .split('|') // split by the union operator
            .map(e => e.trim())
            .map((e) => {
            // console.log('current type', e)
            var _a, _b;
            let temp = { type: e };
            if (!isNativeType(e)) {
                // console.log('not native', e)
                const propertySplit = e.split('.');
                const [, splitName] = propertySplit;
                if (e.startsWith('import("')) {
                    const importFile = e.split('"')[1];
                    // console.log('import', importFile, e, interfaceName, splitName.replace('[]', ''))
                    temp = {
                        type: 'object',
                        keys: Keys(splitName.replace('[]', ''), importFile)
                    };
                }
                else {
                    const filtered = imports.filter(i => {
                        const defaultImport = i.getDefaultImport();
                        if (defaultImport) {
                            return defaultImport.getText() === propertySplit[0];
                        }
                        const namedImports = i.getNamedImports();
                        if (namedImports.length > 0) {
                            return namedImports.filter(ni => {
                                var _a, _b;
                                return ((_b = (_a = ni.getAliasNode()) === null || _a === void 0 ? void 0 : _a.getText()) !== null && _b !== void 0 ? _b : ni.getNameNode().getText()) === propertySplit[0];
                            }).length > 0;
                        }
                        return false;
                    });
                    // console.log('Do something with imports')
                    //console.log(
                    //    filtered[0], definitionFile, e, interfaceName)
                    if (filtered.length !== 0) {
                        temp = {
                            type: 'object',
                            keys: Keys(splitName.replace('[]', ''), (_b = (_a = filtered[0].getModuleSpecifierSourceFile()) === null || _a === void 0 ? void 0 : _a.getFilePath().toString()) !== null && _b !== void 0 ? _b : '')
                        };
                    }
                }
            }
            /*if (e.endsWith('[]')) {
                temp.type = temp.type.replace(/\[\]$/, '');
                console.log('adding', {
                    type: 'array',
                    items: temp
                }, e)
                return {
                    type: 'array',
                    items: temp
                }
            }*/
            return temp;
        });
        if (types.length === 0) {
            throw new Error('NoTypes');
        }
        if (types.length > 1) {
            return {
                name,
                type: 'oneOf',
                types,
                optional
            };
        }
        if (type.endsWith('[]')) {
            types[0].type = types[0].type.replace(/\[\]$/, '');
            return {
                name,
                type: 'array',
                items: types[0],
                optional
            };
        }
        return Object.assign({}, types[0], { name, optional });
    });
};
exports.default = Keys;
//# sourceMappingURL=ts-interface.js.map