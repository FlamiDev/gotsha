import {GoType, ParseResults} from "./parse";
import {getApiUrl} from "./getApiUrl";

const template = (body: string, devMode: boolean) => `package main

import (
${devMode ? "" : `	"embed"`}
	"encoding/json"
	"gotsha/api"
	"net/http"
)

${devMode ? "" : `//go:embed dist/*
var staticFiles embed.FS`}

func setupServer(ctx *Context, addr string) error {
	${body}
	${devMode ? "" : `http.Handle("/", http.FileServer(http.FS(staticFiles)))`}
	return http.ListenAndServe(addr, nil)
}
`

const handlerTemplate = (endpoint: string, contents: string) => `
    http.HandleFunc("${endpoint}", func(w http.ResponseWriter, r *http.Request) {
		err := r.ParseForm()
		if err != nil {
			http.Error(w, "Failed to parse form", http.StatusBadRequest)
			return
		}
		${contents}
		err = json.NewEncoder(w).Encode(data)
		if err != nil {
			http.Error(w, "Failed to encode response", http.StatusInternalServerError)
			return
		}
	})
`

function writeGoType(type: GoType): string {
    if (type === "string") {
        return "string"
    } else if (type === "boolean") {
        return "bool"
    } else if (type.kind === "number") {
        return type.variant
    } else if (type.kind === "ref") {
        return type.typeName
    } else if (type.kind === "array") {
        return `[]${writeGoType(type.elementType)}`
    } else if (type.kind === "map") {
        return `map[${writeGoType(type.keyType)}]${writeGoType(type.valueType)}`
    } else if (type.kind === "struct") {
        const fields = type.fields.map(
            field => `${capitalize(field.name)} ${writeGoType(field.type)} \`json:"${field.name}"\``
        ).join("; ")
        return `struct { ${fields} }`
    } else {
        throw new Error(`Unsupported Go type: ${JSON.stringify(type)}`)
    }
}

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)

export function generateGo(parseResults: Map<string, ParseResults>, devMode: boolean = false): string {
    let body = "";
    for (const [file, results] of parseResults.entries()) {
        for (const func of results.functions) {
            const url = getApiUrl(file, func.name)
            const argsList = func.arguments
            let hasCtx = false
            if (argsList.at(-1)?.name === "ctx") {
                argsList.pop()
                hasCtx = true
            }
            let contents = "var input struct {\n"
            for (const arg of argsList) {
                contents += `\t\t\t${capitalize(arg.name)} ${writeGoType(arg.type)} \`json:"${arg.name}"\`\n`
            }
            contents += "\t\t}"
            contents += `
		err = json.NewDecoder(r.Body).Decode(&input)
		if err != nil {
			http.Error(w, "Failed to decode request body", http.StatusBadRequest)
			return
		}\n`
            let args = argsList.map(arg => `input.${capitalize(arg.name)}`).join(", ")
            if (hasCtx) {
                args += ", ctx"
            }
            contents += `\t\tdata := api.${func.name}(${args})`
            body += handlerTemplate(url, contents)
        }
    }
    return template(body, devMode)
}
