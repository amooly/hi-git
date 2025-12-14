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
            // Root level - return a "Changes" group if we have changes
            if (this.fileChanges.length === 0) {
                return Promise.resolve([]);
            }

            let added = 0;
            let deleted = 0;
            let modified = 0;
            this.fileChanges.forEach(change => {
                if (change.status === 'A') { added++; }
                else if (change.status === 'D') { deleted++; }
                else { modified++; }
            });

            const summaryItem = new FileItem(
                `Modified: ${modified}, Added: ${added}, Deleted: ${deleted}`,
                vscode.TreeItemCollapsibleState.None,
                this.rootUri,
                this.ref,
                undefined,
                undefined,
                false,
                true
            );
            
            const changesItem = new FileItem(
                "Changes",
                vscode.TreeItemCollapsibleState.Expanded,
                this.rootUri,
                this.ref,
                undefined,
                undefined,
                true
            );
            changesItem.description = this.fileChanges.length.toString();
            changesItem.childrenArray = this.buildTree();
            
            return Promise.resolve([summaryItem, changesItem]);
        } else if (element.childrenArray) {
            // Return pre-calculated children
            return Promise.resolve(element.childrenArray);
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
        public readonly isDirectory: boolean = false,
        public readonly isSummary: boolean = false
    ) {
        super(label, collapsibleState);

        if (isSummary) {
            this.contextValue = 'summary';
            this.iconPath = new vscode.ThemeIcon('graph');
            return;
        }

        if (isDirectory) {
            if (label === "Changes") {
                this.contextValue = 'changesRoot';
                // No icon for root group
            } else {
                this.tooltip = fullPath;
                this.contextValue = 'directory';
                this.iconPath = vscode.ThemeIcon.Folder;
                this.resourceUri = vscode.Uri.file(path.join(rootUri.fsPath, fullPath || ""));
            }
        } else {
            this.tooltip = `${fullPath} (${this.getStatusLabel()})`;
            this.description = this.getStatusLabel();
            this.contextValue = 'file';

            // Set resource decorations (colors)
            this.resourceUri = vscode.Uri.file(path.join(rootUri.fsPath, fullPath!));

            // Use standard file icon (explorer style)
            this.iconPath = vscode.ThemeIcon.File;

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
            case 'M': return 'M';
            case 'A': return 'A';
            case 'D': return 'D';
            case 'R': return 'R';
            case 'C': return 'C';
            case 'U': return 'U';
            default: return '';
        }
    }
}


export const directoryDiffProvider = new DirectoryDiffProvider();