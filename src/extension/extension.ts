import * as vscode from 'vscode';
import { HiGitPanel } from './panels/HiGitPanel.js';
import { HiGitSidebarProvider } from './panels/HiGitSidebarProvider.js';
import { HiGitDetailsProvider } from './panels/HiGitDetailsProvider.js';

export function activate(context: vscode.ExtensionContext) {

  const sidebarProvider = new HiGitSidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      HiGitSidebarProvider.viewType,
      sidebarProvider
    )
  );

  const detailsProvider = new HiGitDetailsProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      HiGitDetailsProvider.viewType,
      detailsProvider
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('hi-git.showGraph', () => {
      HiGitPanel.createOrShow(context.extensionUri, detailsProvider);
    })
  );
}

export function deactivate() {}
