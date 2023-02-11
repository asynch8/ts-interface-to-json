import {
    Project,
    VariableDeclarationKind,
    InterfaceDeclaration,
    SyntaxKind,
    SourceFile
} from "ts-morph";
import * as path from 'path'


function isNativeType(typeString: string) {
    return ['number', 'boolean', 'string', 'Date', 'null', 'undefined', 'any'].includes(typeString.replace('[]', ''))
}


// interfaceName is name of the interface file below the root, ./src is considered the root
const Keys = (interfaceName: string, definitionFile?: string): any => {
    console.log('definitionfile', definitionFile)
    const project = new Project();
    let sourceFile: SourceFile
    try {
        sourceFile = project.addSourceFileAtPath(definitionFile ?? `../shared/types.d.ts`);
    } catch (e) {
        console.log('failed', e)
        sourceFile = project.addSourceFileAtPath(`${definitionFile}.d.ts`);
    }
    
    const imports = sourceFile.getImportDeclarations();
    const node = sourceFile.getInterface(interfaceName)!;
    
    if (!node) {
        console.error(interfaceName, definitionFile)
        throw new Error('NoNode')
    }

    return node.getProperties().map((p) => {
        // Retrieve metadata about the type so we can try to parse this into swagger
        const actualType = p.getFullText();
        const type = p.getType().getText();
        const name = p.getName();
        const optional = p.hasQuestionToken();
        console.log({ actualType, type, name })
        const types = type
          .split('|')  // split by the pipe/union operator
          .map(e => e.trim())
          .map((e) => {
            console.log('current type', e)
           
            let temp: {[x: string]: any } = { type: e };
            if (!isNativeType(e)) {
                const propertySplit = e.split('.')
                const [,splitName] = propertySplit;
                if (e.startsWith('import("')) {
                    const importFile = e.split('"')[1]
                    temp = {
                        type: 'object',
                        keys: Keys(splitName.replace('[]', ''), importFile)
                    }
                } else {
                    const filtered = imports.filter(
                        i => {
                            const defaultImport = i.getDefaultImport();
                            if (defaultImport) {
                                return defaultImport.getText() === propertySplit[0];
                            }
                            const namedImports = i.getNamedImports()
                            if(namedImports.length > 0) {
                                return namedImports.filter(
                                    ni => (
                                            ni.getAliasNode()?.getText() ?? 
                                            ni.getNameNode().getText()
                                        ) === propertySplit[0]
                                ).length > 0
                            }
                            return false;
                            
                        }
                    );
                    console.log('Do something with imports')
                    console.log(
                        filtered[0], definitionFile, e, interfaceName)
                    temp = {
                        type: 'object',
                        keys: Keys(
                            splitName.replace('[]', ''),
                            filtered[0].getModuleSpecifierSourceFile().getFilePath()
                        )
                    }
                }
            } 
            console.log('adding', temp)
            if (e.endsWith('[]')) {
                return {
                    type: 'array',
                    items: temp
                }
            }
            
            return temp
          })
        if (types.length === 0) {
            throw new Error('NoTypes')
        }
        if (types.length > 1) {
            return {
                name,
                type: 'oneOf',
                types,
                optional
            }
        }

        if (type.endsWith('[]')) {
            return {
                name,
                type: 'array',
                items: types[0],
                optional
            }
        }

        return Object.assign({}, types[0], { name, optional})
    });
};



export default Keys;