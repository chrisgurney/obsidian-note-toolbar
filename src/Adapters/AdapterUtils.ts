import NoteToolbarPlugin from "main";
import { FileSystemAdapter, Notice, TFile } from "obsidian";
import { ErrorBehavior, ScriptContext, t, ToolbarItemSettings } from "Settings/NoteToolbarSettings";
import ItemModal from "Settings/UI/Modals/ItemModal";
import { importArgs } from "Utils/Utils";

export default class AdapterUtils {

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    /**
     * Gets the active file, or displays an error if there isn't one.
     * @param errorBehavior 
     * @returns the active file, or undefined
     */
    checkActiveFile(errorBehavior: ErrorBehavior): TFile | undefined {
        const activeFile = this.ntb.app.workspace.getActiveFile();
        if (!activeFile) {
            // TODO: render messages into the container, if provided
            if (errorBehavior === ErrorBehavior.Display) this.displayError(t('adapter.error.expr-note-not-open'));
            return;
        }
        return activeFile;
    }

    /**
     * Parses the provided script args, or displays an error if there's a problem.
     * @param argsJson 
     * @param containerEl 
     * @returns a map of the parsed arguments
     */
    checkArgs(
        argsJson: string | undefined, 
        errorContext: ScriptContext,
        containerEl?: HTMLElement
    ): Record<string, unknown> | undefined {
        const importedArgs = argsJson ? importArgs(argsJson) : { value: {} };
        if (importedArgs.value === null) {
            // TODO: render messages into the container, if provided
            const errorMessage = t('adapter.error.args-parsing');
            this.displayError(importedArgs.error, errorContext, errorMessage, containerEl);
            throw new Error(errorMessage);
        }
        return importedArgs.value;
    }

    checkContainer(containerId: string | undefined, errorContext: ScriptContext): HTMLElement | undefined {
        let containerEl: HTMLElement | undefined = undefined;
        if (containerId) {
            containerEl = this.ntb.el.getOutputEl(containerId) ?? undefined;
            if (!containerEl) {
                const errorMessage = t('adapter.error.callout-not-found', { id: containerId });
                this.displayError(errorMessage, errorContext);
                throw this.getScriptError(undefined, '', errorMessage);
            }
        }
        return containerEl;
    }

    /**
     * Checks if the given file exists, or displays an error if not.
     * @param filename 
     * @returns the file, or undefined
     */
    checkFile(filename: string, errorContext: ScriptContext): TFile | undefined {
        const file = this.ntb.app.vault.getFileByPath(filename);
        if (!file) {
            // TODO: render messages into the container, if provided
            const errorMessage = t('adapter.error.file-not-found', { filename: filename });
            this.displayError(errorMessage, errorContext);
            throw this.getScriptError(undefined, filename, errorMessage);
        }
        return file;
    }

    /**
     * Checks if the given file link exists, or displays an error if not.
     * @param filename 
     * @returns the file, or undefined
     */
    checkFileLink(filename: string): TFile | undefined {
        const activeFilePath = this.ntb.app.workspace.getActiveFile()?.path || '';
        const file = this.ntb.app.metadataCache.getFirstLinkpathDest(filename, activeFilePath);
        if (!file) {
            // TODO: render messages into the container, if provided
            const errorMessage = t('adapter.error.file-not-found', { filename: filename });
            this.displayError(errorMessage);
            throw this.getScriptError(undefined, filename, errorMessage);
        }
        return file;
    }

    /**
     * Displays the provided scripting error as a Notice, console message, and outputs to a container (if provided). 
     * @param error error or message to display 
     * @param context {@link ScriptContext}
     * @param notes additional notes to display
     * @param containerEl optional output container
     */
    displayError(
        error: unknown, 
        context?: ScriptContext, 
        notes?: string, 
        containerEl?: HTMLElement
    ) {
        const formattedMessage = formatErrorMessage(error);
        const messageWithNotes = notes ? `${notes}\n\n${formattedMessage}` : formattedMessage;

        // output to console
        const consoleMessage = error instanceof Error 
            ? (notes ? `${notes}\n\n${error.stack}` : error) 
            : messageWithNotes;
        console.error(consoleMessage);
        
        // output to a container, if provided
        if (containerEl) {
            const errorEl = containerEl.createEl('pre');
            errorEl.setText(messageWithNotes);
        }

        // show notice
        const noticeFr = new DocumentFragment();
        noticeFr.createEl('strong', { text: t('adapter.error.label-title') });
        
        if (notes) noticeFr.append(notes, '\n\n');

        const formattedMessageFr = new DocumentFragment();
        formattedMessageFr.createEl('code', { text: formattedMessage });
        noticeFr.append(formattedMessageFr);

        // notice CTAs
        const ctaFr = noticeFr.createEl('p', { cls: 'note-toolbar-notice-ctas' });
        ctaFr.append('→ ', t('adapter.error.check-console'));

        // notice CTAs: add link to open item settings if item is provided
        if (context?.item) {
            const openItemFr = itemModalFr(this.ntb, context?.item);
            if (openItemFr) ctaFr.append('\n→ ', openItemFr);
        }

        // show notice
        new Notice(noticeFr, 10000).containerEl.addClass('mod-warning');
    }

    /**
     * Outputs the provided script error based on provided {@link ScriptContext}.
     * @param error error to handle
     * @param context {@link ScriptContext}
     * @param expression script code to report
     * @param containerEl optional container to output to
     * @returns 
     */
    handleError(
        error: unknown,
        context: ScriptContext,
        expression: string = '',
        containerEl?: HTMLElement
    ): string | undefined {
        // this.ntb.debug('CONTEXT', context, context.errorBehavior);

        const formattedContext = context ? this.formatContext(context) : undefined;
        const formattedExpression = expression ? this.formatExpression(expression) : undefined;

        const errorMessage = context?.scriptFile
            ? t('adapter.error.exec-failed_context', {
                context: formattedContext,
                filename: context.scriptFile instanceof TFile ? getFileUri(this.ntb, context.scriptFile) : context.scriptFile,
                expression: formattedExpression
            })
            : context
                ? t('adapter.error.expr-failed_context', {
                    context: formattedContext,
                    expression: formattedExpression
                })
                : t('adapter.error.expr-failed', {
                    expression: formattedExpression
                });

        switch (context.errorBehavior) {
            case ErrorBehavior.Display: 
                this.displayError(error, context, errorMessage, containerEl);
                if (context?.scriptFile) {
                    return t('adapter.error.general_file', {
                        filename: `[[${context.scriptFile instanceof TFile ? context.scriptFile.path : context.scriptFile}]]`,
                        error
                    }) + '\n';
                }
                else {
                    return t('adapter.error.general', { error }) + '\n';
                }

            case ErrorBehavior.Report:
                this.displayError(error, context, errorMessage, containerEl);
                return undefined;

            case ErrorBehavior.Console:
                console.error(errorMessage, '\n\n', error);
                return undefined;

            case ErrorBehavior.Ignore:
                // completely ignore messages, e.g. for toolbar updates it would be too noisy to output errors to console
                return undefined;
        }
    }

    /**
     * Returns a string representation of the provided {@link ScriptContext}.
     * @param context {@link ScriptContext}
     */
    formatContext(context: ScriptContext): string {
        let result = '';
        const { scriptFile, toolbar, item, component, operation } = context;

        const wrap = ( subject: string, type: 'for' | 'in' | 'of' | 'with', target: string ): string => 
            t(`adapter.error.context.${type}`, { subject, target });

        if (component === 'callout') { return t('adapter.error.context.callout'); }

        if (operation) {
            result = t('adapter.error.context.operation', { operation });
        }

        if (component) {
            const componentText = t('adapter.error.context.component', { component });
            result = result ? wrap(result, operation ? 'for' : 'of', componentText) : componentText;
        }

        if (item) {
            const itemText = t('adapter.error.context.item', { item: formatScriptItem(this.ntb, item, context) });
            result = result ? wrap(result, component ? 'of' : (operation ? 'for' : 'of'), itemText) : itemText;
        }

        if (toolbar) {
            const toolbarText = t('adapter.error.context.toolbar', { toolbar: toolbar.name });
            result = result ? wrap(result, 'in', toolbarText) : toolbarText;
        }

        if (scriptFile) {
            const fileText = t('adapter.error.context.file', { file: (scriptFile instanceof TFile) ? scriptFile.path : scriptFile });
            result = result ? wrap(result, 'with', fileText) : fileText;
        }

        return result;
    }

    /**
     * Formats an expression for display (for error notices + console), by prepending and truncating if necessary.
     */
    formatExpression(expression: string, maxLength = 250): string {
        const lines = expression.split('\n');
        const result: string[] = [];
        const PREFIX = '    ';
        let length = 0;

        for (const line of lines) {
            const formattedLine = `${PREFIX}${line}`;

            if (length + formattedLine.length + (result.length ? 1 : 0) > maxLength) {
                break;
            }

            result.push(formattedLine);
            length += formattedLine.length + (result.length > 1 ? 1 : 0);
        }

        return result.join('\n') + (result.length < lines.length ? `\n${PREFIX}...` : '');
    }

    /**
     * Returns an error with additional context (sourceFile and optional notes), 
     * for diagnosing script evaluation errors.
     * 
     * @param error the original error
     * @param sourceFile the script file where the error occurred
     * @param notes optional context to display with the source file
     */
    getScriptError(
        error: unknown,
        sourceFile: TFile | string,
        notes?: string
    ): Error {
        const isError = error instanceof Error;
        const message = isError ? error.message : String(error);
        const name = isError ? error.name : 'Error';

        const uri = sourceFile instanceof TFile ? getFileUri(this.ntb, sourceFile) : sourceFile;

        const result = new Error(message);
        result.name = `${notes ?? ''}${uri}\n\n${name}`;

        const originalStack = isError
            ? error.stack?.split('\n').slice(1).join('\n')
            : undefined;

        result.stack = `${result.name}: ${message}${originalStack ? `\n${originalStack}` : ''}`;

        return result;
    }

}

function itemModalFr(ntb: NoteToolbarPlugin, item: ToolbarItemSettings): DocumentFragment | undefined {
    let itemLink: DocumentFragment | undefined;
    const itemToolbar = ntb.settingsManager.getToolbarByItemId(item.uuid);
    if (itemToolbar) {
        itemLink = new DocumentFragment();
        itemLink.createEl('a', { 
            cls: "note-toolbar-setting-focussable-link", 
            text: t('adapter.link-edit-item'), 
            attr: { 'aria-label': t('adapter.link-edit-item_tooltip'), tabindex: '0' }
        }, el => {
            const open = () => {
                const itemModal = new ItemModal(ntb, itemToolbar, item);
                itemModal.open();
            }
            ntb.registerDomEvent(el, 'click', open);
            ntb.registerDomEvent(el, 'keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    open();
                }
            });
        });
    }
    return itemLink;
}

function formatErrorMessage(error: unknown): string {
    const isError = error instanceof Error;
    const message = isError ? error.message : String(error);

    // truncate if necessary (Dataview puts full stack trace in error.message)
    const truncateMatch = message.match(/[\r\n]\s+at\b/);
    const messageTruncated = truncateMatch ? message.slice(0, truncateMatch.index) : message;

    return messageTruncated;
}

/**
 * Collapses a string with variables down to: `{{js:...}}`.
 * @param value string with variable to condense for output
 * @returns collapsed string
 */
function formatVariableValue(value: string): string {
    return value.replace(
        /\{\{(js|tp|dv|jse):[\s\S]*?\}\}/g,
        '$1:...'
    );
}

/**
 * Formats a toolbar item's text and appends the given component, for output,
 * to help users find the source of the error.
 * @param ntb plugin instance
 * @param item {@link ToolbarItemSettings}
 * @param component as passed in {@link ScriptContext}
 * @returns formatted item text
 */
function formatScriptItem(
    ntb: NoteToolbarPlugin,
    item: ToolbarItemSettings,
    context?: ScriptContext
): string {
    const text = [item.label, item.tooltip]
        .find(value => value && !ntb.vars.hasVars(value))
        ?? item.label
        ?? item.tooltip;

    return [
        text || item.uuid,
        context?.component === 'URI' && item.link
            ? `URI: ${item.link}`
            : undefined
    ]
        .filter((value): value is string => !!value)
        .map(formatVariableValue)
        .join(' ');
}

/**
 * Returns a `file://` URI for the given file, to provide a link for error messages.
 * 
 * @param ntb plugin instance
 * @param file TFile to get URI for
 * @returns 
 */
function getFileUri(ntb: NoteToolbarPlugin, file: TFile) {
    const basePath = (ntb.app.vault.adapter as FileSystemAdapter).getBasePath();
    return `file://${encodeURI(`${basePath}/${file.path}`)}`;
}

