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
| Data refresh | Static at panel open | Re-call service methods and re-inject via `webview.postMessage()` |
| Context menu actions | All no-ops | Wire to extension commands via `postMessage` |
| Ahead/behind meta | Hardcoded map in service | Derive from `git rev-list --count` |

The `postMessage` channel is the right mechanism for refresh: the host calls `webview.postMessage({ type: 'update', data: gitDataService.getRepoData() })` and the webview handles it in `App` via `window.addEventListener('message', ...)`.
