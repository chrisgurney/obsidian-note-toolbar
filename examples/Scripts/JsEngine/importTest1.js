/**
 * Import example showing how ES imports work.
 * Credit: https://github.com/mProjectsCode/obsidian-js-engine-plugin
 * 
 * NOTE: This script must be in the vault root folder, for this import to work.
 */

import {UserError} from "./Scripts/JsEngine/importTest2.js";

export async function bar(engine) {
    const {foo} = await engine.importJs("./Scripts/JsEngine/importTest2.js");
    try {
        foo();
    } catch (e) {
        if (e instanceof UserError) {
            return "Caught UserError";
        } else {
            return "Caught other error";
        }
    }
}