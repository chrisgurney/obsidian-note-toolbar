const values = ['cat', 'dog'];
const selected = await ntb.suggester(values, null, {
    allowCustomInput: true,
    prefixes: {
        '#': () => Object.keys(this.ntb.app.metadataCache.getTags())
    }
});
new Notice(selected);