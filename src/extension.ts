import * as path from 'path';
import * as vscode from 'vscode';
import { compareWithBranchOrTag } from './commands/compareWith';
import { handleShowWorkspaceGitGraph } from './commands/showWorkspaceGitGraph';
import { GitGraphPanel } from './panels/GitGraphPanel';
import { HistoryPanel } from './panels/HistoryPanel';
import { commitDetailsProvider } from './providers/CommitDetailsProvider';
import { directoryDiffProvider } from './providers/DirectoryDiffProvider';
import { gitService } from './service/gitService';
import { InitExtensionVariables } from './vscode/extensionVariable';

export function activate(context: vscode.ExtensionContext) {
    InitExtensionVariables(context);
    console.log('Congratulations, your extension "hi-git" is now active!');

    // Initialize context for directory diff view visibility (default: show)
    vscode.commands.executeCommand('setContext', 'hi-git:DirectoryDiffVisable', true);

    vscode.window.registerTreeDataProvider('hi-git.directoryDiff', directoryDiffProvider);
    vscode.window.registerTreeDataProvider('hi-git.commitDetails', commitDetailsProvider);

    // the command to show the workspace git graph;
    context.subscriptions.push(
        vscode.commands.registerCommand('hi-git.showWorkspaceGitGraph', async () => {
            await handleShowWorkspaceGitGraph(context.extensionUri);
        })
    );

    // the command to show the git history of a file or directory;
    context.subscriptions.push(
        vscode.commands.registerCommand('hi-git.showGitHistoryOf', async (uri: vscode.Uri) => {
            if (uri) {
                const isTracked = await gitService.checkFileOrFolderTracked(uri);

                if (!isTracked) {
                    vscode.window.showWarningMessage(`The file/directory "${path.basename(uri.fsPath)}" is not tracked by git.`);
                    return;
                }

                HistoryPanel.createOrShow(context.extensionUri, uri);
            } else {
                // If command palette, show workspace graph or ask for file?
                // For now, default to workspace if no uri provided
                GitGraphPanel.createOrShow(context.extensionUri);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('hi-git.compareWithBranchOrTag', async (uri: vscode.Uri) => {
            if (uri) {
                const isTracked = await gitService.checkFileOrFolderTracked(uri);
                if (!isTracked) {
                    vscode.window.showWarningMessage(`The file/directory "${path.basename(uri.fsPath)}" is not tracked by git.`);
                    return;
                }
                compareWithBranchOrTag(uri);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('hi-git.showCommitDetails', async (commitHash: string, repoPath: string, focusView: boolean = false) => {
            // Update the provider with the new commit
            await commitDetailsProvider.update(repoPath, commitHash);

            if (focusView) {
                // Hide the directory diff view
                await vscode.commands.executeCommand('setContext', 'hi-git:DirectoryDiffVisable', false);
                // Focus the commit details view
                await vscode.commands.executeCommand('hi-git.commitDetails.focus');
            }
        })
    );
}

export function deactivate() { }
