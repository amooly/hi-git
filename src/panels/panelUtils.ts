import * as vscode from 'vscode';
import { getNonce } from '../webview/common';

export function getWebviewContent(webview: vscode.Webview, scriptUri: vscode.Uri): string {
    // Use a nonce to whitelist which scripts can be run
    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
				<title>Hi Git Graph</title>
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
