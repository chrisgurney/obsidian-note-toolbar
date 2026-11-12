/**
 * Tier 1 (DOM) spike test: ConfirmModal builds real DOM through the
 * Obsidian API (Modal, ButtonComponent, createDiv, addClass) and wires
 * button clicks to its confirmation state.
 *
 * This is the class of code the Tier 0 hand-written mocks could not
 * exercise at all: the old tests/mocks/obsidian.ts had no Modal or
 * ButtonComponent at all. With obsidian-test-mocks the modal's whole
 * element tree exists in jsdom, so the test asserts on the rendered
 * DOM and dispatches real click events on the rendered buttons.
 */
import { App } from 'obsidian';
import ConfirmModal from 'Settings/UI/Modals/ConfirmModal';
import { describe, expect, it, vi } from 'vitest';

type MockApp = typeof import('obsidian-test-mocks/obsidian').App;

function fragmentWith(text: string): DocumentFragment {
	const fragment = document.createDocumentFragment();
	const span = document.createElement('span');
	span.textContent = text;
	fragment.append(span);
	return fragment;
}

function makeModal(over: Partial<{ warning: boolean }> = {}) {
	const app = (App as unknown as MockApp).createConfigured__();
	const modal = new ConfirmModal(app as unknown as App, {
		title: 'Delete toolbar?',
		questionLabel: fragmentWith('This cannot be undone.'),
		notes: fragmentWith('Applies to all vaults.'),
		approveLabel: 'Delete',
		denyLabel: 'Cancel',
		warning: over.warning ?? true,
	});
	return modal;
}

function buttonsOf(modal: ConfirmModal): HTMLButtonElement[] {
	return Array.from(modal.contentEl.querySelectorAll('button'));
}

describe('ConfirmModal (DOM)', () => {
	it('renders title, question, notes, and both buttons with dialog classes', async () => {
		const modal = makeModal();
		await modal.display();

		expect(modal.modalEl.hasClass('note-toolbar-setting-confirm-dialog')).toBe(true);
		expect(modal.modalEl.hasClass('note-toolbar-setting-mini-dialog')).toBe(true);
		expect(modal.modalEl.hasClass('note-toolbar-setting-modal-container')).toBe(true);
		expect(modal.titleEl.textContent).toBe('Delete toolbar?');
		expect(modal.contentEl.textContent).toContain('This cannot be undone.');

		const noteEl = modal.contentEl.querySelector('.note-toolbar-setting-confirm-dialog-note');
		expect(noteEl?.textContent).toContain('Applies to all vaults.');

		const buttons = buttonsOf(modal);
		expect(buttons.map((b) => b.textContent)).toEqual(['Cancel', 'Delete']);
	});

	it('warning variant marks the approve button destructive instead of cta', async () => {
		const modal = makeModal({ warning: true });
		await modal.display();
		const [, approve] = buttonsOf(modal);
		expect(approve.hasClass('note-toolbar-setting-button-destructive')).toBe(true);
		expect(approve.hasClass('mod-cta')).toBe(false);
	});

	it('non-warning variant marks the approve button as cta', async () => {
		const modal = makeModal({ warning: false });
		await modal.display();
		const [, approve] = buttonsOf(modal);
		expect(approve.hasClass('mod-cta')).toBe(true);
	});

	it('clicking approve sets isConfirmed and closes the modal', async () => {
		const modal = makeModal();
		await modal.display();
		const closeSpy = vi.spyOn(modal, 'close');
		const [, approve] = buttonsOf(modal);
		approve.click();
		expect(modal.isConfirmed).toBe(true);
		expect(closeSpy).toHaveBeenCalledTimes(1);
	});

	it('clicking cancel closes without confirming', async () => {
		const modal = makeModal();
		await modal.display();
		const closeSpy = vi.spyOn(modal, 'close');
		const [cancel] = buttonsOf(modal);
		cancel.click();
		expect(modal.isConfirmed).toBe(false);
		expect(closeSpy).toHaveBeenCalledTimes(1);
	});
});
