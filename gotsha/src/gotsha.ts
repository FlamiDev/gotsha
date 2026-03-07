import {parseCode, ParseResults} from "./parse";
import {generateCode, generateTypeDef} from "./generate";
import {generateGo} from "./generateGo";
import {build, createServer} from 'vite'
import {join} from "node:path";
import {mkdir, readdir, readFile, rm, writeFile} from "node:fs/promises";
import * as process from "node:process";
import {execSync, spawn} from "node:child_process";
import {watcher} from "./watcher";
import killPort from "kill-port"

const goApiDir = join(process.cwd(), "api")
const webGeneratedDir = join(process.cwd(), "web", "generated")
const goGeneratedFile = join(process.cwd(), "generated.go")
const goModFile = join(process.cwd(), "go.mod")

const parseResultCache = new Map<string, ParseResults>()

async function writeTypeDef(relativePath: string) {
    const actualPath = join(goApiDir, relativePath)
    const src = await readFile(actualPath, "utf-8")
    const result = parseCode(src)
    parseResultCache.set(relativePath, result)
    const types = generateTypeDef(result, relativePath)
    const generatedPath = join(webGeneratedDir, relativePath.replace(".go", ".d.ts"))
    await mkdir(webGeneratedDir, {recursive: true})
    await writeFile(generatedPath, types, "utf-8")
}

async function deleteTypeDef(relativePath: string) {
    const generatedPath = join(webGeneratedDir, relativePath.replace(".go", ".d.ts"))
    await mkdir(webGeneratedDir, {recursive: true})
    await rm(generatedPath, {force: true})
}

async function generateAllTypeDefs() {
    const files = await readdir(goApiDir, {recursive: true})
    for (const file of files) {
        if (file.endsWith(".go")) {
            await writeTypeDef(file)
        }
    }
}

async function regenerateGoCode(packageName: string, devMode: boolean = false) {
    const code = generateGo(packageName, parseResultCache, devMode)
    await writeFile(goGeneratedFile, code, "utf-8")
}

export default function gotsha() {
    return {
        name: 'gotsha',
        config() {
            return {
                server: {
                    port: 3000,
                    proxy: {
                        '/api': 'http://localhost:8080',
                    }
                },
            }
        },
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

async function watchMode(packageName: string) {
    await generateAllTypeDefs()
    await regenerateGoCode(packageName, true)
    const server = await createServer()
    await server.listen()
    server.printUrls()
    try {
        await killPort(8080)
    } catch (e) {}
    let goProcess = spawn("go", ["run", "."], {stdio: "inherit"});
    try {
        for await (const event of watcher(".")) {
            console.log(`File ${event.type}: ${event.path}`)
            if (event.path.startsWith("api")) {
                if (event.type === "remove") {
                    await deleteTypeDef(event.path.slice(4))
                } else {
                    await writeTypeDef(event.path.slice(4))
                }
                await regenerateGoCode(packageName, true)
            }
            console.log("Restarting Go server...")
            goProcess.kill()
            try {
                await killPort(8080)
            } catch (e) {}
            goProcess = spawn("go", ["run", "."], {stdio: "inherit"})
            console.log("Go server restarted.")
        }
    } finally {
        goProcess.kill()
    }
}

async function buildMode(packageName: string) {
    await generateAllTypeDefs()
    await regenerateGoCode(packageName)
    await build()
    execSync("go build", {stdio: "inherit"})
}

(async () => {
    if (process.argv[1].endsWith("gotsha.js")) {
        const goModContent = await readFile(goModFile, "utf-8")
        const match = goModContent.match(/module\s+(\S+)/)
        if (!match) {
            console.error("Cannot find module name in go.mod")
            process.exit(1)
        }
        const packageName = match[1]

        const arg: string | undefined = process.argv[2]
        if (arg == undefined) {
            await watchMode(packageName)
        } else if (arg === "build") {
            await buildMode(packageName)
        } else {
            console.error("Unknown argument", arg)
        }
    }
})()
