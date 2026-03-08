import { input } from '@inquirer/prompts';
import { readFile, writeFile, rm, rename } from "node:fs/promises"
import { existsSync } from "node:fs"
import { execSync } from "node:child_process";
import { join } from "node:path";

const gitRepo = "https://github.com/FlamiDev/gotsha-template.git";

(async () => {
    const packageName = await input({
        message: "Package name",
        default: "gotsha-project"
    });

    const packagePath = join(process.cwd(), packageName);
    if (existsSync(packagePath)) {
        console.log("Directory already exists, please choose another name or remove it.");
        process.exit(1);
    }

    console.log("Cloning template...");

    execSync(`git clone --depth 1 ${gitRepo} ${packagePath}`);
    await rm(join(packagePath, ".git"), { recursive: true, force: true });

    console.log("Setting up package...");

    const packageJsonPath = join(packagePath, "package.json");
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8"));
    packageJson.name = packageName;
    await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), "utf-8");

    const goModPath = join(packagePath, "go.mod");
    const goModContent = await readFile(goModPath, "utf-8");
    const updatedGoModContent = goModContent.replace("module_name_template", packageName)
    await writeFile(goModPath, updatedGoModContent, "utf-8");

    const mainGoPath = join(packagePath, "main.go");
    const mainGoContent = await readFile(mainGoPath, "utf-8");
    const updatedMainGoContent = mainGoContent.replace("module_name_template", packageName)
    await writeFile(mainGoPath, updatedMainGoContent, "utf-8");

    const gitignoreTemplatePath = join(packagePath, ".gitignore.template");
    const gitignorePath = join(packagePath, ".gitignore");
    await rename(gitignoreTemplatePath, gitignorePath);

    console.log("Package created successfully!");
    console.log("Install dependencies and run 'npm run dev' to start the development server.");
})()
