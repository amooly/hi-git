# Introduction to VS Code UI

From an extension developer's perspective, the VS Code user interface is broadly split into 5 main areas.

Here is a breakdown of these areas and the specific APIs you use to manage them:

## 1. The Editor Area (Main Canvas)

This is the central area where files are edited. It can be split into groups and contains tabs.

* **Webview Panels**: For complex, custom UIs that need a full tab (like your graph).
  * **API**: vscode.window.createWebviewPanel()
  * **In your project**: GraphPanel.ts uses this. You manually create the panel and manage its lifecycle.
* **Custom Editors**: For building custom graphical editors for specific file types (e.g., an image viewer or a visual CSV editor).
  * **API**: vscode.window.registerCustomEditorProvider()
* **Text Documents**: Standard text editing.
  * **API**: vscode.window.showTextDocument()
Custom Editors: For building custom graphical editors for specific file types (e.g., an image viewer or a visual CSV editor).
API: vscode.window.registerCustomEditorProvider()
Text Documents: Standard text editing.
API: vscode.window.showTextDocument()

## 2. The Sidebar / Activity Bar

This is the area on the left (or right) containing the Explorer, Search, Source Control, etc. It consists of the thin "Activity Bar" (icons) and the wider "Side Bar" (the actual view).

* **Webview Views**: For placing a custom React/HTML UI inside a sidebar panel.
  * **API**: vscode.window.registerWebviewViewProvider()
  * **In your project**: DetailProvider.ts and BranchProvider.ts use this. You don't "create" them directly; you register a provider, and VS Code asks your provider for the HTML when the user opens that sidebar view.
In your project: DetailProvider.ts and BranchProvider.ts use this. You don't "create" them directly; you register a provider, and VS Code asks your provider for the HTML when the user opens that sidebar view.
Tree Views: For standard, native collapsible lists (like the file explorer).
API: vscode.window.registerTreeDataProvider()
Note: To put something here, you also must declare it in your package.json under contributes.views and optionally contributes.viewsContainers.

## 3. The Panel Area (Bottom)

This is the section at the bottom that typically houses the Terminal, Output, Problems, and Debug Console.

* **Webview Views**: You can actually put Webview Views here as well, exactly the same way you put them in the Sidebar. You just map them to the panel location in your package.json.
* **Output Channels**: For appending text logs.
  * **API**: vscode.window.createOutputChannel()
* **Terminals**: For interacting with the shell.
  * **API**: vscode.window.createTerminal()

## 4. The Status Bar

The thin strip at the very bottom of the window used for persistent, low-profile information and actions.

* **Status Bar Items**: You can add text, icons, and tie them to commands.
  * **API**: vscode.window.createStatusBarItem()

## 5. Overlays (Notifications & Dialogs)

These aren't persistent areas, but they are crucial UI surfaces that float above the main areas.

* **Notifications (Toasts)**: Little popups in the bottom right.
  * **API**: vscode.window.showInformationMessage(), showErrorMessage()
* **Quick Pick / Command Palette**: The dropdown in the top center.
  * **API**: vscode.window.showQuickPick(), showInputBox()
* **Progress Indicators**:
  * **API**: vscode.window.withProgress()


## Cooperation between different UI areas

6. **Direct Reference** (What you have now)
    ```typescript
    // In extension.ts
    import { DetailProvider } from './vs-ui/DetailProvider.js';

    const detailsProvider = new DetailProvider(context.extensionUri);

    // Pass it directly to the panel
    GraphPanel.createOrShow(context.extensionUri, detailsProvider);
    ```
    When to use: The panel needs to *call methods* on the sidebar (e.g., "Show this commit"). This is the simplest and most efficient way.

2. Event Emitters (The highly recommended "VS Code Way")
   Instead of panels talking directly to each other, they use VS Code's built-in vscode.EventEmitter. A panel says "Hey, something happened!" and doesn't care who is listening. The main extension.ts (or a central controller) wires them together.

How it looks:
    ```typescript
    // Inside GraphPanel.ts
    private readonly _onDidSelectCommit = new vscode.EventEmitter<{commit: CommitData, branch: BranchData}>();
    public readonly onDidSelectCommit = this._onDidSelectCommit.event;

    // When the user clicks a commit in the webview:
    this._onDidSelectCommit.fire({ commit, branch });

    // Inside extension.ts (The "Glue")
    const detailsProvider = new DetailProvider(...);
    const graphPanel = GraphPanel.createOrShow(...);

    // Wire them together:
    graphPanel.onDidSelectCommit((payload) => {
        detailsProvider.showCommit(payload.commit, payload.branch);
    });
    ```


3. VS Code Commands (The "Global" approach)
    You register a hidden command, and one panel executes that command to talk to the other.

    How it looks:
    ```typescript
    // Inside extension.ts
    vscode.commands.registerCommand('hi-git.internal.updateDetails', (commit, branch) => {
        detailsProvider.showCommit(commit, branch);
    });

    // Inside GraphPanel.ts (when a commit is clicked)
    vscode.commands.executeCommand('hi-git.internal.updateDetails', commit, branch);

    ```