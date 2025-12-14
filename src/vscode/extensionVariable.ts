import * as vscode from 'vscode';

class _extensionVariables {
    globalExtensionUri: vscode.Uri | undefined;
    globalExtensionPath: string | undefined;
}

export function InitExtensionVariables(context: vscode.ExtensionContext) {
    ExtensionVariables = new _extensionVariables();
    ExtensionVariables.globalExtensionUri = context.extensionUri;
    ExtensionVariables.globalExtensionPath = context.extensionUri.fsPath;
}

export let ExtensionVariables: _extensionVariables;