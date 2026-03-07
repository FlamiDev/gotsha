import chokidar from 'chokidar';

export async function* watcher(path: string) {
    const chokidarWatcher = chokidar.watch(path, {
        ignored: (path, stats) => (stats?.isFile() ?? false) && !(
            path.endsWith('.go')
            && !path.includes("generated")
        ),
        ignoreInitial: true,
        persistent: true,
    });
    const eventQueue: { type: "add" | "change" | "remove", path: string }[] = []
    chokidarWatcher.on("add", (path) => {
        eventQueue.push({type: "add", path})
    })
    chokidarWatcher.on("change", (path) => {
        eventQueue.push({type: "change", path})
    })
    chokidarWatcher.on("unlink", (path) => {
        eventQueue.push({type: "remove", path})
    })
    while (true) {
        if (eventQueue.length > 0) {
            yield eventQueue.shift()!
        } else {
            await new Promise(resolve => setTimeout(resolve, 500))
        }
    }
}
