# Dataflow: Frontend Panel & Sidebar

## Extension Host → Webview: Data Injection

`GitDataService` (`src/services/GitDataService.ts`) is the single owner of all repo data. It is instantiated once in `activate()` and passed to both panel providers.

```
activate()
  └─ new GitDataService()
       ├─► HiGitPanel            (via createOrShow)
       └─► HiGitSidebarProvider  (via constructor)
```

When `HiGitPanel` builds its HTML, it calls `gitDataService.getRepoData()` and serializes the result as an inline `<script>` tag, setting `window.GITNEXUS_DATA` before any React code runs.

```
HiGitPanel._getWebviewContent()
  └─ gitDataService.getRepoData()
       └─► JSON.stringify → <script>window.GITNEXUS_DATA = {...};</script>
```

`HiGitSidebarProvider` delegates HTML fragment generation to `SidebarRenderer` (`src/utilities/SidebarRenderer.ts`), passing it data from the service.

```
HiGitSidebarProvider._getHtmlForWebview()
  ├─ gitDataService.getBranchSummary() → SidebarRenderer.branchItems() → <li> HTML
  └─ gitDataService.getTagSummary()   → SidebarRenderer.tagItems()    → <li> HTML
```

---

## Frontend (Main Panel)

### Script Load Order → Global Singletons

The webview has no bundler at runtime. Scripts are loaded in dependency order, each exposing a `window` global:

```
(inline script)  → window.GITNEXUS_DATA   { COMMITS[], BRANCHES{}, BRANCH_COLORS{}, BRANCH_RELATIONS{} }
graph.js         → window.GitGraph        { buildEdges(), laneX() }
network.js       → window.BranchRelationsView  (React component)
panel.js         → window.GitNexusPanel   (React component)
app.js           → mounts <App /> to #root
```

### React Component Tree & Data Flow

```
App  (src/webview/app.jsx)
 ├─ state: theme, view, density, nodeStyle, showFilters, editMode
 ├─ reads:  window.GITNEXUS_DATA  (passed down as `data` prop)
 ├─ persists: theme + view to localStorage
 │
 └─► GitNexusPanel  (src/webview/panel.jsx)
      ├─ props: data, theme, view, rowH, density, nodeStyle, showFilters
      ├─ state: filters{sha,msg,author,date}, selectedSha, contextMenu, detailOpen, hoverRemote
      ├─ calls: window.GitGraph.buildEdges(data.COMMITS, rowH)  → SVG edge paths
      ├─ computes: filteredOut Set  (client-side filter, no re-fetch)
      │
      ├─ view='history'  → commit table + SVG graph overlay + DetailPanel
      │
      └─ view='network'  → window.BranchRelationsView({ data })
           └─ reads: data.BRANCH_RELATIONS.branches  → pure SVG render, no local state
```

### postMessage — Dev-only Edit Mode

`App` listens for messages on `window` to support a tweaks panel used in the `GitNexus.html` dev harness. This is not wired to the VS Code extension host.

```
webview → parent:  { type: '__edit_mode_available' }          // fired on mount
parent  → webview: { type: '__activate_edit_mode' }           // show tweaks panel
parent  → webview: { type: '__deactivate_edit_mode' }
webview → parent:  { type: '__edit_mode_set_keys', edits }    // persist tweak changes to TWEAK_DEFAULTS
```

---

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
// In the extension host (e.g., HiGitPanel.ts)
import { MessageHandler } from '@utilities/MessageHandler.js';

const messageHandler = new MessageHandler(panel.webview, disposables);

// Register a handler for the 'getRepoData' command
messageHandler.registerHandler('getRepoData', async () => {
  return gitDataService.getRepoData();
});
```

---

## Sidebar

`HiGitSidebarProvider` renders HTML at `resolveWebviewView()` time. Branch and tag lists are generated from `GitDataService` — no hardcoded strings in the provider.

The only host↔webview message crossing the boundary is triggered by the "Show Full Graph" button:

```
User clicks "Show Full Graph"
    → webview: vscode.postMessage({ command: 'showGraph' })
    → HiGitSidebarProvider.onDidReceiveMessage()
    → vscode.commands.executeCommand('hi-git.showGraph')
    → HiGitPanel.createOrShow(extensionUri, gitDataService)
```

The sidebar sends one message type and receives none back from the host.

---

## Service & Utility APIs

### GitDataService API

| Method | Returns | Used by |
|---|---|---|
| `getRepoData()` | `RepoData` | `HiGitPanel` — inlined as `window.GITNEXUS_DATA` |
| `getBranchSummary()` | `BranchSummaryEntry[]` | `HiGitSidebarProvider` → `SidebarRenderer.branchItems()` |
| `getTagSummary()` | `TagSummaryEntry[]` | `HiGitSidebarProvider` → `SidebarRenderer.tagItems()` |

### SidebarRenderer API

| Method | Returns | Used by |
|---|---|---|
| `SidebarRenderer.branchItems(branches)` | `string` (HTML) | `HiGitSidebarProvider` |
| `SidebarRenderer.tagItems(tags)` | `string` (HTML) | `HiGitSidebarProvider` |

---

## Current Gaps

| Area | Current State | What's Missing |
|---|---|---|
| Data source | Hardcoded in `GitDataService` | Real `git log` / `git branch` calls |
| Data refresh | Static at panel open | Replace inline data injection with Promise-based `window.vscodeAPI.request()` calls |
| Context menu actions | All no-ops | Wire to extension commands via `window.vscodeAPI.postEvent()` |
| Ahead/behind meta | Hardcoded map in service | Derive from `git rev-list --count` |.
