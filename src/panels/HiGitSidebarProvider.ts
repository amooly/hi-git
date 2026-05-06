import * as vscode from 'vscode';
import { getNonce } from '../utilities/getNonce.js';
import { SidebarRenderer } from '../utilities/SidebarRenderer.js';
import { gitDataService } from '../services/GitDataService.js';

/**
 * Sidebar webview provider for the Hi Git activity bar panel.
 * Shows a compact branch overview with a button to open the full graph.
 */
export class HiGitSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'hi-git.sidebarView';

  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the sidebar webview
    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case 'showGraph':
          vscode.commands.executeCommand('hi-git.showGraph');
          break;
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = getNonce();

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="
        default-src 'none';
        style-src ${webview.cspSource} 'unsafe-inline';
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

        .sidebar-container {
            padding: 12px 16px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .open-graph-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            width: 100%;
            padding: 8px 12px;
            border: none;
            border-radius: 4px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            font-family: inherit;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: background 120ms ease;
        }
        .open-graph-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .section-title {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 8px;
        }

        .branch-list {
            list-style: none;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .branch-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-family: var(--vscode-editor-font-family, monospace);
            cursor: default;
        }
        .branch-item:hover {
            background: var(--vscode-list-hoverBackground);
        }
        .branch-item.current {
            background: var(--vscode-list-activeSelectionBackground);
            color: var(--vscode-list-activeSelectionForeground);
        }

        .branch-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            flex-shrink: 0;
        }

        .branch-meta {
            margin-left: auto;
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }

        .tag-list {
            list-style: none;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .tag-item {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-family: var(--vscode-editor-font-family, monospace);
            cursor: default;
        }
        .tag-item:hover {
            background: var(--vscode-list-hoverBackground);
        }

        .tag-icon {
            font-size: 12px;
            opacity: 0.7;
        }

        .empty-state {
            text-align: center;
            padding: 24px 16px;
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
            line-height: 1.5;
        }
    </style>
</head>
<body>
    <div class="sidebar-container">
        <button class="open-graph-btn" id="openGraph">
            ◇ Show Full Graph
        </button>

        <div>
            <div class="section-title">Branches</div>
            <ul class="branch-list">
                ${SidebarRenderer.branchItems(gitDataService.getBranchSummary())}
            </ul>
        </div>

        <div>
            <div class="section-title">Tags</div>
            <ul class="tag-list">
                ${SidebarRenderer.tagItems(gitDataService.getTagSummary())}
            </ul>
        </div>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();

        document.getElementById('openGraph').addEventListener('click', () => {
            vscode.postMessage({ command: 'showGraph' });
        });
    </script>
</body>
</html>`;
  }

}
