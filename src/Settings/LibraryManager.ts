import libDvFormatting from "Library/Dataview.md";
import NoteToolbarPlugin from "main";

type ScriptEntry = {
    id: string;
    name: string;
    description: string;
    code: string;
    plugins: string[];
};

export default class LibraryManager {

    private scripts: ScriptEntry[]; 

    constructor(private plugin: NoteToolbarPlugin) {
    }

    load() {
        this.scripts = this.parseScriptLibrary(libDvFormatting);
    }

    // getScriptDescription(scriptId: string): string {
    //     return this.scripts.find(script => script.id === scriptId)?.description || '';
    // }

    getScriptEntry(pluginId: string, scriptId: string): ScriptEntry | undefined {
        return this.scripts.find(script =>
            script.id === scriptId && script.plugins.includes(pluginId)
        );
    }

    getScriptOptions(pluginId: string): Record<string, string> {
        return Object.fromEntries(
            this.scripts
                .filter(script => script.plugins.includes(pluginId))
                .map(script => [script.id, script.name])
        );
    }

    private parsePluginProperty(frontmatter: string): string[] {
        const match = frontmatter.match(/^plugin:\s*(.+)/im);
        if (!match) return [];
        
        const value = match[1].trim();
        return value.includes(',') 
            ? value.split(',').map(p => p.trim()) 
            : [value];
    }

    private parseScriptLibrary(markdown: string): ScriptEntry[] {
        const scripts: ScriptEntry[] = [];
        let plugins: string[] = [];
    
        // extract and remove frontmatter (if present)
        const frontmatterMatch = markdown.match(/^---\n([\s\S]+?)\n---/);
        if (frontmatterMatch) {
            const frontmatter = frontmatterMatch[1];
            plugins = this.parsePluginProperty(frontmatter);
            markdown = markdown.replace(frontmatterMatch[0], '').trim();
        }
    
        // ignore preamble before the first heading
        const firstHeadingMatch = markdown.match(/^#+\s+/m);
        if (firstHeadingMatch) {
            markdown = markdown.slice(firstHeadingMatch.index || 0);
        }
    
        // split by headings (any level #, ##, etc.)
        const scriptBlocks = markdown.split(/\n(?=#+ )/);
    
        for (const block of scriptBlocks) {
            const nameMatch = block.match(/^#+\s+(.+)/);
            const idMatch = block.match(/^`?ID:\s*([a-z0-9-]+)`?/m);
            const descriptionMatch = block.match(/\n\n([\s\S]+?)\n\n```/);
            const codeMatch = block.match(/```(?:\S+)?\n([\s\S]+?)\n```/m); // ignores language
    
            if (nameMatch && codeMatch) {
                let id = idMatch ? idMatch[1] : this.toKebabCase(nameMatch[1]);

                scripts.push({
                    id,
                    name: nameMatch[1],
                    description: descriptionMatch ? descriptionMatch[1].trim() : '',
                    code: codeMatch[1].trim(),
                    plugins: plugins
                });
            }
        }
    
        return scripts;
    }

    /** 
     * Helper function to convert text to kebab-case.
     */
    private toKebabCase(str: string): string {
        return str
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/^-+/, '') // Remove leading hyphen if present
            .replace(/-+$/, ''); // Remove trailing hyphen if present
    }

}