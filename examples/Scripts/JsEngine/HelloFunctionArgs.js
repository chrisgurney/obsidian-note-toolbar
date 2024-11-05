/**
 * Simple script example, as a function with arguments.
 * 
 * Pass parameters into this script in JSON format: e.g., { "name": "Chris" }
 * The 'engine' variable is passed in automatically, so you can access JS Engine's API.
 */

export function Hello(engine, args) {
    console.log(`👋 Hello ${args['name']}`);
    new Notice(`👋 Hello ${args['name']}`);
}