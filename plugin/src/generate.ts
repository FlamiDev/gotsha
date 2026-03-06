import {GoType, ParseResults} from "./parse";

export function generateCode({functions}: ParseResults, path: string): string {
    const safePath = path.replaceAll(/[^a-zA-Z0-9]/g, "_")
    let result = ""
    for (const func of functions) {
        const apiPath = `/api/${safePath}/${func.name}`
        const args = func.arguments.map(a => a.name).join(", ")
        const body = `return fetch("${apiPath}", { method: "POST", body: JSON.stringify({${args}}) }).then(res => res.json())`
        result += `export function ${func.name}(${args}) {\n\t${body}\n}\n\n`
    }
    return result
}

export function generateTypeDef({types, functions}: ParseResults, path: string): string {
    let result = `declare module "${path}" {\n`
    for (const [typeName, typeDef] of Object.entries(types)) {
        result += `\texport type ${typeName} = ${goTypeToTs(typeDef)}\n`
    }
    for (const func of functions) {
        const args = func.arguments.map(arg => `${arg.name}: ${goTypeToTs(arg.type)}`).join(", ")
        result += `\texport function ${func.name}(${args}): Promise<${goTypeToTs(func.returnType)}>\n`
    }
    result += `}\n`
    return result
}

function goTypeToTs(goType: GoType): string {
    if (goType === "string") {
        return "string"
    } else if (goType === "number") {
        return "number"
    } else if (goType === "boolean") {
        return "boolean"
    } else if (goType.kind === "ref") {
        return goType.typeName
    } else if (goType.kind === "array") {
        return `${goTypeToTs(goType.elementType)}[]`
    } else if (goType.kind === "map") {
        return `{ [key: ${goTypeToTs(goType.keyType)}]: ${goTypeToTs(goType.valueType)} }`
    } else if (goType.kind === "struct") {
        const fields = goType.fields.map(field => `${field.name}: ${goTypeToTs(field.type)}`).join("; ")
        return `{ ${fields} }`
    } else {
        throw new Error(`Unsupported Go type: ${JSON.stringify(goType)}`)
    }
}
