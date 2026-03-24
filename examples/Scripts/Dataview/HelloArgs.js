/**
 * Simple script example that accepts arguments.
 * 
 * Pass parameters into this script in JSON format: e.g., person: "Chris"
 */

let person;
if (input) {
    ({person} = input);
}

console.log(`👋 Hello ${person} in the console!`);
new Notice(`👋 Hello ${person} in a notice!`);
return `👋 Hello ${person}!`;