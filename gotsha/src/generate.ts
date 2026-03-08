import {GoType, ParseResults} from "./parse";
import {getApiUrl} from "./getApiUrl";

export function generateCode({functions}: ParseResults, path: string): string {
    let result = ""
    for (const func of functions) {
        const apiPath = getApiUrl(path, func.name)
        const args = func.arguments
            .filter(a => a.type.kind != "special")
            .map(a => a.name)
            .join(", ")
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
        const args = func.arguments
            .filter(a => a.type.kind != "special")
            .map(arg => `${arg.name}: ${goTypeToTs(arg.type)}`)
            .join(", ")
        result += `\texport function ${func.name}(${args}): Promise<${goTypeToTs(func.returnType)}>\n`
    }
    result += `}\n`
    return result
}

function isUpper(str: string): boolean {
    return str === str.toUpperCase()
}

function goTypeToTs(goType: GoType): string {
    switch (goType.kind) {
        case "string":
            return "string"
        case "boolean":
            return "boolean"
        case "number":
            return "number"
        case "ref":
            return goType.typeName
        case "array":
            return `${goTypeToTs(goType.elementType)}[]`
        case "map":
            return `{ [key: ${goTypeToTs(goType.keyType)}]: ${goTypeToTs(goType.valueType)} }`
        case "struct":
            const fields = goType.fields.filter(field => isUpper(field.name[0])).map(field => `${field.name}: ${goTypeToTs(field.type)}`).join("; ")
            return `{ ${fields} }`
        case "special":
            return "any"
    }
}
