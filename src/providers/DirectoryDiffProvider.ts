import * as vscode from 'vscode';
import * as path from 'path';
import { GitFileChange } from '../git/gitService';

class DirectoryDiffProvider implements vscode.TreeDataProvider<FileItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FileItem | undefined | null | void> = new vscode.EventEmitter<FileItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FileItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private rootUri: vscode.Uri = vscode.Uri.file("");
    private ref: string = "";
    private fileChanges: GitFileChange[] = [];

    public update(rootUri: vscode.Uri, ref: string, fileChanges: GitFileChange[]) {
        this.rootUri = rootUri;
        this.ref = ref;
        this.fileChanges = fileChanges;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: FileItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: FileItem): Thenable<FileItem[]> {
        if (!element) {
            // Root level - build tree structure
            return Promise.resolve(this.buildTree());
        } else if (element.isDirectory) {
            // Return children of this directory
            return Promise.resolve(element.childrenArray || []);
        } else {
            return Promise.resolve([]);
        }
    }

    private buildTree(): FileItem[] {
        // Build a tree structure from flat file list
        const root: Map<string, FileItem> = new Map();

        for (const change of this.fileChanges) {
            const parts = change.path.split('/');
            let currentMap = root;
            let currentPath = '';

            // Build directory hierarchy
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                currentPath = currentPath ? `${currentPath}/${part}` : part;
                const isLastPart = i === parts.length - 1;

                if (!currentMap.has(part)) {
                    if (isLastPart) {
                        // This is a file
                        const fileItem = new FileItem(
                            part,
                            vscode.TreeItemCollapsibleState.None,
                            this.rootUri,
                            this.ref,
                            change.status,
                            currentPath,
                            false
                        );
                        currentMap.set(part, fileItem);
                    } else {
                        // This is a directory
                        const dirItem = new FileItem(
                            part,
                            vscode.TreeItemCollapsibleState.Collapsed,
                            this.rootUri,
                            this.ref,
                            undefined,
                            currentPath,
                            true
                        );
                        currentMap.set(part, dirItem);
                    }
                }

                const item = currentMap.get(part)!;
                if (!isLastPart) {
                    // Navigate into this directory
                    if (!item.children) {
                        item.children = new Map();
                    }
                    currentMap = item.children;
                }
            }
        }

        // Convert map to array and sort
        return this.sortItems(Array.from(root.values()));
    }

    private sortItems(items: FileItem[]): FileItem[] {
        // Sort: directories first, then files, alphabetically within each group
        return items.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.label.toString().localeCompare(b.label.toString());
        }).map(item => {
            if (item.children) {
                item.childrenArray = this.sortItems(Array.from(item.children.values()));
            }
            return item;
        });
    }
}

class FileItem extends vscode.TreeItem {
    public children?: Map<string, FileItem>;
    public childrenArray?: FileItem[];

    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly rootUri: vscode.Uri,
        public readonly ref: string,
        public readonly status?: 'M' | 'A' | 'D' | 'R' | 'C' | 'U',
        public readonly fullPath?: string,
        public readonly isDirectory: boolean = false
    ) {
        super(label, collapsibleState);

        if (isDirectory) {
            this.tooltip = fullPath;
            this.contextValue = 'directory';
            this.iconPath = vscode.ThemeIcon.Folder;
        } else {
            this.tooltip = `${fullPath} (${this.getStatusLabel()})`;
            this.description = this.getStatusLabel();
            this.contextValue = 'file';

            // Set icon based on status
            this.iconPath = this.getStatusIcon();

            // Set resource decorations (colors)
            this.resourceUri = vscode.Uri.file(path.join(rootUri.fsPath, fullPath!));

            // Set up diff command
            const leftUri = vscode.Uri.from({
                scheme: 'git',
                path: path.join(rootUri.path, fullPath!),
                query: JSON.stringify({ path: path.join(rootUri.fsPath, fullPath!), ref: ref })
            });
            const rightUri = vscode.Uri.file(path.join(rootUri.fsPath, fullPath!));

            this.command = {
                command: 'vscode.diff',
                title: 'Open Diff',
                arguments: [leftUri, rightUri, `${label} (${ref}) ↔ ${label}`]
            };
        }
    }

    private getStatusLabel(): string {
        switch (this.status) {
            case 'M': return 'Modified';
            case 'A': return 'Added';
            case 'D': return 'Deleted';
            case 'R': return 'Renamed';
            case 'C': return 'Copied';
            case 'U': return 'Unmerged';
            default: return '';
        }
    }

    private getStatusIcon(): vscode.ThemeIcon {
        switch (this.status) {
            case 'M':
                return new vscode.ThemeIcon('diff-modified', new vscode.ThemeColor('gitDecoration.modifiedResourceForeground'));
            case 'A':
                return new vscode.ThemeIcon('diff-added', new vscode.ThemeColor('gitDecoration.addedResourceForeground'));
            case 'D':
                return new vscode.ThemeIcon('diff-removed', new vscode.ThemeColor('gitDecoration.deletedResourceForeground'));
            case 'R':
                return new vscode.ThemeIcon('diff-renamed', new vscode.ThemeColor('gitDecoration.renamedResourceForeground'));
            case 'C':
                return new vscode.ThemeIcon('files', new vscode.ThemeColor('gitDecoration.addedResourceForeground'));
            case 'U':
                return new vscode.ThemeIcon('diff-ignored', new vscode.ThemeColor('gitDecoration.conflictingResourceForeground'));
            default:
                return new vscode.ThemeIcon('file');
        }
    }
}


export const directoryDiffProvider = new DirectoryDiffProvider();