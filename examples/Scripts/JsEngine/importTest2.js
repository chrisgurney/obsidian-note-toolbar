/**
 * Example from JS Engine showing how ES imports work; imported from importTest1.js
 * Credit: https://github.com/mProjectsCode/obsidian-js-engine-plugin
 */

export class UserError extends Error {
    constructor(message) {
        super(message);
        this.name = "UserError";
    }
}

export function foo() {
    throw new UserError("UserError message");
}