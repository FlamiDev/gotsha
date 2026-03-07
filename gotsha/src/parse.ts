import Treesitter from "tree-sitter";
import Go from "tree-sitter-go";

export function parseCode(src: string): ParseResults {
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
            types[typeName] = parseGoType(typeValue)
        } else if (node.type === "function_declaration") {
            functions.push(getFunctionDetails(node))
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

export type GoType = "string" | "boolean" | {
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
}

function getFunctionDetails(node: Treesitter.SyntaxNode): FunctionDetails {
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
            type: parseGoType(paramTypeNode)
        })
    }

    const returnType = parseGoType(returnTypeNode)

    return {
        name: nameNode.text,
        arguments: args,
        returnType
    }
}

function parseGoType(node: Treesitter.SyntaxNode): GoType {
    if (node.type === "type_identifier") {
        switch (node.text) {
            case "string":
                return "string"
            case "bool":
                return "boolean"
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
            elementType: parseGoType(elementTypeNode)
        }
    } else if (node.type === "map_type") {
        const keyTypeNode = node.child(1)!
        const valueTypeNode = node.child(3)!
        return {
            kind: "map",
            keyType: parseGoType(keyTypeNode),
            valueType: parseGoType(valueTypeNode)
        }
    } else if (node.type === "struct_type") {
        const fields: { name: string, type: GoType }[] = []
        const fieldListNode = node.child(1)!
        for (const fieldNode of fieldListNode.namedChildren) {
            const fieldNameNode = fieldNode.child(0)!
            const fieldTypeNode = fieldNode.child(1)!
            fields.push({
                name: fieldNameNode.text,
                type: parseGoType(fieldTypeNode)
            })
        }
        return {
            kind: "struct",
            fields
        }
    }
    throw new Error(`Unsupported Go type: ${node.type}`)
}
