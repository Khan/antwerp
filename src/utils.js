const fs = require("fs");
const child_process = require("child_process");
const path = require("path");
const glob = require("glob");
const semver = require("semver");

function getTags() {
    return child_process.execSync(`git tag`, {encoding: "utf8"}).split("\n").filter(Boolean);
}

function getWorkspaces() {
    const pkgJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    return pkgJson.workspaces.reduce((result, wsGlob) => {
        return result.concat(glob.sync(wsGlob));
    }, []);
}

// We assume that if a there's a tag for the current version of a package that
// it's been published already.  In the future we should check if that version
// exists on npm and attempt to republish the package if it isn't.
// See https://github.com/Khan/antwerp/issues/3.
function getCommands() {
    const commands = [];
    const allTags = getTags();
    for (const workspace of getWorkspaces()) {
        const pkgPath = path.join(workspace, "package.json");
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        if (pkg.private) {
            continue;
        }
        const tag = `${pkg.name}@${pkg.version}`;
        if (!allTags.includes(tag)) {
            commands.push(`git tag ${tag}`);
            // We use npm instead of yarn for publishing b/c yarn publish
            // bumps the version automatically
            commands.push(`npm publish --access=public ${workspace}`);
        }
    }

    return commands;
}

function runChecks(verbose = false) {
    const execOptions = {
        encoding: "utf8",
    };
        
    const pkgVerMap = {};
    const depMap = {};
    const pkgJsonMap = {};
    
    for (const workspace of getWorkspaces()) {
        const pkgPath = path.join(workspace, "package.json");
        if (!fs.existsSync(pkgPath)) {
            throw new Error(`no package.json for ${workspace}`);
        }
        const pkgJson = JSON.parse(fs.readFileSync(pkgPath));
        pkgVerMap[pkgJson.name] = pkgJson.version;
        depMap[pkgJson.name] = pkgJson.dependencies || {};
        pkgJsonMap[pkgJson.name] = pkgJson;
    }
    
    for (const [pkgName, deps] of Object.entries(depMap)) {
        for (const depName of Object.keys(deps)) {
            // Check that dependency exists
            // TODO: handle external dependencies
            if (!pkgVerMap.hasOwnProperty(depName)) {
                throw new Error(`${pkgName} has dep ${depName} which doesn't exist`);
            }

            // Check that depedency versions are satisified
            // TODO: fallback to check if any tags exist that would satisfy the dep
            if (!semver.satisfies(pkgVerMap[depName], deps[depName])) {
                throw new Error(`${depName}@${pkgVerMap[depName]} doesn't satisfy ${depName}@${deps[depName]}`)
            }    

            // Check to see if any dependencies of public packages are private
            if (!pkgJsonMap[pkgName].private && pkgJsonMap[depName].private) {
                throw new Error(`${pkgName} is public but ${depName} is private`);
            }

            if (verbose) {                
                console.log(`INFO: deps for ${pkgName} satisfied`);
            }
        }
    }
}

module.exports = {
    runChecks,
    getTags,
    getCommands,
    getWorkspaces,
};
