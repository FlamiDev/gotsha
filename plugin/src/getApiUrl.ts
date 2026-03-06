export function getApiUrl(goFilePath: string, funcName: string) {
    const safePath = goFilePath.replaceAll(/[^a-zA-Z0-9]/g, "_")
    return `/api/${safePath}/${funcName}`
}
