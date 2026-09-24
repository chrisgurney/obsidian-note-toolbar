/* Shows a bookmarks as a scrollable list of cards.

TO USE: 
- In a note:
 ```dataviewjs
 await dv.view("path/to/BookmarkCards")
 ```
*/

function BookmarkCards() {
    // list bookmarks
    // const bm = ntb.app.internalPlugins.plugins['bookmarks'];
    const bm = app.internalPlugins.plugins['bookmarks'];
    const i = bm.instance?.getBookmarks();
    const mi = i
    .filter(b => b.type === 'file' || b.type === 'folder')
    .map(b => ({
        value: b.path,
        label: b.title ? b.title : b.path,
        icon: b.type === 'folder' ? 'LiFolder' : 'LiFile'
    }));

    // build the callout
    let callout = '> [!note-toolbar|card-nowrap-purple]\n';
    mi.forEach(item => {
        callout += `> - [[${item.value}|:${item.icon}: ${item.label}]]\n`;
    });

    dv.span(callout);
}

BookmarkCards()