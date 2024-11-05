/**
 * Simple script example that accepts arguments.
 * 
 * Pass parameters into this script in JSON format: e.g., { "name": "Chris" }
 */

(async () => {
    let name
    if (input) {
        ({name} = input)
    }
    console.log(`👋 Hello ${name} in the console!`);
    new Notice(`👋 Hello ${name} in a notice!`);
})();