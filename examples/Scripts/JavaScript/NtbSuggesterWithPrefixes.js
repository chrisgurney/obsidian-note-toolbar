const values = ['cat', 'dog'];
const selected = await ntb.suggester(values, null, {
    allowCustomInput: true,
    prefixes: {
        '#': () => Object.keys(this.ntb.app.metadataCache.getTags()),
        '[[': () => this.ntb.app.vault.getAllLoadedFiles().map(f => `[[${f.extension === 'md' ? f.basename : f.name}]]`)
    }
});
new Notice(selected);