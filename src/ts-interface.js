"use strict";
exports.__esModule = true;
var ts_morph_1 = require("ts-morph");
var path = require("path");
function isNativeType(typeString) {
    return ['number', 'boolean', 'string', 'Date', 'null', 'undefined', 'any'].includes(typeString.replace('[]', ''));
}
// interfaceName is name of the interface file below the root, ./src is considered the root
var Keys = function (interfaceName, definitionFile) {
    console.log(definitionFile);
    var project = new ts_morph_1.Project();
    var sourceFile = project.addSourceFileAtPath(definitionFile !== null && definitionFile !== void 0 ? definitionFile : "../shared/types.d.ts");
    var imports = [];
    try {
        console.log('import declarations', sourceFile.getImportDeclarations());
    }
    catch (e) {
        console.log('failed to get importdeclarations');
    }
    var node = sourceFile.getInterface(interfaceName);
    if (!node) {
        console.error(interfaceName, definitionFile);
        throw new Error('NoNode');
    }
    return node.getProperties().map(function (p) {
        // Retrieve metadata about the type so we can try to parse this into swagger
        var actualType = p.getFullText();
        var type = p.getType().getText();
        var name = p.getName();
        var optional = p.hasQuestionToken();
        // Handles if there is a 'union-type', i.e string|number
        var split = actualType
            .split(':')[1] // Remove the property name
            .split('|') // split by the pipe/union operator
            .map(function (e) { return e.trim().replace(';', ''); })
            .map(function (e) {
            var temp = null;
            if (!isNativeType(e)) {
                if (imports.length == 0) {
                    temp = {
                        type: 'object',
                        keys: Keys(e.replace('[]', ''), definitionFile)
                    };
                }
                else {
                    console.log('Do something with imports');
                    console.log(imports, definitionFile, interfaceName);
                }
            }
            else {
                temp = { type: e };
            }
            if (e.endsWith('[]')) {
                return {
                    type: 'array',
                    items: temp
                };
            }
            return temp;
        });
        if (split.length > 1) {
            return {
                name: name,
                type: 'oneOf',
                types: split,
                optional: optional
            };
        }
        var match = type.match(/^import\("(.+?)"\)\.(.+)/);
        if (match) {
            if (match[2].endsWith('[]')) {
                return {
                    name: name,
                    type: 'array',
                    items: {
                        type: 'object',
                        keys: Keys(match[2].replace('[]', ''), path.resolve(match[1] + ".d.ts"))
                    },
                    optional: optional
                };
            }
            return { type: 'object', keys: Keys(match[2].replace('[]', ''), path.resolve(match[1] + ".d.ts")), name: name, optional: optional };
        }
        if (type.endsWith('[]')) {
            return {
                name: name,
                type: 'array',
                items: {
                    type: type.replace('[]', '')
                },
                optional: optional
            };
        }
        return { type: type, name: p.getName() };
    });
};
exports["default"] = Keys;
