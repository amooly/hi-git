import { execSync, exec } from 'child_process';
import * as vscode from 'vscode';
import { getNonce } from '../utilities/getNonce.js';
import { SidebarRenderer } from '../utilities/SidebarRenderer.js';
import { gitDataService } from '../services/GitDataService.js';
import { GraphPanel } from './GraphPanel.js';
import { PIN_SVG } from '../constants/icons.js';

/**
 * Sidebar webview provider for the Hi Git activity bar panel.
 * Shows a compact branch overview with a button to open the full graph.
 */
export class BranchProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'hi-git.sidebarView';

    private _view?: vscode.WebviewView;
    private _disposables: vscode.Disposable[] = [];
    private _refreshTimer?: ReturnType<typeof setTimeout>;

    constructor(private readonly _extensionUri: vscode.Uri) { }

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

        webviewView.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case 'showGraph':
                    vscode.commands.executeCommand('hi-git.showGraph');
                    break;
                case 'refresh':
                    this.refresh();
                    break;
                case 'pullBranch':
                    this._pullBranch(message.branch, message.isCurrent);
                    break;
                case 'checkoutBranch':
                    this._checkoutBranch(message.branch);
                    break;
                case 'pinpointTag':
                    this._pinpointTag(message.tag);
                    break;
            }
        });

        const scheduleRefresh = () => {
            clearTimeout(this._refreshTimer);
            this._refreshTimer = setTimeout(() => this.refresh(), 300);
        };

        // Watch .git/HEAD for branch switches (checkout, etc.)
        const headWatcher = vscode.workspace.createFileSystemWatcher('**/.git/HEAD');
        headWatcher.onDidChange(scheduleRefresh, null, this._disposables);

        // Watch .git/refs/** for branch create/delete/update
        const refsWatcher = vscode.workspace.createFileSystemWatcher('**/.git/refs/**');
        refsWatcher.onDidCreate(scheduleRefresh, null, this._disposables);
        refsWatcher.onDidChange(scheduleRefresh, null, this._disposables);
        refsWatcher.onDidDelete(scheduleRefresh, null, this._disposables);

        // Watch packed-refs, updated by fetch/gc instead of individual ref files
        const packedRefsWatcher = vscode.workspace.createFileSystemWatcher('**/.git/packed-refs');
        packedRefsWatcher.onDidChange(scheduleRefresh, null, this._disposables);

        this._disposables.push(
            headWatcher,
            refsWatcher,
            packedRefsWatcher,
            vscode.workspace.onDidChangeWorkspaceFolders(() => this.refresh()),
        );

        webviewView.onDidDispose(() => {
            clearTimeout(this._refreshTimer);
            this._disposables.forEach(d => d.dispose());
            this._disposables = [];
        });
    }

    public refresh(): void {
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
        }
    }

    private _cwd(): string {
        return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
    }

    public pinpointCurrentCommit(): void {
        const sha = gitDataService.getHeadShortSha();
        if (!sha) return;

        const graphAlreadyOpen = !!GraphPanel.currentPanel;
        vscode.commands.executeCommand('hi-git.showGraph');
        // If the panel was just created it needs time to render before it can receive messages.
        setTimeout(() => GraphPanel.currentPanel?.revealCommit(sha), graphAlreadyOpen ? 0 : 600);
    }

    private _pinpointTag(tag: string): void {
        const sha = gitDataService.getTagShortSha(tag);
        if (!sha) {
            vscode.window.showWarningMessage(`Could not resolve tag '${tag}' to a commit.`);
            return;
        }
        const graphAlreadyOpen = !!GraphPanel.currentPanel;
        vscode.commands.executeCommand('hi-git.showGraph');
        setTimeout(() => GraphPanel.currentPanel?.revealCommit(sha), graphAlreadyOpen ? 0 : 600);
    }

    private _pullBranch(branch: string, isCurrent: boolean): void {
        const cwd = this._cwd();
        const cmd = isCurrent ? 'git pull' : `git fetch origin ${branch}:${branch}`;
        vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: `Pulling ${branch}…`, cancellable: false },
            () => new Promise<void>(resolve => {
                exec(cmd, { cwd, timeout: 60_000 }, (err, _stdout, stderr) => {
                    if (err) {
                        vscode.window.showErrorMessage(`Pull failed: ${stderr.trim() || err.message}`);
                    } else {
                        vscode.window.showInformationMessage(`Pulled ${branch} successfully.`);
                        this.refresh();
                    }
                    resolve();
                });
            })
        );
    }

    private _checkoutBranch(branch: string): void {
        const cwd = this._cwd();
        try {
            execSync(`git checkout ${branch}`, { cwd, encoding: 'utf8', timeout: 15_000 });
            vscode.window.showInformationMessage(`Switched to branch '${branch}'.`);
            this.refresh();
        } catch (e: any) {
            const msg = e.stderr?.toString().trim() || e.message || 'unknown error';
            vscode.window.showErrorMessage(`Checkout failed: ${msg}`);
        }
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
            user-select: none;
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
            position: relative;
        }
        .tag-item:hover {
            background: var(--vscode-list-hoverBackground);
        }

        .tag-icon {
            font-size: 12px;
            opacity: 0.7;
        }

        .tag-name {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .pin-btn {
            display: none;
            align-items: center;
            justify-content: center;
            margin-left: auto;
            flex-shrink: 0;
            padding: 2px;
            background: none;
            border: none;
            cursor: pointer;
            line-height: 1;
            border-radius: 3px;
            color: var(--vscode-foreground);
            opacity: 0.75;
            transition: opacity 80ms ease, background 80ms ease;
        }
        .tag-item:hover .pin-btn {
            display: flex;
        }
        .pin-btn:hover {
            opacity: 1;
            background: var(--vscode-toolbar-hoverBackground, rgba(255,255,255,0.1));
        }

        /* Tags fold toggle */
        .section-header {
            display: flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
            user-select: none;
            margin-bottom: 8px;
        }
        .section-header:hover .section-title {
            color: var(--vscode-foreground);
        }
        /* Suppress the standalone margin-bottom when title sits in a flex header row */
        .section-header .section-title {
            margin-bottom: 0;
        }
        .fold-arrow {
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
            transition: transform 150ms ease;
            display: inline-block;
        }
        .fold-arrow.open {
            transform: rotate(90deg);
        }
        .collapsible-body {
            overflow: hidden;
        }
        .collapsible-body.collapsed {
            display: none;
        }

        .empty-state {
            text-align: center;
            padding: 24px 16px;
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
            line-height: 1.5;
        }

        /* Context menu */
        .ctx-menu {
            position: fixed;
            z-index: 1000;
            min-width: 140px;
            padding: 4px 0;
            background: var(--vscode-menu-background);
            border: 1px solid var(--vscode-menu-border, var(--vscode-widget-border));
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: none;
        }
        .ctx-menu.visible {
            display: block;
        }
        .ctx-item {
            padding: 6px 16px;
            font-size: 12px;
            color: var(--vscode-menu-foreground);
            cursor: pointer;
            white-space: nowrap;
        }
        .ctx-item:hover {
            background: var(--vscode-menu-selectionBackground);
            color: var(--vscode-menu-selectionForeground);
        }
    </style>
</head>
<body>
    <div class="sidebar-container">
        <button class="open-graph-btn" id="openGraph">
            ${PIN_SVG} Show Full Graph
        </button>

        <div>
            <div class="section-title">Local Branches</div>
            <ul class="branch-list">
                ${SidebarRenderer.branchItems(gitDataService.getBranchSummary())}
            </ul>
        </div>

        <div>
            <div class="section-header" id="tagsHeader" aria-expanded="false">
                <span class="fold-arrow" id="tagsArrow">&#9654;</span>
                <span class="section-title">Tags</span>
            </div>
            <div class="collapsible-body collapsed" id="tagsBody">
                <ul class="tag-list">
                    ${SidebarRenderer.tagItems(gitDataService.getTagSummary())}
                </ul>
            </div>
        </div>
    </div>

    <!-- Branch context menu -->
    <div class="ctx-menu" id="ctxMenu">
        <div class="ctx-item" id="ctxPull">Pull</div>
        <div class="ctx-item" id="ctxCheckout">Checkout</div>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();

        // Header action
        document.getElementById('openGraph').addEventListener('click', () => {
            vscode.postMessage({ command: 'showGraph' });
        });

        // Tags fold toggle
        const tagsHeader = document.getElementById('tagsHeader');
        const tagsBody   = document.getElementById('tagsBody');
        const tagsArrow  = document.getElementById('tagsArrow');
        tagsHeader.addEventListener('click', () => {
            const isOpen = !tagsBody.classList.contains('collapsed');
            tagsBody.classList.toggle('collapsed', isOpen);
            tagsArrow.classList.toggle('open', !isOpen);
            tagsHeader.setAttribute('aria-expanded', String(!isOpen));
        });

        // Pin-point buttons on tag items
        document.querySelectorAll('.pin-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const tag = btn.dataset.tag;
                if (tag) vscode.postMessage({ command: 'pinpointTag', tag });
            });
        });

        // Branch context menu
        const ctxMenu = document.getElementById('ctxMenu');
        let ctxBranch = null;
        let ctxIsCurrent = false;

        document.querySelectorAll('.branch-item').forEach(item => {
            item.addEventListener('contextmenu', e => {
                e.preventDefault();
                ctxBranch = item.dataset.branch;
                ctxIsCurrent = item.dataset.current === 'true';

                document.getElementById('ctxCheckout').style.display = ctxIsCurrent ? 'none' : '';

                // Position, keeping menu on screen
                const menuW = 160, menuH = ctxIsCurrent ? 36 : 68;
                const x = Math.min(e.clientX, window.innerWidth - menuW - 4);
                const y = Math.min(e.clientY, window.innerHeight - menuH - 4);
                ctxMenu.style.left = x + 'px';
                ctxMenu.style.top  = y + 'px';
                ctxMenu.classList.add('visible');
            });
        });

        document.getElementById('ctxPull').addEventListener('click', () => {
            if (ctxBranch) vscode.postMessage({ command: 'pullBranch', branch: ctxBranch, isCurrent: ctxIsCurrent });
            ctxMenu.classList.remove('visible');
        });

        document.getElementById('ctxCheckout').addEventListener('click', () => {
            if (ctxBranch) vscode.postMessage({ command: 'checkoutBranch', branch: ctxBranch });
            ctxMenu.classList.remove('visible');
        });

        const closeMenu = () => ctxMenu.classList.remove('visible');
        document.addEventListener('click', closeMenu);
        document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
        document.addEventListener('scroll', closeMenu, true);
    </script>
</body>
</html>`;
    }

}
