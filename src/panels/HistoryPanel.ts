import * as vscode from 'vscode';
import * as path from 'path';
import { performComparison } from '../commands/compareWith';
import { gitService } from '../git/gitService';

export class HistoryPanel {
    public static currentPanel: HistoryPanel | undefined;
    public static readonly viewType = 'hiGitHistory';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _targetUri: vscode.Uri | undefined;

    public static createOrShow(extensionUri: vscode.Uri, targetUri?: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (HistoryPanel.currentPanel) {
            HistoryPanel.currentPanel._targetUri = targetUri;
            HistoryPanel.currentPanel._panel.reveal(column);
            HistoryPanel.currentPanel._update();
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            HistoryPanel.viewType,
            'Git History',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.file(path.join(extensionUri.fsPath, 'dist'))]
            }
        );

        HistoryPanel.currentPanel = new HistoryPanel(panel, extensionUri, targetUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, targetUri?: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._targetUri = targetUri;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'getLog':
                        this._getLog(message.data?.skip, message.data?.filters);
                        return;
                    case 'getBranches':
                        this._getBranches();
                        return;
                    case 'getBranchHeads':
                        this._getBranchHeads();
                        return;
                    case 'getAuthors':
                        this._getAuthors();
                        return;
                    case 'error':
                        vscode.window.showErrorMessage('Webview error: ' + message.data.message);
                        console.error('Webview error:', message.data);
                        return;
                    case 'log':
                        console.log('Webview log:', message.data);
                        return;
                    case 'showCommitDetails':
                        this._handleShowCommitDetails(message.data);
                        return;
                    case 'compareWith':
                        this._handleCompareWith(message.data);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    private async _getLog(skip: number = 0, filters?: { branches?: string[], authors?: string[] }) {
        const { cwd, filePath } = await this._resolveCwdAndFilePath();

        if (!cwd) {
            return;
        }

        try {
            const log = await gitService.getLog(cwd, filePath, skip, 100, filters);
            this._panel.webview.postMessage({ command: 'setLog', data: log, skip });
        } catch (error: any) {
            vscode.window.showErrorMessage('Error fetching git log: ' + error.message);
        }
    }

    private async _getBranches() {
        const cwd = await this._resolveCwd();
        if (!cwd) {
            return;
        }

        try {
            const branches = await gitService.getBranches(cwd);
            this._panel.webview.postMessage({ command: 'setBranches', data: branches });
        } catch (error: any) {
            console.error('Error fetching branches:', error);
        }
    }

    private async _getBranchHeads() {
        const cwd = await this._resolveCwd();
        if (!cwd) {
            return;
        }

        try {
            const branchHeads = await gitService.getBranchHeads(cwd);
            this._panel.webview.postMessage({ command: 'setBranchHeads', data: branchHeads });
        } catch (error: any) {
            console.error('Error fetching branch heads:', error);
        }
    }

    private async _getAuthors() {
        const cwd = await this._resolveCwd();
        if (!cwd) {
            return;
        }

        try {
            const authors = await gitService.getAuthors(cwd);
            this._panel.webview.postMessage({ command: 'setAuthors', data: authors });
        } catch (error: any) {
            console.error('Error fetching authors:', error);
        }
    }

    private async _resolveCwd(): Promise<string | undefined> {
        if (!this._targetUri) {
            return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        }

        try {
            const stat = await vscode.workspace.fs.stat(this._targetUri);
            return stat.type === vscode.FileType.Directory
                ? this._targetUri.fsPath
                : path.dirname(this._targetUri.fsPath);
        } catch (e) {
            return path.dirname(this._targetUri.fsPath);
        }
    }

    private async _resolveCwdAndFilePath(): Promise<{ cwd: string | undefined; filePath: string }> {
        if (!this._targetUri) {
            return {
                cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
                filePath: ''
            };
        }

        try {
            const stat = await vscode.workspace.fs.stat(this._targetUri);
            if (stat.type === vscode.FileType.File) {
                return {
                    cwd: path.dirname(this._targetUri.fsPath),
                    filePath: this._targetUri.fsPath
                };
            }
            return { cwd: this._targetUri.fsPath, filePath: '' };
        } catch (e) {
            return { cwd: path.dirname(this._targetUri.fsPath), filePath: '' };
        }
    }

    private async _handleShowCommitDetails(commitHash: string) {
        const cwd = await this._resolveCwd();
        if (cwd) {
            vscode.commands.executeCommand('hi-git.showCommitDetails', commitHash, cwd);
        }
    }

    private async _handleCompareWith(commitHash: string) {
        const uri = await this._resolveTargetUri();
        if (uri) {
            performComparison(uri, commitHash);
        }
    }

    private async _resolveTargetUri(): Promise<vscode.Uri | undefined> {
        return this._targetUri ?? vscode.workspace.workspaceFolders?.[0]?.uri;
    }

    public dispose() {
        HistoryPanel.currentPanel = undefined;
        this._panel.dispose();
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.title = this._targetUri ? `History: ${path.basename(this._targetUri.fsPath)}` : 'Git History';
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Local path to main script run in the webview
        const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'dist', 'historyView.js');

        // And the uri we use to load this script in the webview
        const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

        // Use a nonce to whitelist which scripts can be run
        const nonce = getNonce();

        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
				<title>Hi Git History</title>
			</head>
			<body>
				<div id="root"></div>
                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    window.onerror = function(message, source, lineno, colno, error) {
                        vscode.postMessage({
                            command: 'error',
                            data: { message, source, lineno, colno, error: error ? error.stack : null }
                        });
                    };
                </script>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
