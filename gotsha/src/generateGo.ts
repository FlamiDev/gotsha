import {GoType, ParseResults} from "./parse";
import {getApiUrl} from "./getApiUrl";

const template = (packageName: string, body: string, devMode: boolean) => `package main

import (
${devMode ? "" : `	"embed"`}
	"encoding/json"
	"${packageName}/api"
	"net/http"
)

${devMode ? "" : `//go:embed dist/*
var staticFiles embed.FS`}

func setupServer(ctx *api.Context, addr string) error {
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
    switch (type.kind) {
        case "string":
            return "string"
        case "boolean":
            return "bool"
        case "number":
            return type.variant
        case "ref":
            return type.typeName
        case "array":
            return `[]${writeGoType(type.elementType)}`
        case "map":
            return `map[${writeGoType(type.keyType)}]${writeGoType(type.valueType)}`
        case "struct":
            const fields = type.fields.map(
                field => `${capitalize(field.name)} ${writeGoType(field.type)} \`json:"${field.name}"\``
            ).join("; ")
            return `struct { ${fields} }`
        case "special":
            switch (type.name) {
                case "context":
                    return "*api.Context"
                case "session":
                    return "*api.Session"
            }
    }
}

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)

export function generateGo(packageName: string, parseResults: Map<string, ParseResults>, devMode: boolean = false): string {
    let body = "";
    for (const [file, results] of parseResults.entries()) {
        for (const func of results.functions) {
            const url = getApiUrl(file, func.name)
            let contents = "var input struct {\n"
            for (const arg of func.arguments) {
                if (arg.type.kind === "special") continue
                contents += `\t\t\t${capitalize(arg.name)} ${writeGoType(arg.type)} \`json:"${arg.name}"\`\n`
            }
            contents += "\t\t}"
            contents += `
		err = json.NewDecoder(r.Body).Decode(&input)
		if err != nil {
			http.Error(w, "Failed to decode request body", http.StatusBadRequest)
			return
		}\n`
            let hasSession = false
            let args = func.arguments.map(arg => {
                if (arg.type.kind === "special") {
                    if (arg.type.name === "context") return "ctx"
                    if (arg.type.name === "session") {
                        hasSession = true
                        return "session"
                    }
                }
                return `input.${capitalize(arg.name)}`
            }).join(", ")
            if (hasSession) {
                contents += `
		session, err := api.GetSession(w, r, ctx)
		if err != nil {
			http.Error(w, "Failed to get session", http.StatusInternalServerError)
			return
		}\n\n`
            }
            contents += `\t\tdata := api.${func.name}(${args})`
            body += handlerTemplate(url, contents)
        }
    }
    return template(packageName, body, devMode)
}
