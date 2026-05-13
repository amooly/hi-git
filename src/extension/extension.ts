import * as vscode from 'vscode';
import { GraphPanel } from './vs-ui/GraphPanel.js';
import { BranchProvider } from './vs-ui/BranchProvider.js';
import { DetailProvider } from './vs-ui/DetailProvider.js';
import { CompareProvider } from './vs-ui/CompareProvider.js';
import { GitBlobProvider } from './vs-ui/GitBlobProvider.js';

export function activate(context: vscode.ExtensionContext) {

  const sidebarProvider = new BranchProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      BranchProvider.viewType,
      sidebarProvider
    )
  );

  const detailsProvider = new DetailProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      DetailProvider.viewType,
      detailsProvider
    )
  );

  const compareProvider = new CompareProvider();
  const compareTreeView = vscode.window.createTreeView(CompareProvider.viewType, {
    treeDataProvider: compareProvider,
  });
  compareProvider.setTreeView(compareTreeView);
  context.subscriptions.push(compareTreeView);
  context.subscriptions.push(
    vscode.window.registerFileDecorationProvider(compareProvider)
  );

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      GitBlobProvider.scheme,
      new GitBlobProvider()
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('hi-git.showGraph', () => {
      GraphPanel.createOrShow(context.extensionUri, detailsProvider, compareProvider);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('hi-git.refreshSidebar', () => {
      sidebarProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('hi-git.pinpointCommit', () => {
      sidebarProvider.pinpointCurrentCommit();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('hi-git.collapseCompareView', () => {
      compareProvider.collapseAll();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('hi-git.expandCompareView', () => {
      compareProvider.expandAll();
    })
  );

}

export function deactivate() {}
