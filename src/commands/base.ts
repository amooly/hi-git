import * as vscode from 'vscode';
import { gitService } from '../git/gitService';

// Check if workspace root is tracked
export async function checkWorkspaceRootTracked() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return false;
    }
    const uri = workspaceFolders[0].uri;
    const isTracked = await gitService.checkFileOrFolderTracked(uri);
    return isTracked;
}