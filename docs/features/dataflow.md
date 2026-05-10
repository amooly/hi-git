# Dataflow: Frontend Panel & Sidebar

## Webview ↔ Extension Host: Request-Response Pattern

The project uses an industry-standard `requestId` pattern to simulate asynchronous, Promise-based communication over the unidirectional `postMessage` channel.

### 1. Shared Types
Message payloads and shapes are strictly typed in `src/shared/types/messages.ts`. Both the Extension Host and the Webview consume these types via type-only imports (`import type`).

### 2. Webview to Host (Requesting Data)
The webview uses a global wrapper (`window.vscodeAPI`) which handles the `requestId` boilerplate.

```typescript
// In the webview UI (React components)
import type { RepoData } from '../shared/types/git.js';

async function fetchRepoData() {
  try {
    // Generates a unique requestId and waits for the matching response
    const data = await window.vscodeAPI.request<'getRepoData', void, RepoData>('getRepoData');
    console.log("Got data:", data);
  } catch (err) {
    console.error("Failed to fetch repo data:", err);
  }
}
```

### 3. Host to Webview (Handling Requests)
The extension host uses the `MessageHandler` utility class to automatically route requests and return responses with the correct `requestId`.

```typescript
// In the extension host (e.g., GraphPanel.ts)
import { MessageHandler } from '@utilities/MessageHandler.js';

const messageHandler = new MessageHandler(panel.webview, disposables);

// Register a handler for the 'getRepoData' command
messageHandler.registerHandler('getRepoData', async () => {
  return gitDataService.getRepoData();
});
```

---

## Sidebar

`BranchProvider` renders HTML at `resolveWebviewView()` time. Branch and tag lists are generated from `GitDataService` — no hardcoded strings in the provider.

The only host↔webview message crossing the boundary is triggered by the "Show Full Graph" button:

```
User clicks "Show Full Graph"
    → webview: vscode.postMessage({ command: 'showGraph' })
    → BranchProvider.onDidReceiveMessage()
    → vscode.commands.executeCommand('hi-git.showGraph')
    → GraphPanel.createOrShow(extensionUri, gitDataService)
```

The sidebar sends one message type and receives none back from the host.

---

## Service & Utility APIs

### GitDataService API

| Method | Returns | Used by |
|---|---|---|
| `getRepoData()` | `RepoData` | `GraphPanel` — inlined as `window.GITNEXUS_DATA` |
| `getBranchSummary()` | `BranchSummaryEntry[]` | `BranchProvider` → `SidebarRenderer.branchItems()` |
| `getTagSummary()` | `TagSummaryEntry[]` | `BranchProvider` → `SidebarRenderer.tagItems()` |

### SidebarRenderer API

| Method | Returns | Used by |
|---|---|---|
| `SidebarRenderer.branchItems(branches)` | `string` (HTML) | `BranchProvider` |
| `SidebarRenderer.tagItems(tags)` | `string` (HTML) | `BranchProvider` |

---

## Current Gaps

| Area | Current State | What's Missing |
|---|---|---|
| Data source | Hardcoded in `GitDataService` | Real `git log` / `git branch` calls |
| Data refresh | Static at panel open | Replace inline data injection with Promise-based `window.vscodeAPI.request()` calls |
| Context menu actions | All no-ops | Wire to extension commands via `window.vscodeAPI.postEvent()` |
| Ahead/behind meta | Hardcoded map in service | Derive from `git rev-list --count` |.
