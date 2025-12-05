import * as vscode from 'vscode';
import * as path from 'path';
import { gitService } from '../git/gitService';
import { directoryDiffProvider } from '../providers/DirectoryDiffProvider';

export async function compareWithBranchOrTag(uri: vscode.Uri) {
    const stat = await vscode.workspace.fs.stat(uri);
    const isDirectory = stat.type === vscode.FileType.Directory;
    const cwd = isDirectory ? uri.fsPath : path.dirname(uri.fsPath);

    // 1. Get Branches and Tags
    const branches = await gitService.getBranches(cwd);
    const tags = await gitService.getTags(cwd);
    const items = [...branches, ...tags];

    // 2. Show QuickPick
    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a branch or tag to compare with'
    });

    if (!selected) {
        return;
    }

    await performComparison(uri, selected);
}

export async function performComparison(uri: vscode.Uri, ref: string) {
    const stat = await vscode.workspace.fs.stat(uri);
    const isDirectory = stat.type === vscode.FileType.Directory;
    const cwd = isDirectory ? uri.fsPath : path.dirname(uri.fsPath);

    // 3. Handle Diff
    if (!isDirectory) {
        // File Diff
        // We need to open a diff editor.
        // Left side: The file at the selected revision.
        // Right side: The current file on disk.

        // We can use the git: URI scheme if the git extension is available, but let's try to be independent or use a simple approach.
        // Actually, VS Code's built-in git extension provides a `git:` scheme. 
        // `git:/path/to/file?{"path":"/path/to/file","ref":"branch"}`

        // Let's try to construct a uri for the left side.
        // Note: This depends on the built-in git extension.
        const leftUri = vscode.Uri.from({
            scheme: 'git',
            path: uri.path,
            query: JSON.stringify({ path: uri.fsPath, ref: ref })
        });

        const fileName = path.basename(uri.fsPath);
        await vscode.commands.executeCommand('vscode.diff', leftUri, uri, `${fileName} (${ref}) ↔ ${fileName}`);

    } else {
        // Directory Diff
        // Show list of changed files with status.
        // Get the repo root to calculate relative path for filtering
        const repoRoot = await gitService.getRepoRoot(cwd);
        const relativePath = path.relative(repoRoot, uri.fsPath);
        
        const fileChanges = await gitService.getDiffFilesWithStatus(repoRoot, ref, 'HEAD', relativePath); // Comparing selected against HEAD (current)

        if (fileChanges.length === 0) {
            vscode.window.showInformationMessage('No files changed.');
            return;
        }

        directoryDiffProvider.update(uri, ref, fileChanges);
        vscode.commands.executeCommand('workbench.view.extension.hi-git-explorer');
    }
}
