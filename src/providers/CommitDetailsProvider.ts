import * as path from 'path';
import * as vscode from 'vscode';
import { GitCommit } from '../model/git';
import { gitService } from '../service/gitService';

class CommitDetailsProvider implements vscode.TreeDataProvider<CommitDetailItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<CommitDetailItem | undefined | null | void> = new vscode.EventEmitter<CommitDetailItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<CommitDetailItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private commitHash: string = '';
    private cwd: string = '';
    private commitDetails: GitCommit | null = null;
    private commitFiles: string[] = [];

    constructor() { }

    public async update(cwd: string, commitHash: string) {
        this.cwd = cwd;
        this.commitHash = commitHash;

        try {
            this.commitDetails = await gitService.getCommitDetails(cwd, commitHash);
            this.commitFiles = await gitService.getCommitFiles(cwd, commitHash);
        } catch (e) {
            console.error('Error updating commit details:', e);
            this.commitDetails = null;
            this.commitFiles = [];
        }

        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: CommitDetailItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: CommitDetailItem): Thenable<CommitDetailItem[]> {
        if (!this.commitHash) {
            return Promise.resolve([]);
        }

        if (element) {
            // If we had nested items (like file tree), we would handle them here.
            // For now, we just have a flat list of files under the root, but the root items are metadata + files header?
            // Actually, let's structure it as:
            // - Metadata items (Hash, Author, Date, Message)
            // - Files (collapsible or just list)

            // But wait, the design said "The view will display: Commit hash, Author and date, Full commit message, List of changed files"
            // Let's make the top level items be the metadata and a "Files" group, or just list everything flat if it's small.
            // A better way for TreeView is usually:
            // - Message (multiline?) - TreeItems are usually single line.
            // - Author
            // - Date
            // - Hash
            // - Files (Collapsible)

            if (element.contextValue === 'filesGroup') {
                return Promise.resolve(this.commitFiles.map(file => {
                    return new CommitDetailItem(
                        file,
                        vscode.TreeItemCollapsibleState.None,
                        'file',
                        {
                            command: 'vscode.diff',
                            title: 'Open Diff',
                            arguments: [
                                vscode.Uri.from({ scheme: 'git', path: path.join(this.cwd, file), query: JSON.stringify({ path: path.join(this.cwd, file), ref: `${this.commitHash}~1` }) }),
                                vscode.Uri.from({ scheme: 'git', path: path.join(this.cwd, file), query: JSON.stringify({ path: path.join(this.cwd, file), ref: this.commitHash }) }),
                                `${path.basename(file)} (${this.commitHash.substring(0, 7)})`
                            ]
                        }
                    );
                }));
            }

            return Promise.resolve([]);
        } else {
            if (!this.commitDetails) {
                return Promise.resolve([]);
            }

            const items: CommitDetailItem[] = [
                new CommitDetailItem(`Commit: ${this.commitDetails.hash}`, vscode.TreeItemCollapsibleState.None, 'metadata'),
                new CommitDetailItem(`Author: ${this.commitDetails.author}`, vscode.TreeItemCollapsibleState.None, 'metadata'),
                new CommitDetailItem(`Date: ${this.commitDetails.date}`, vscode.TreeItemCollapsibleState.None, 'metadata'),
                new CommitDetailItem(this.commitDetails.message, vscode.TreeItemCollapsibleState.None, 'message'),
                new CommitDetailItem(`Changed Files (${this.commitFiles.length})`, vscode.TreeItemCollapsibleState.Expanded, 'filesGroup')
            ];

            return Promise.resolve(items);
        }
    }
}

class CommitDetailItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);

        if (contextValue === 'file') {
            this.resourceUri = vscode.Uri.file(label); // To get file icon
            // We need to make sure the label is just the filename for display if we want, but TreeItem label handles it.
            // Actually, if we pass a string label, it uses that.
            // Let's use the path as label? Or just basename?
            // Usually for file lists, we want the path.
        }

        if (contextValue === 'message') {
            this.tooltip = label;
        }
    }
}

export const commitDetailsProvider = new CommitDetailsProvider();
