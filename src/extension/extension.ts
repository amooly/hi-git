import * as vscode from 'vscode';
import { GraphPanel } from './vs-ui/GraphPanel.js';
import { BranchProvider } from './vs-ui/BranchProvider.js';
import { DetailProvider } from './vs-ui/DetailProvider.js';
import { CompareProvider } from './vs-ui/CompareProvider.js';

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
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      CompareProvider.viewType,
      compareProvider
    )
  );
  context.subscriptions.push(
    vscode.window.registerFileDecorationProvider(compareProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('hi-git.showGraph', () => {
      GraphPanel.createOrShow(context.extensionUri, detailsProvider, compareProvider);
    })
  );
}

export function deactivate() {}
