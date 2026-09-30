import NoteToolbarPlugin from "main";
import { FileSystemAdapter, Notice, TFile } from "obsidian";
import { ErrorBehavior, ScriptContext, t, ToolbarItemSettings } from "Settings/NoteToolbarSettings";
import ItemModal from "Settings/UI/Modals/ItemModal";
import { importArgs } from "Utils/Utils";

/**
 * Gets the active file, or displays an error if there isn't one.
 * @param ntb 
 * @param errorBehavior 
 * @returns the active file, or undefined
 */
export function checkActiveFile(ntb: NoteToolbarPlugin, errorBehavior: ErrorBehavior): TFile | undefined {
    const activeFile = ntb.app.workspace.getActiveFile();
    if (!activeFile) {
        // TODO: render messages into the container, if provided
        if (errorBehavior === ErrorBehavior.Display) displayScriptError(ntb, t('adapter.error.expr-note-not-open'));
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
export function checkArgs(
    ntb: NoteToolbarPlugin,
    argsJson: string | undefined, 
    errorContext: ScriptContext,
    containerEl?: HTMLElement
): Record<string, unknown> | undefined {
    const importedArgs = argsJson ? importArgs(argsJson) : { value: {} };
    if (importedArgs.value === null) {
        // TODO: render messages into the container, if provided
        const errorMessage = t('adapter.error.args-parsing');
        displayScriptError(ntb, importedArgs.error, errorContext, errorMessage, containerEl);
        throw new Error(errorMessage);
    }
    return importedArgs.value;
}

/**
 * Checks if the given file exists, or displays an error if not.
 * @param ntb 
 * @param filename 
 * @returns the file, or undefined
 */
export function checkFile(ntb: NoteToolbarPlugin, filename: string): TFile | undefined {
    const file = ntb.app.vault.getFileByPath(filename);
    if (!file) {
        // TODO: render messages into the container, if provided
        const errorMessage = t('adapter.error.file-not-found', { filename: filename });
        displayScriptError(ntb, errorMessage);
        throw getScriptError(ntb, undefined, filename, errorMessage);
    }
    return file;
}

/**
 * Checks if the given file link exists, or displays an error if not.
 * @param ntb 
 * @param filename 
 * @returns the file, or undefined
 */
export function checkFileLink(ntb: NoteToolbarPlugin, filename: string): TFile | undefined {
    const activeFilePath = ntb.app.workspace.getActiveFile()?.path || '';
    const file = ntb.app.metadataCache.getFirstLinkpathDest(filename, activeFilePath);
    if (!file) {
        // TODO: render messages into the container, if provided
        const errorMessage = t('adapter.error.file-not-found', { filename: filename });
        displayScriptError(ntb, errorMessage);
        throw getScriptError(ntb, undefined, filename, errorMessage);
    }
    return file;
}

export function checkOutputContainer(ntb: NoteToolbarPlugin, containerId: string | undefined): HTMLElement | undefined {
    let containerEl: HTMLElement | undefined = undefined;
    if (containerId) {
        containerEl = ntb.el.getOutputEl(containerId) ?? undefined;
        if (!containerEl) {
            const errorMessage = t('adapter.error.callout-not-found', { id: containerId });
            displayScriptError(ntb, errorMessage);
            throw getScriptError(ntb, undefined, '', errorMessage);
        }
    }
    return containerEl;
}

/**
 * Displays the provided scripting error as a Notice, console message, and outputs to a container (if provided). 
 * @param ntb plugin instance
 * @param error error or message to display 
 * @param context {@link ScriptContext}
 * @param notes additional notes to display
 * @param containerEl optional output container
 */
export function displayScriptError(
    ntb: NoteToolbarPlugin, 
    error: unknown, 
    context?: ScriptContext, 
    notes?: string, 
    containerEl?: HTMLElement
) {
    const messageWithNotes = formatErrorMessage(error, notes);
    const noticeFr = new DocumentFragment();
    noticeFr.appendText(messageWithNotes);

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

    // add link to open item settings if item is provided
    if (context?.item) {
        const openItemFr = itemModalFr(ntb, context?.item);
        if (openItemFr) noticeFr.append('\n\n', openItemFr);
    }

    // show notice
    new Notice(noticeFr, 10000).containerEl.addClass('mod-warning');
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

function formatErrorMessage(error: unknown, notes?: string): string {
    const isError = error instanceof Error;
    const message = isError ? error.message : String(error);

    // truncate if necessary (Dataview puts full stack trace in error.message)
    const truncateMatch = message.match(/[\r\n]\s+at\b/);
    const messageTruncated = truncateMatch ? message.slice(0, truncateMatch.index) : message;

    const messageWithNotes = notes ? `${notes}\n\n${messageTruncated}` : messageTruncated;

    return messageWithNotes;
}

/**
 * Formats an expression for display (for error notices + console), by prepending and truncating if necessary.
 */
export function formatExpression(expression: string, maxLength = 250): string {
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
 * Returns a string representation of the provided {@link ScriptContext}.
 * @param context {@link ScriptContext}
 */
function formatScriptContext(ntb: NoteToolbarPlugin, context: ScriptContext): string {
    const { scriptFile, toolbar, item, component } = context;
    const itemText = item && formatScriptItem(ntb, item, context);

    if (component && toolbar && itemText) {
        return t('adapter.error.context.component', {
            component: component, toolbar: toolbar.name, item: itemText, 
        });
    }

    if (toolbar && itemText) {
        return t('adapter.error.context.toolbar-item', {
            toolbar: toolbar.name, item: itemText
        });
    }

    if (component && itemText) { return t('adapter.error.context.component-item', { component: component, item: itemText }); }

    if (component === 'callout') { return t('adapter.error.context.callout'); }
    if (itemText) { return t('adapter.error.context.item', { item: itemText }); }
    if (scriptFile) { return t('adapter.error.context.script', { script: scriptFile instanceof TFile ? scriptFile.path : scriptFile }); }
    
    return '';
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
 * Returns an error with additional context (sourceFile and optional notes), 
 * for diagnosing script evaluation errors.
 * 
 * @param ntb plugin instance
 * @param error the original error
 * @param sourceFile the script file where the error occurred
 * @param notes optional context to display with the source file
 */
export function getScriptError(
    ntb: NoteToolbarPlugin,
    error: unknown,
    sourceFile: TFile | string,
    notes?: string
): Error {
    const isError = error instanceof Error;
    const message = isError ? error.message : String(error);
    const name = isError ? error.name : 'Error';

    const uri = sourceFile instanceof TFile ? getFileUri(ntb, sourceFile) : sourceFile;

    const result = new Error(message);
    result.name = `${notes ?? ''}${uri}\n\n${name}`;

    const originalStack = isError
        ? error.stack?.split('\n').slice(1).join('\n')
        : undefined;

    result.stack = `${result.name}: ${message}${originalStack ? `\n${originalStack}` : ''}`;

    return result;
}

/**
 * Returns a `file://` URI for the given file, to provide a link for error messages.
 * 
 * @param ntb plugin instance
 * @param file TFile to get URI for
 * @returns 
 */
export function getFileUri(ntb: NoteToolbarPlugin, file: TFile) {
    const basePath = (ntb.app.vault.adapter as FileSystemAdapter).getBasePath();
    return `file://${encodeURI(`${basePath}/${file.path}`)}`;
}

/**
 * Outputs the provided script error based on provided {@link ErrorBehavior}.
 * 
 * @param ntb plugin instance
 * @param error error to handle
 * @param errorBehavior {@link ErrorBehavior}
 * @param expression script code to report
 * @param sourceFile the script file where the error occurred
 * @param containerEl optional container to output to
 * @returns 
 */
export function handleScriptError(
    ntb: NoteToolbarPlugin,
    error: unknown,
    expression: string,
    context: ScriptContext,
    containerEl?: HTMLElement
): string | undefined {
    if (!context) ntb.debug('⚠️ CONTEXT IS EMPTY') 
        else ntb.debug('CONTEXT', context, context.errorBehavior);

    const formattedContext = context ? formatScriptContext(ntb, context) : undefined;
    const formattedExpression = formatExpression(expression);

    const errorMessage = context?.scriptFile
        ? t('adapter.error.title') + t('adapter.error.exec-failed_context', {
            context: formattedContext,
            filename: context.scriptFile instanceof TFile ? getFileUri(ntb, context.scriptFile) : context.scriptFile,
            expression: formattedExpression
        })
        : context
            ? t('adapter.error.title') + t('adapter.error.expr-failed_context', {
                context: formattedContext,
                expression: formattedExpression
            })
            : t('adapter.error.title') + t('adapter.error.expr-failed', {
                expression: formattedExpression
            });

    switch (context.errorBehavior) {
        case ErrorBehavior.Display: 
            displayScriptError(ntb, error, context, errorMessage, containerEl);
            if (context?.scriptFile) {
                return t('adapter.error.general_file', {
                    filename: `[[${context.scriptFile instanceof TFile ? context.scriptFile.path : context.scriptFile}]]`,
                    error
                }) + '\n';
            }
            else {
                return t('adapter.error.general', { error }) + '\n';
            }
            
        // case ErrorBehavior.Display: {
        //     let errorMessage;
        //     if (context) {
        //         errorMessage = t('adapter.error.title') + t('adapter.error.expr-failed_context', { context: formatScriptContext(ntb, context), expression: displayExpression });
        //     }
        //     else {
        //         errorMessage = t('adapter.error.title') + t('adapter.error.expr-failed_item', { expression: displayExpression });
        //     }
        //     displayScriptError( error, errorMessage, containerEl );
        //     return t('adapter.error.general', { error }) + '\n';
        // }

        case ErrorBehavior.Report:
            displayScriptError(ntb, error, context, errorMessage, containerEl);
            // console.error(errorMessage, '\n\n', error);
            // new Notice(
            //     errorMessage + '\n\n' + formatErrorMessage(error),
            //     10000
            // ).containerEl.addClass('mod-warning');

            if (context?.scriptFile) {
                return t('adapter.error.general_file', {
                    filename: `[[${context.scriptFile instanceof TFile ? context.scriptFile.path : context.scriptFile}]]`,
                    error
                }) + '\n';
            }

            return undefined;

        // case ErrorBehavior.Inline: {
        //     let errorMessage;
        //     if (context) {
        //         errorMessage = t('adapter.error.title') + t('adapter.error.expr-failed_context', { context: formatScriptContext(ntb, context), expression: displayExpression });
        //     }
        //     else {
        //         errorMessage = t('adapter.error.title') + t('adapter.error.expr-failed_item', { expression: displayExpression });
        //     }
        //     console.error(errorMessage, '\n\n', error);
        //     new Notice(errorMessage + '\n\n' + String(error), 10000).containerEl.addClass('mod-warning');
        //     return undefined;
        // }

        // case ErrorBehavior.Report: {
        //     let errorMessage;
        //     if (context?.scriptFile) {
        //         errorMessage = t('adapter.error.title') + t('adapter.error.exec-failed_context', { context: formatScriptContext(ntb, context), filename: getFileUri(ntb, context?.scriptFile), expression: displayExpression });
        //         console.error(errorMessage, '\n\n', error);
        //         return t('adapter.error.general_file', { filename: `[[${context?.scriptFile.path}]]`, error }) + '\n';
        //     }
        //     else if (context) {
        //         errorMessage = t('adapter.error.title') + t('adapter.error.expr-failed_context', { context: formatScriptContext(ntb, context), expression: displayExpression });
        //     }
        //     else {
        //         errorMessage = t('adapter.error.title') + t('adapter.error.expr-failed', { expression: displayExpression });              
        //     }
        //     console.error(errorMessage, '\n\n', error);
        //     new Notice(errorMessage + '\n\n' + String(error), 10000).containerEl.addClass('mod-warning');
        //     return undefined;
        // }

        case ErrorBehavior.Console:
            console.error(errorMessage, '\n\n', error);
            return undefined;

        case ErrorBehavior.Ignore:
            // completely ignore messages, e.g. for toolbar updates it would be too noisy to output errors to console
            return undefined;
    }
}