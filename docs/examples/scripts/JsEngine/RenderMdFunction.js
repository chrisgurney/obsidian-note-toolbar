/**
 * Shows how to use JS Engine's markdown renderer to render markdown, within a function.
 * 
 * The 'engine' variable is passed in automatically, so you can access JS Engine's API.
 */

export function Render(engine) {
    return engine.markdown.create('*test*');
}