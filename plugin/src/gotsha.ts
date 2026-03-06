import {parseCode} from "./parse";
import {generateCode, generateTypeDef} from "./generate";
import {join} from "path";
import {mkdir, readdir, readFile, watch, writeFile} from "fs/promises";
import * as process from "node:process";
import {build, createServer} from 'vite'

const goApiDir = join(process.cwd(), "api")
const webGeneratedDir = join(process.cwd(), "web", "generated")

async function writeTypeDef(relativePath: string) {
    const actualPath = join(goApiDir, relativePath)
    const src = await readFile(actualPath, "utf-8")
    const result = parseCode(src)
    const types = generateTypeDef(result, relativePath)
    const generatedPath = join(webGeneratedDir, relativePath.replace(".go", ".d.ts"))
    await mkdir(webGeneratedDir, {recursive: true})
    await writeFile(generatedPath, types, "utf-8")
}

async function generateAllTypeDefs() {
    const files = await readdir(goApiDir, {recursive: true})
    for (const file of files) {
        if (file.endsWith(".go")) {
            await writeTypeDef(file)
        }
    }
}

export default function gotsha() {
    return {
        name: 'gotsha',
        resolveId(goFilePath: string) {
            if (goFilePath.endsWith('.go')) {
                return goFilePath;
            }
        },
        async load(goFilePath: string) {
            if (goFilePath.endsWith('.go')) {
                const actualPath = join(goApiDir, goFilePath)
                const src = await readFile(actualPath, "utf-8")
                const result = parseCode(src)
                return generateCode(result, goFilePath)
            }
            return null
        },
    }
}

async function watchMode() {
    await generateAllTypeDefs()
    const server = await createServer()
    await server.listen()
    server.printUrls()
    const watcher = watch(goApiDir, {recursive: true})
    for await (const event of watcher) {
        if (event.filename?.endsWith(".go")) {
            await writeTypeDef(event.filename)
        }
    }
}

async function buildMode() {
    await generateAllTypeDefs()
    await build()
}

(async () => {
    if (process.argv[1].endsWith("gotsha.js")) {
        const arg: string | undefined = process.argv[2]
        if (arg == undefined) {
            await watchMode()
        } else if (arg === "build") {
            await buildMode()
        } else {
            console.error("Unknown argument", arg)
        }
    }
})()
