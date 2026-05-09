import * as vscode from 'vscode';
import { getNonce } from '@utilities/getNonce.js';
import { gitDataService } from '@services/GitDataService.js';
import { HiGitDetailsProvider } from './HiGitDetailsProvider.js';

/**
 * Manages the full-window webview panel showing the Git graph.
 * Opened via the "Hi Git: Show Graph" command.
 */
export class HiGitPanel {
  public static currentPanel: HiGitPanel | undefined;
  public static readonly viewType = 'hi-git.graphPanel';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _detailsProvider?: HiGitDetailsProvider;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri, detailsProvider?: HiGitDetailsProvider) {
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
          vscode.Uri.joinPath(extensionUri, 'src', 'webview'),
          vscode.Uri.joinPath(extensionUri, 'media'),
        ],
      }
    );

    HiGitPanel.currentPanel = new HiGitPanel(panel, extensionUri, detailsProvider);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, detailsProvider?: HiGitDetailsProvider) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._detailsProvider = detailsProvider;

    // Set the webview's HTML content
    this._update();

    // Forward commit selections to the details sidebar
    this._panel.webview.onDidReceiveMessage(
      (message) => {
        if (message.type === 'commitSelected' && this._detailsProvider) {
          this._detailsProvider.showCommit(message.payload?.commit, message.payload?.branch);
        }
      },
      null,
      this._disposables
    );

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
    const stylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'styles.css')
    );
    const reactUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'vendor', 'react.production.min.js')
    );
    const reactDomUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'vendor', 'react-dom.production.min.js')
    );
    const graphUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'graph.js')
    );
    const vscodeApiUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'webview', 'vscodeApi.js')
    );
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
    // Escape </script> sequences so the inlined JSON cannot break the script tag
    const repoDataJson = JSON.stringify(gitDataService.getRepoData())
      .replace(/<\/script>/gi, '<\\/script>');

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

    <!-- Repo data from GitDataService (replaces static data.js) -->
    <script nonce="${nonce}">window.GITNEXUS_DATA = ${repoDataJson};</script>

    <!-- VSCode API Wrapper (exposes window.vscodeAPI) -->
    <script nonce="${nonce}" src="${vscodeApiUri}"></script>

    <!-- Graph layout utility -->
    <script nonce="${nonce}" src="${graphUri}"></script>

    <!-- React components (transpiled from JSX) -->
    <script nonce="${nonce}" src="${networkUri}"></script>
    <script nonce="${nonce}" src="${panelUri}"></script>
    <script nonce="${nonce}" src="${appUri}"></script>
</body>
</html>`;
  }
}
