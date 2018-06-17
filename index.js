#!/usr/bin/env node
const child_process = require("child_process");
const minimist = require("minimist");

const {runChecks, getCommands} = require("./src/utils");

var argv = require('minimist')(process.argv.slice(2));

try {
    runChecks();
    const commands = getCommands();
    if (commands.length === 0) {
        console.log("all packages up to date");
        process.exit(0);
    }

    for (const command of commands) {
        if (!argv["dry-run"]) {
            console.log(`running: ${command}`);
            child_process.execSync(command, {encoding: "utf8"});
        } else {
            console.log(`would run: ${command}`);
        }
    }

    if (!argv["dry-run"]) {
        console.log("pushing tags");
        child_process.execSync("git push --tags");
    } else {
        console.log(`would run: git push --tags`);
    }
} catch (e) {
    console.log(e);
    process.exit(1);
}
