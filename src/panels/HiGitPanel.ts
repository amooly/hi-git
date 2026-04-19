import * as vscode from 'vscode';
import { getNonce } from '../utilities/getNonce.js';

/**
 * Manages the full-window webview panel showing the Git graph.
 * Opened via the "Hi Git: Show Graph" command.
 */
export class HiGitPanel {
  public static currentPanel: HiGitPanel | undefined;
  public static readonly viewType = 'hi-git.graphPanel';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If a panel already exists, reveal it
    if (HiGitPanel.currentPanel) {
      HiGitPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Create a new webview panel
    const panel = vscode.window.createWebviewPanel(
      HiGitPanel.viewType,
      'Hi Git',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'frontend'),
          vscode.Uri.joinPath(extensionUri, 'media'),
        ],
      }
    );

    HiGitPanel.currentPanel = new HiGitPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Set the webview's HTML content
    this._update();

    // Clean up when the panel is closed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Update content when the panel becomes visible again
    this._panel.onDidChangeViewState(
      () => {
        if (this._panel.visible) {
          this._update();
        }
      },
      null,
      this._disposables
    );
  }

  public dispose() {
    HiGitPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) {
        d.dispose();
      }
    }
  }

  private _update() {
    this._panel.webview.html = this._getWebviewContent(this._panel.webview);
  }

  private _getWebviewContent(webview: vscode.Webview): string {
    // --- CSS ---
    const stylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'frontend', 'styles.css')
    );

    // --- React vendor (UMD builds) ---
    const reactUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'vendor', 'react.production.min.js')
    );
    const reactDomUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'vendor', 'react-dom.production.min.js')
    );

    // --- App scripts (non-JSX, loaded directly from frontend/) ---
    const dataUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'frontend', 'data.js')
    );
    const graphUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'frontend', 'graph.js')
    );

    // --- Transpiled JSX → JS (from media/webview/) ---
    const networkUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'webview', 'network.js')
    );
    const panelUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'webview', 'panel.js')
    );
    const appUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'webview', 'app.js')
    );

    const nonce = getNonce();

    return /* html */ `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="
        default-src 'none';
        style-src ${webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com;
        font-src ${webview.cspSource} https://fonts.gstatic.com;
        script-src 'nonce-${nonce}';
        img-src ${webview.cspSource};
    ">
    <link rel="stylesheet" href="${stylesUri}">
    <title>Hi Git</title>
</head>
<body>
    <div id="root"></div>

    <!-- React runtime (UMD — exposes window.React, window.ReactDOM) -->
    <script nonce="${nonce}" src="${reactUri}"></script>
    <script nonce="${nonce}" src="${reactDomUri}"></script>

    <!-- App data & utilities -->
    <script nonce="${nonce}" src="${dataUri}"></script>
    <script nonce="${nonce}" src="${graphUri}"></script>

    <!-- React components (transpiled from JSX) -->
    <script nonce="${nonce}" src="${networkUri}"></script>
    <script nonce="${nonce}" src="${panelUri}"></script>
    <script nonce="${nonce}" src="${appUri}"></script>
</body>
</html>`;
  }
}
