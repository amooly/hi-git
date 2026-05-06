import * as vscode from 'vscode';
import { getNonce } from '../utilities/getNonce.js';

export class HiGitDetailsProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'hi-git.detailsView';

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    const nonce = getNonce();

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="
        default-src 'none';
        style-src ${webviewView.webview.cspSource} 'unsafe-inline';
        script-src 'nonce-${nonce}';
    ">
    <style>
        body {
            padding: 0;
            margin: 0;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
        }
    </style>
</head>
<body>
    <script nonce="${nonce}">/* placeholder */</script>
</body>
</html>`;
  }
}
