import Treesitter from "tree-sitter";
import Go from "tree-sitter-go";

export function parseCode(src: string, fileName: string): ParseResults {
    const parser = new Treesitter()
    parser.setLanguage(Go as any)
    const tree = parser.parse(src)
    const types = {} as Record<string, GoType>
    const functions = []
    for (const node of tree.rootNode.namedChildren) {
        if (node.type === "type_declaration") {
            const typeSpec = node.child(1)!
            const typeName = typeSpec.child(0)!.text
            const typeValue = typeSpec.child(1)!
            types[typeName] = parseGoType(typeValue, fileName)
        } else if (node.type === "function_declaration") {
            functions.push(getFunctionDetails(node, fileName))
        }
    }
    return {
        types,
        functions
    }
}

export interface ParseResults {
    types: Record<string, GoType>
    functions: FunctionDetails[]
}

export interface FunctionDetails {
    name: string
    arguments: FunctionArgument[]
    returnType: GoType
}

export interface FunctionArgument {
    name: string
    type: GoType
}

export type GoType = {
    kind: "string"
} | {
    kind: "boolean"
} | {
    kind: "number",
    variant: "int" | "int8" | "int16" | "int32" | "int64" | "uint" | "uint8" | "uint16" | "uint32" | "uint64" | "float32" | "float64"
} | {
    kind: "ref",
    typeName: string
} | {
    kind: "array",
    elementType: GoType
} | {
    kind: "map",
    keyType: GoType,
    valueType: GoType
} | {
    kind: "struct",
    fields: { name: string, type: GoType }[]
} | {
    kind: "pointer",
    value: GoType
} | {
    kind: "special",
    name: "context" | "session"
}

function getFunctionDetails(node: Treesitter.SyntaxNode, fileName: string): FunctionDetails {
    if (node.type !== "function_declaration") {
        throw new Error(`Node is not a function declaration: ${node.type}`)
    }
    const nameNode = node.child(1)!
    const parametersNode = node.child(2)!
    const returnTypeNode = node.child(3)!

    const args: FunctionArgument[] = []
    for (const paramNode of parametersNode.namedChildren) {
        const paramNameNode = paramNode.child(0)!
        const paramTypeNode = paramNode.child(1)!
        args.push({
            name: paramNameNode.text,
            type: parseGoType(paramTypeNode, fileName)
        })
    }

    const returnType = parseGoType(returnTypeNode, fileName)

    return {
        name: nameNode.text,
        arguments: args,
        returnType
    }
}

function parseGoType(node: Treesitter.SyntaxNode, fileName: string): GoType {
    if (node.type === "type_identifier") {
        switch (node.text) {
            case "string":
                return {
                    kind: "string"
                }
            case "bool":
                return {
                    kind: "boolean"
                }
            case "int":
            case "int8":
            case "int16":
            case "int32":
            case "int64":
            case "uint":
            case "uint8":
            case "uint16":
            case "uint32":
            case "uint64":
            case "float32":
            case "float64":
                return {
                    kind: "number",
                    variant: node.text
                }
            default:
                return {
                    kind: "ref",
                    typeName: node.text
                }
        }
    } else if (node.type === "slice_type") {
        const elementTypeNode = node.child(1)!
        return {
            kind: "array",
            elementType: parseGoType(elementTypeNode, fileName)
        }
    } else if (node.type === "map_type") {
        const keyTypeNode = node.child(1)!
        const valueTypeNode = node.child(3)!
        return {
            kind: "map",
            keyType: parseGoType(keyTypeNode, fileName),
            valueType: parseGoType(valueTypeNode, fileName)
        }
    } else if (node.type === "struct_type") {
        const fields: { name: string, type: GoType }[] = []
        const fieldListNode = node.child(1)!
        for (const fieldNode of fieldListNode.namedChildren) {
            const fieldNameNode = fieldNode.child(0)!
            const fieldTypeNode = fieldNode.child(1)!
            fields.push({
                name: fieldNameNode.text,
                type: parseGoType(fieldTypeNode, fileName)
            })
        }
        return {
            kind: "struct",
            fields
        }
    } else if (node.type === "pointer_type") {
        if (node.text === "*Context") {
            return {
                kind: "special",
                name: "context"
            }
        } else if (node.text === "*Session") {
            return {
                kind: "special",
                name: "session"
            }
        } else {
            const pointee = node.children[1]
            return {
                kind: "pointer",
                value: parseGoType(pointee, fileName)
            }
        }
    }
    throw new Error(
        `Unsupported Go type in ${fileName}:${node.startPosition.row}:${node.startPosition.column}: ${node.type} "${node.text}"`
    )
}
