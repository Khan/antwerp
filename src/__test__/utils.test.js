const child_process = require("child_process");
const tmp = require("tmp");
const { copySync } = require("fs-extra");
const path = require("path");
const fs = require("fs");
const semver = require("semver");

const { runChecks, getTags, getCommands, getWorkspaces } = require("../utils");

function addTag(tag) {
    child_process.execSync(`git tag ${tag}`);
}

function bumpVersion(pkgPath, release) {
    const pkgJsonPath = path.join(pkgPath, "package.json");
    const json = JSON.parse(fs.readFileSync(pkgJsonPath));
    const newVersion = semver.inc(json.version, release);
    json.version = newVersion;
    fs.writeFileSync(pkgJsonPath, JSON.stringify(json, null, 4));
}

function getPackages() {
    const packages = {};

    const workspaces = getWorkspaces();

    for (const workspace of workspaces) {
        const pkgPath = path.join(workspace, "package.json");
        if (!fs.existsSync(pkgPath)) {
            throw new Error(`no package.json for ${ws}`);
        }
        // TODO: validate the package.json
        const pkgJson = JSON.parse(fs.readFileSync(pkgPath));
        // TODO: store the paths separately
        pkgJson.__path__ = pkgPath;
        packages[pkgJson.name] = pkgJson;
    }

    return packages;
}

// TODO: use before/after to clean things up properly
function runTest(fixture, name, func) {
    test(`${fixture} ${name}`, () => {
        const tmpObj = tmp.dirSync({ unsafeCleanup: true });
        copySync(path.join("fixtures", fixture), tmpObj.name);

        const cwd = process.cwd();
        process.chdir(tmpObj.name);

        child_process.execSync("git init");
        child_process.execSync("git add .");
        child_process.execSync(`git commit -a -m "initial commit"`);

        func();

        process.chdir(cwd);
        tmpObj.removeCallback();
    });
}

describe("checks", () => {
    runTest("private-dep-public-pkg", "should fail", () => {
        expect(() => {
            runChecks();
        }).toThrow();
    });

    runTest("public-dep-public-pkg", "should not fail", () => {
        expect(() => {
            runChecks();
        }).not.toThrow();
    });
});

describe("tags", () => {
    runTest("public-dep-public-pkg", "should have no tags by default", () => {
        const tags = getTags();
        expect(tags).toEqual([]);
    });

    runTest("public-dep-public-pkg", "should add all tags", () => {
        expect(getTags()).toEqual([]);
        expect(getCommands()).toEqual([
            "git tag @fixture/public-dep@0.0.1",
            "npm publish --access=public packages/public-dep",
            "git tag @fixture/public-pkg@0.0.1",
            "npm publish --access=public packages/public-pkg",
        ]);
    });

    runTest("public-dep-public-pkg", "should add all tags", () => {
        expect(getTags()).toEqual([]);
        addTag("@fixture/public-dep@0.0.1");
        addTag("@fixture/public-pkg@0.0.1");
        bumpVersion("packages/public-dep", "patch");
        expect(getCommands()).toEqual([
            "git tag @fixture/public-dep@0.0.2",
            "npm publish --access=public packages/public-dep",
        ]);
    });
});

describe("packages", () => {
    runTest("public-dep-public-pkg", "should get package json", () => {
        const packages = getPackages();
        expect(Object.keys(packages)).toEqual([
            "@fixture/public-dep",
            "@fixture/public-pkg",
        ]);
        expect(packages["@fixture/public-dep"].version).toEqual("0.0.1");
        expect(packages["@fixture/public-pkg"].version).toEqual("0.0.1");
    });

    runTest("public-dep-public-pkg", "should bump versions", () => {
        expect(getPackages()["@fixture/public-dep"].version).toEqual("0.0.1");
        bumpVersion("packages/public-dep", "patch");
        expect(getPackages()["@fixture/public-dep"].version).toEqual("0.0.2");
        bumpVersion("packages/public-dep", "patch");
        expect(getPackages()["@fixture/public-dep"].version).toEqual("0.0.3");
        bumpVersion("packages/public-dep", "minor");
        expect(getPackages()["@fixture/public-dep"].version).toEqual("0.1.0");
        bumpVersion("packages/public-dep", "major");
        expect(getPackages()["@fixture/public-dep"].version).toEqual("1.0.0");
    });
});
