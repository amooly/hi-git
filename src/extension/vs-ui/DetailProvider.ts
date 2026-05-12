import * as vscode from 'vscode';
import { getNonce } from '../utilities/getNonce.js';
import type { CommitData, BranchData } from '@shared/types/git.js';

export class DetailProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'hi-git.detailsView';

    private _view?: vscode.WebviewView;

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

        webviewView.webview.html = this._getHtml(webviewView.webview);
    }

    public showCommit(commit: CommitData, branch: BranchData, reveal = false) {
        if (this._view) {
            if (reveal) {
                this._view.show(false); // unfold and focus
            }
            this._view.webview.postMessage({ type: 'showCommit', commit, branch });
        }
    }

    private _getHtml(webview: vscode.Webview): string {
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
        * { box-sizing: border-box; }
        body {
            padding: 0;
            margin: 0;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-sideBar-background, var(--vscode-editor-background));
        }
        #placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100px;
            gap: 6px;
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
        }
        #detail {
            padding: 10px 12px;
            display: none;
            flex-direction: column;
        }
        .detail-header {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 8px;
            flex-wrap: wrap;
        }
        .sha-pill {
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 11px;
            background: var(--vscode-textCodeBlock-background, rgba(128,128,128,0.1));
            border: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.2));
            border-radius: 4px;
            padding: 1px 6px;
        }
        .date-text {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }
        .commit-msg {
            font-size: 12px;
            font-weight: 600;
            line-height: 1.5;
            margin-bottom: 10px;
            white-space: pre-wrap;
            word-break: break-word;
        }
        .detail-section {
            border-top: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.2));
            padding: 8px 0;
        }
        .detail-row {
            display: flex;
            gap: 8px;
            font-size: 11px;
            margin-bottom: 5px;
            align-items: flex-start;
        }
        .detail-row:last-child { margin-bottom: 0; }
        .lbl {
            min-width: 52px;
            color: var(--vscode-descriptionForeground);
            flex-shrink: 0;
            padding-top: 1px;
        }
        .val {
            flex: 1;
            overflow: hidden;
            word-break: break-all;
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            align-items: center;
        }
        .branch-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            display: inline-block;
            flex-shrink: 0;
        }
        .branch-name {
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 11px;
        }
        .ref-badge {
            font-size: 10px;
            padding: 1px 5px;
            border-radius: 3px;
            border: 1px solid rgba(128,128,128,0.35);
            background: rgba(128,128,128,0.1);
            display: inline-flex;
            align-items: center;
            gap: 3px;
            white-space: nowrap;
        }
        .ref-remote { border-color: rgba(42,170,100,0.5); background: rgba(42,170,100,0.1); color: #4c9; }
        .ref-tag    { border-color: rgba(200,160,50,0.5);  background: rgba(200,160,50,0.1);  color: #ca0; }
        .no-val { color: var(--vscode-descriptionForeground); font-style: italic; }
        .files-header {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 5px;
        }
        .file-row {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 11px;
            padding: 2px 0;
        }
        .file-path {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-family: var(--vscode-editor-font-family, monospace);
        }
        .file-badge {
            font-size: 10px;
            font-weight: 700;
            width: 14px;
            text-align: center;
            flex-shrink: 0;
        }
        .badge-add { color: #4c9; }
        .badge-del { color: #d66; }
        .badge-mod { color: #ca0; }
    </style>
</head>
<body>
    <div id="placeholder">
        <div style="font-size:20px;opacity:0.4">⎇</div>
        <div>Select a commit to see details</div>
    </div>
    <div id="detail"></div>

    <script nonce="${nonce}">
        window.addEventListener('message', event => {
            if (event.data.type === 'showCommit') {
                render(event.data.commit, event.data.branch);
            }
        });

        function esc(s) {
            return String(s ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }

        function render(c, branch) {
            document.getElementById('placeholder').style.display = 'none';
            const el = document.getElementById('detail');
            el.style.display = 'flex';

            const files = [
                { p: 'src/extension/' + c.branch.split('/').pop() + '/index.ts', t: 'mod' },
                { p: 'CHANGELOG.md', t: 'mod' },
            ];

            const refsHtml = c.refs.length > 0
                ? c.refs.map(r => {
                    const cls = r.type === 'remote' ? 'ref-remote' : r.type === 'tag' ? 'ref-tag' : '';
                    const icon = r.type === 'tag' ? '&#x1F3F7;' : r.type === 'remote' ? '&#x2601;' : '&#x2387;';
                    return '<span class="ref-badge ' + cls + '">' + icon + ' ' + esc(r.name) + '</span>';
                }).join('')
                : '<span class="no-val">none</span>';

            const parentsHtml = c.parents.length === 0
                ? '<span class="no-val">none (root commit)</span>'
                : c.parents.map(p => '<span class="sha-pill">' + esc(p) + '</span>').join('');

            const filesHtml = files.map(f =>
                '<div class="file-row">' +
                    '<span class="file-path">' + esc(f.p) + '</span>' +
                    '<span class="file-badge ' + (f.t === 'add' ? 'badge-add' : f.t === 'del' ? 'badge-del' : 'badge-mod') + '">' +
                        (f.t === 'add' ? '+' : f.t === 'del' ? '−' : 'M') +
                    '</span>' +
                '</div>'
            ).join('');

            el.innerHTML =
                '<div class="detail-header">' +
                    '<span class="sha-pill">' + esc(c.sha) + '</span>' +
                    '<span class="date-text">' + esc(c.dateAbs) + '</span>' +
                '</div>' +
                '<div class="commit-msg">' + esc(c.msg) + '</div>' +
                '<div class="detail-section">' +
                    '<div class="detail-row">' +
                        '<div class="lbl">Branch</div>' +
                        '<div class="val">' +
                            '<span class="branch-dot" style="background:' + esc(branch.color) + '"></span>' +
                            '<span class="branch-name">' + esc(c.branch) + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="detail-row">' +
                        '<div class="lbl">Author</div>' +
                        '<div class="val">' + esc(c.author) + ' &lt;' + esc(c.email) + '&gt;</div>' +
                    '</div>' +
                    '<div class="detail-row">' +
                        '<div class="lbl">Date</div>' +
                        '<div class="val" title="' + esc(c.dateAbs) + '">' + esc(c.date) + '</div>' +
                    '</div>' +
                    '<div class="detail-row">' +
                        '<div class="lbl">Parents</div>' +
                        '<div class="val">' + parentsHtml + '</div>' +
                    '</div>' +
                    (c.refs.length > 0
                        ? '<div class="detail-row"><div class="lbl">Refs</div><div class="val">' + refsHtml + '</div></div>'
                        : '') +
                '</div>' +
                '<div class="detail-section">' +
                    '<div class="files-header">Files changed &middot; ' + files.length + '</div>' +
                    filesHtml +
                '</div>';
        }
    </script>
</body>
</html>`;
    }
}
