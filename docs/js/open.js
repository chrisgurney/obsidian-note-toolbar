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

    const p1 = document.createElement('p');
    p1.appendChild(link);
	const p2 = document.createElement('p');
	p2.setText("If you're using the Obsidian Web Viewer, right-click on this link and select \"Open link in default browser\".");

	const pre = document.createElement('pre');
	pre.setText(`
		userAgent=${navigator.userAgent}
		referrer=${document.referrer}
		href=${location.href}
	`);
	
    document.querySelector('.message')?.appendChild(p1);
    document.querySelector('.message')?.appendChild(p2);
	document.querySelector('.message')?.appendChild(pre);
	
    document.body.appendChild(container);

    // ignore invalid input
    if (!uri || !uri.startsWith('obsidian://note-toolbar')) return;

    // extract import value from uri
    const param = uri.split('?import=')[1];
    if (!param) return;

    const finalUrl = 'obsidian://note-toolbar?import=' + encodeURIComponent(param);
	
    // update page link and attempt redirect
    link.href = finalUrl;
	// window.location.replace(finalUrl);
	window.location.href = finalUrl;
	
});
