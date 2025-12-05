import * as vscode from 'vscode';
import { GitGraphPanel } from '../panels/GitGraphPanel';
import { checkWorkspaceRootTracked } from './base';

export async function handleShowWorkspaceGitGraph(extensionUri: vscode.Uri) {
    // Check if workspace root is tracked
    const isTracked = await checkWorkspaceRootTracked();
    if (!isTracked) {
        vscode.window.showWarningMessage(`Current workspace is not tracked by git.`);
        return;
    }

    GitGraphPanel.createOrShow(extensionUri);
}
