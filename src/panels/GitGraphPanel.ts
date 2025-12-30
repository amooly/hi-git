import * as path from 'path';
import * as vscode from 'vscode';
import { performComparison } from '../commands/compareWith';
import { ExtensionMessageType, WebviewMessageType } from '../const_def/messages';
import { gitService } from '../service/gitService';
import { ExtensionVariables } from '../vscode/extensionVariable';
import { getWebviewContent } from './panelUtils';

export class GitGraphPanel {
    public static currentPanel: GitGraphPanel | undefined;
    public static readonly viewType = 'hiGitGraph';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _workspacePath: string;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri) {
        if (!vscode.workspace.workspaceFolders?.length) {
            vscode.window.showErrorMessage('Git Graph requires an open workspace folder');
            return;
        }

        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (GitGraphPanel.currentPanel) {
            GitGraphPanel.currentPanel._panel.reveal(column);
            GitGraphPanel.currentPanel._update();
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            GitGraphPanel.viewType,
            'Hi Git Graph',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.file(path.join(ExtensionVariables.globalExtensionPath!, 'dist'))],
                retainContextWhenHidden: true // Keep state even when not visible. make it possible keep unchanged when switching panels.
            }
        );

        GitGraphPanel.currentPanel = new GitGraphPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._workspacePath = vscode.workspace.workspaceFolders![0].uri.fsPath;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => this._handleWebviewMessage(message),
            null,
            this._disposables
        );
    }

    public dispose() {
        GitGraphPanel.currentPanel = undefined;
        this._panel.dispose();
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.title = 'Git Graph';
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Local path to main script run in the webview
        const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.js');

        // And the uri we use to load this script in the webview
        const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

        return getWebviewContent(webview, scriptUri);
    }

    private _handleWebviewMessage(message: any) {
        try {
            switch (message.command) {
                case WebviewMessageType.GET_LOG:
                    this._getLog(message.data?.skip, message.data?.filters);
                    return;
                case WebviewMessageType.QUERY_META_DATA:
                    this._queryMetaData();
                    return;
                case WebviewMessageType.SHOW_COMMIT_DETAILS:
                    this._handleShowCommitDetails(message.data?.commitHash, message.data?.focusView || false);
                    return;
                case WebviewMessageType.COMPARE_WITH:
                    this._handleCompareWith(message.data);
                    return;
                case WebviewMessageType.REVERT_COMMIT:
                    this._handleRevertCommit(message.data);
                    return;
                case WebviewMessageType.CHECKOUT_COMMIT:
                    this._handleCheckoutCommit(message.data);
                    return;
                case WebviewMessageType.REFRESH:
                    this._panel.webview.postMessage({ command: ExtensionMessageType.REFRESH });
                    return;
                case WebviewMessageType.ERROR:
                    vscode.window.showErrorMessage('Webview error: ' + message.data.message);
                    console.error('Webview error:', message.data);
                    return;
                case WebviewMessageType.LOG:
                    console.log('Webview log:', message.data);
                    return;
            }
        } catch (error: any) {
            vscode.window.showErrorMessage('Error handling webview message. Command: ' + message.command + '. Error: ' + error.message);
        }
    }

    private async _getLog(skip: number = 0, filters?: { branches?: string[], authors?: string[] }) {
        const log = await gitService.getLog(this._workspacePath, '', skip, 100, filters);
        this._panel.webview.postMessage({ command: ExtensionMessageType.SET_LOG, data: log, skip });
    }

    private async _queryMetaData() {
        const metaData = await gitService.queryMetaData(this._workspacePath);
        this._panel.webview.postMessage({ command: ExtensionMessageType.SET_META_DATA, data: metaData });
    }

    private async _handleShowCommitDetails(commitHash: string, focusView: boolean) {
        await vscode.commands.executeCommand('hi-git.showCommitDetails', commitHash, this._workspacePath, focusView);
    }

    private _handleCompareWith(commitHash: string) {
        const workspaceUri = vscode.workspace.workspaceFolders?.[0]?.uri;
        if (workspaceUri) {
            performComparison(workspaceUri, commitHash);
        }
    }

    private async _handleRevertCommit(commitHash: string) {
        try {
            await gitService.revertCommit(this._workspacePath, commitHash);
            vscode.window.showInformationMessage(`Reverted commit ${commitHash}`);
            this._panel.webview.postMessage({ command: ExtensionMessageType.REFRESH });
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to revert commit: ${error.message}`);
        }
    }

    private async _handleCheckoutCommit(commitHash: string) {
        try {
            await gitService.checkoutCommit(this._workspacePath, commitHash);
            vscode.window.showInformationMessage(`Checked out commit ${commitHash}`);
            this._panel.webview.postMessage({ command: ExtensionMessageType.REFRESH });
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to checkout commit: ${error.message}`);
        }
    }

}

