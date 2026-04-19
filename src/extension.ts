import * as vscode from 'vscode';
import { HiGitPanel } from './panels/HiGitPanel.js';
import { HiGitSidebarProvider } from './panels/HiGitSidebarProvider.js';

export function activate(context: vscode.ExtensionContext) {
  // Register the sidebar webview provider
  const sidebarProvider = new HiGitSidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      HiGitSidebarProvider.viewType,
      sidebarProvider
    )
  );

  // Register the "Hi Git: Show Graph" command
  context.subscriptions.push(
    vscode.commands.registerCommand('hi-git.showGraph', () => {
      HiGitPanel.createOrShow(context.extensionUri);
    })
  );
}

export function deactivate() {}
