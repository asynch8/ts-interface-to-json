"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts_morph_1 = require("ts-morph");
function isNativeType(typeString) {
    return ['number', 'boolean', 'string', 'Date', 'null', 'undefined', 'any'].includes(typeString.replace('[]', ''));
}
// interfaceName is name of the interface file below the root, ./src is considered the root
const Keys = (interfaceName, definitionFile) => {
    console.log('definitionfile', definitionFile);
    const project = new ts_morph_1.Project();
    let sourceFile;
    try {
        sourceFile = project.addSourceFileAtPath(definitionFile !== null && definitionFile !== void 0 ? definitionFile : `../shared/types.d.ts`);
    }
    catch (e) {
        console.log('failed', e);
        sourceFile = project.addSourceFileAtPath(`${definitionFile}.d.ts`);
    }
    const imports = sourceFile.getImportDeclarations();
    const node = sourceFile.getInterface(interfaceName);
    if (!node) {
        console.error(interfaceName, definitionFile);
        throw new Error('NoNode');
    }
    return node.getProperties().map((p) => {
        // Retrieve metadata about the type so we can try to parse this into swagger
        const actualType = p.getFullText();
        const type = p.getType().getText();
        const name = p.getName();
        const optional = p.hasQuestionToken();
        console.log({ actualType, type, name });
        // Handles if there is a 'union-type', i.e string|number
        const formatted = type
            .split('|') // split by the pipe/union operator
            .map(e => e.trim())
            .map((e) => {
            console.log('current type', e);
            let temp = { type: e };
            if (!isNativeType(e)) {
                const propertySplit = e.split('.');
                const [, splitName] = propertySplit;
                if (e.startsWith('import("')) {
                    const importFile = e.split('"')[1];
                    temp = {
                        type: 'object',
                        keys: Keys(splitName.replace('[]', ''), importFile)
                    };
                }
                else {
                    const filtered = imports.filter(i => {
                        const defaultImport = i.getDefaultImport();
                        if (defaultImport) {
                            console.log('DefaultImport');
                            return defaultImport.getText() === propertySplit[0];
                        }
                        const namedImports = i.getNamedImports();
                        if (namedImports.length > 0) {
                            return namedImports.filter(ni => { var _a, _b; return ((_b = (_a = ni.getAliasNode()) === null || _a === void 0 ? void 0 : _a.getText()) !== null && _b !== void 0 ? _b : ni.getNameNode().getText()) === propertySplit[0]; }).length > 0;
                        }
                        return false;
                    });
                    console.log('Do something with imports');
                    console.log(filtered[0], definitionFile, e, interfaceName);
                    temp = {
                        type: 'object',
                        keys: Keys(splitName.replace('[]', ''), filtered[0].getModuleSpecifierSourceFile().getFilePath())
                    };
                }
            }
            console.log('adding', temp);
            if (e.endsWith('[]')) {
                return {
                    type: 'array',
                    items: temp
                };
            }
            return temp;
        });
        if (formatted.length === 0) {
            throw new Error('NoFormatted');
        }
        if (formatted.length > 1) {
            return {
                name,
                type: 'oneOf',
                types: formatted,
                optional
            };
        }
        if (type.endsWith('[]')) {
            return {
                name,
                type: 'array',
                items: formatted[0],
                optional
            };
        }
        return Object.assign({}, formatted[0], { name, optional });
        /* if (match) {
            if (match[2].endsWith('[]')) {
                return {
                    name,
                    type: 'array',
                    items: {
                        type: 'object',
                        keys: Keys(match[2].replace('[]', ''), path.resolve(`${match[1]}.d.ts`))
                    },
                    optional
                }
            }
            return { type: 'object', keys: Keys(match[2].replace('[]', ''), path.resolve(`${match[1]}.d.ts`)), name, optional }
        } */
    });
};
exports.default = Keys;
//# sourceMappingURL=ts-interface.js.map