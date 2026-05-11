import * as vscode from 'vscode';
import type { CompareFileData } from '@shared/types/index.js';

const SCHEME = 'hi-git-compare';

const STATUS_LETTERS: Record<CompareFileData['status'], string> = {
  added: 'A', modified: 'M', deleted: 'D', renamed: 'R',
};

const STATUS_COLORS: Record<string, string> = {
  A: 'gitDecoration.addedResourceForeground',
  M: 'gitDecoration.modifiedResourceForeground',
  D: 'gitDecoration.deletedResourceForeground',
  R: 'gitDecoration.renamedResourceForeground',
};

const STATUS_PRIORITY: Record<string, number> = { A: 4, M: 3, D: 2, R: 1 };

type CompareItem = FolderItem | FileItem | PlaceholderItem;

class FolderItem extends vscode.TreeItem {
  constructor(
    name: string,
    path: string,
    readonly children: CompareItem[],
    folderColor: string | null
  ) {
    super(name, vscode.TreeItemCollapsibleState.Expanded);
    this.iconPath = vscode.ThemeIcon.Folder;
    this.contextValue = 'compareFolder';
    if (folderColor) {
      this.resourceUri = vscode.Uri.from({
        scheme: SCHEME,
        path: '/folder/' + path,
        query: 'color=' + encodeURIComponent(folderColor),
      });
    }
  }
}

class FileItem extends vscode.TreeItem {
  constructor(name: string, readonly file: CompareFileData) {
    super(name, vscode.TreeItemCollapsibleState.None);
    const letter = STATUS_LETTERS[file.status];
    // resourceUri with the real path so the active file icon theme picks the right language icon.
    this.resourceUri = vscode.Uri.from({
      scheme: SCHEME,
      path: '/' + file.path,
      query: 'status=' + letter,
    });
    this.tooltip = new vscode.MarkdownString(
      `**${file.path}**\n\nStatus: ${file.status}  \n+${file.insertions} / -${file.deletions}`
    );
    this.contextValue = 'compareFile';
  }
}

class PlaceholderItem extends vscode.TreeItem {
  constructor() {
    super('Right-click a commit → Compare with previous', vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('info');
    this.contextValue = 'comparePlaceholder';
  }
}

// ── tree builder ─────────────────────────────────────────────────────────────

interface DirTree {
  files: CompareFileData[];
  dirs: Map<string, DirTree>;
}

function dominantStatusColor(items: CompareItem[]): string | null {
  let bestLetter = '';
  let bestPriority = 0;

  function scan(nodes: CompareItem[]) {
    for (const node of nodes) {
      if (node instanceof FileItem) {
        const letter = STATUS_LETTERS[node.file.status];
        const p = STATUS_PRIORITY[letter] ?? 0;
        if (p > bestPriority) { bestPriority = p; bestLetter = letter; }
      } else if (node instanceof FolderItem) {
        scan(node.children);
      }
    }
  }

  scan(items);
  return bestLetter ? (STATUS_COLORS[bestLetter] ?? null) : null;
}

function buildTreeItems(files: CompareFileData[]): CompareItem[] {
  const root: DirTree = { files: [], dirs: new Map() };

  for (const file of files) {
    const parts = file.path.split('/');
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!node.dirs.has(parts[i])) {
        node.dirs.set(parts[i], { files: [], dirs: new Map() });
      }
      node = node.dirs.get(parts[i])!;
    }
    node.files.push(file);
  }

  function toItems(tree: DirTree, pathParts: string[]): CompareItem[] {
    const items: CompareItem[] = [];

    for (const [name, subtree] of [...tree.dirs.entries()].sort()) {
      const fullPath = [...pathParts, name].join('/');
      const children = toItems(subtree, [...pathParts, name]);
      items.push(new FolderItem(name, fullPath, children, dominantStatusColor(children)));
    }

    for (const file of [...tree.files].sort((a, b) => a.path.localeCompare(b.path))) {
      items.push(new FileItem(file.path.split('/').pop()!, file));
    }

    return items;
  }

  return toItems(root, []);
}

// ── provider ─────────────────────────────────────────────────────────────────

export class CompareProvider
  implements vscode.TreeDataProvider<CompareItem>, vscode.FileDecorationProvider {

  public static readonly viewType = 'hi-git.compareView';
  public static readonly uriScheme = SCHEME;

  private readonly _onDidChangeTreeData =
    new vscode.EventEmitter<CompareItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private _rootItems: CompareItem[] = [];

  showDiff(_sha: string, _parentSha: string | null, _message: string, files: CompareFileData[]) {
    this._rootItems = buildTreeItems(files);
    this._onDidChangeTreeData.fire();
  }

  // TreeDataProvider
  getTreeItem(element: CompareItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: CompareItem): CompareItem[] {
    if (!element) {
      return this._rootItems.length ? this._rootItems : [new PlaceholderItem()];
    }
    if (element instanceof FolderItem) {
      return element.children;
    }
    return [];
  }

  // FileDecorationProvider — drives status badges (M/A/D/R) and folder color dots
  provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
    if (uri.scheme !== SCHEME) return undefined;
    const params = new URLSearchParams(uri.query);

    const status = params.get('status');
    if (status) {
      return new vscode.FileDecoration(
        status,
        undefined,
        new vscode.ThemeColor(STATUS_COLORS[status] ?? 'foreground')
      );
    }

    const color = params.get('color');
    if (color) {
      return new vscode.FileDecoration(undefined, undefined, new vscode.ThemeColor(color));
    }

    return undefined;
  }
}
