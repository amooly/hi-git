import * as vscode from 'vscode';
import { getNonce } from '@utilities/getNonce.js';
import { gitDataService } from '@services/GitDataService.js';
import { DetailProvider } from './DetailProvider.js';
import { CompareProvider } from './CompareProvider.js';
import { MessageHandler } from '@utilities/MessageHandler.js';

/**
 * Manages the full-window webview panel showing the Git graph.
 * Opened via the "Hi Git: Show Graph" command.
 */
export class GraphPanel {
  public static currentPanel: GraphPanel | undefined;
  public static readonly viewType = 'hi-git.graphPanel';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _detailsProvider?: DetailProvider;
  private readonly _compareProvider?: CompareProvider;
  private _disposables: vscode.Disposable[] = [];
  private _messageHandler: MessageHandler;

  public static createOrShow(extensionUri: vscode.Uri, detailsProvider?: DetailProvider, compareProvider?: CompareProvider) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If a panel already exists, reveal it
    if (GraphPanel.currentPanel) {
      GraphPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Create a new webview panel
    const panel = vscode.window.createWebviewPanel(
      GraphPanel.viewType,
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

    GraphPanel.currentPanel = new GraphPanel(panel, extensionUri, detailsProvider, compareProvider);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, detailsProvider?: DetailProvider, compareProvider?: CompareProvider) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._detailsProvider = detailsProvider;
    this._compareProvider = compareProvider;

    this._messageHandler = new MessageHandler(this._panel.webview, this._disposables);

    this._messageHandler.registerHandler('getRepoData', async () => {
      return gitDataService.getRepoData();
    });

    // Set the webview's HTML content
    this._update();

    // Forward commit selections and compare requests to sidebar providers
    this._panel.webview.onDidReceiveMessage(
      (message) => {
        if (message.type === 'commitSelected' && this._detailsProvider) {
          this._detailsProvider.showCommit(message.payload?.commit, message.payload?.branch, false);
        }
        if (message.type === 'commitReveal' && this._detailsProvider) {
          this._detailsProvider.showCommit(message.payload?.commit, message.payload?.branch, true);
        }
        if (message.type === 'compareWithLocal' && this._compareProvider) {
          const { sha } = message.payload ?? {};
          if (sha) {
            const diff = gitDataService.getCommitDiffWithLocal(sha);
            this._compareProvider.showLocalDiff(diff.sha, diff.message, diff.files);
            vscode.commands.executeCommand(`${CompareProvider.viewType}.focus`);
          }
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

  public revealCommit(sha: string): void {
    this._panel.webview.postMessage({ type: 'revealCommit', sha });
  }

  public dispose() {
    GraphPanel.currentPanel = undefined;
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
      vscode.Uri.joinPath(this._extensionUri, 'media', 'webview', 'styles.css')
    );
    const vscodeApiUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'webview', 'vscodeApi.js')
    );
    const panelBundleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'webview', 'panel-bundle.js')
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

    <!-- VSCode API Wrapper (exposes window.vscodeAPI) -->
    <script nonce="${nonce}" src="${vscodeApiUri}"></script>

    <!-- React components (bundled from JSX) -->
    <script nonce="${nonce}" src="${panelBundleUri}"></script>
</body>
</html>`;
  }
}
