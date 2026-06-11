/**
 * This script opens links shared from Note Toolbar directly in Obsidian.
 * Learn more: https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Sharing-toolbars
 *
 * Flow:
 * 1. read incoming uri from query string
 * 2. extract import value
 * 3. always render fallback link (needed for web viewers)
 * 4. attempt redirect into obsidian
 */

document.addEventListener('DOMContentLoaded', () => {

	const uri = new URLSearchParams(window.location.search).get('uri');

    // show a fallback link (Obsidian web viewer doesn't seem to do redirects)
    const container = document.createElement('div');

    const link = document.createElement('a');
    link.style.display = 'block';
    link.textContent = 'Open in Obsidian ↗';
    link.href = 'obsidian://note-toolbar';

    const p = document.createElement('p');
    p.appendChild(link);
    document.querySelector('.message')?.appendChild(p);
	
    document.body.appendChild(container);

    // ignore invalid input
    if (!uri || !uri.startsWith('obsidian://note-toolbar')) return;

    // extract import value from uri
    const param = uri.split('?import=')[1];
    if (!param) return;

    const finalUrl = 'obsidian://note-toolbar?import=' + encodeURIComponent(param);

    // update page link and attempt redirect
    link.href = finalUrl;
	window.location.replace(finalUrl);
});
