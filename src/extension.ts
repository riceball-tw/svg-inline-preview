import * as vscode from 'vscode';

let decorations: vscode.TextEditorDecorationType[] = [];

export function activate(context: vscode.ExtensionContext) {
    let debounceTimer: NodeJS.Timeout;

    vscode.workspace.onDidChangeTextDocument(event => {
        const editor = vscode.window.activeTextEditor;
        if (editor && event.document === editor.document) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                updateDecorations(editor);
            }, 0);
        }
    }, null, context.subscriptions);

    vscode.window.onDidChangeActiveTextEditor(updateDecorations, null, context.subscriptions);
    vscode.window.onDidChangeActiveColorTheme(updateAllDecorations, null, context.subscriptions);

    updateAllDecorations();
}

function updateAllDecorations() {
    vscode.window.visibleTextEditors.forEach(editor => {
        updateDecorations(editor);
    });
}

function updateDecorations(editor?: vscode.TextEditor) {
    if (!editor) {
        return;
    }

    const document = editor.document;

    decorations.forEach(decoration => {
        decoration.dispose();
    });
    decorations = [];

    const text = document.getText();
    const svgRegex = /<svg\b[^>]*>([\s\S]*?)<\/svg>/gi;
    let match;

    while ((match = svgRegex.exec(text)) !== null) {
        const startPos = document.positionAt(match.index);
        const svgContent = match[0];

        const backgroundColor = vscode.workspace.getConfiguration('svg-inline-preview').get('backgroundColor', '#F5F5F5');

        const styledSvgContent = svgContent.replace(
            /(<svg\b[^>]*>)/,
            `$1<style>svg{background-color:${backgroundColor};}</style>`,
        );

        const encodedSVG = encodeURIComponent(styledSvgContent.replace(/\s+/g, ' '));
        const dataUrl = `data:image/svg+xml;charset=utf-8,${encodedSVG}`;

        const decorationType = vscode.window.createTextEditorDecorationType({
            gutterIconPath: vscode.Uri.parse(dataUrl),
            gutterIconSize: 'contain'
        });
        decorations.push(decorationType);

        const range = new vscode.Range(startPos, startPos);
        editor.setDecorations(decorationType, [{ range }]);
    }
}

export function deactivate() {
    decorations.forEach(decoration => {
        decoration.dispose();
    });
}
