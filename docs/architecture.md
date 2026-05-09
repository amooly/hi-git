# Architecture

## Tech Stack

### Extension Host (Node.js)

| Technology | Role |
|---|---|
| **TypeScript 5.x** | Type-safe extension host code |
| **VS Code Extension API** | Panel creation, webview management, commands, sidebar views |
| **esbuild** | Bundles the extension host TS and transpiles webview JSX |

### Webview (Browser Sandbox)

| Technology | Role |
|---|---|
| **React 18** (UMD) | UI components — loaded as a global from a local vendor file, no bundler in the webview |
| **JSX** (transpiled by esbuild) | Component authoring — `.jsx` source files are compiled to `React.createElement()` calls at build time |
| **Vanilla CSS** | All styling — no CSS-in-JS, no Tailwind. Heavy use of CSS custom properties |
| **Material Symbols Outlined** | Icon font |
| **Fira Code** | Monospace font via Google Fonts |
| **Inter** | Primary sans-serif font (local variable font files) |

> React is shipped as prebuilt UMD globals (`window.React`, `window.ReactDOM`) copied from `node_modules` at build time. VS Code webviews block external CDN scripts due to strict CSP.

## Folder Structure

```
hi-git/
├── src/
│   ├── extension/                # Extension host TypeScript source
│   │   ├── extension.ts          # Entry point — activate(), wires services to panels
│   │   ├── types/                # Data contracts (no logic)
│   │   │   ├── git.ts            # CommitData, BranchData, RepoData, …
│   │   │   ├── ui.ts             # BranchSummaryEntry, TagSummaryEntry
│   │   │   └── index.ts          # Barrel re-export
│   │   ├── utilities/            # Stateless helper functions (no external I/O)
│   │   │   ├── getNonce.ts       # CSP nonce generator
│   │   │   └── SidebarRenderer.ts # HTML fragment builders for branch/tag lists
│   │   ├── components/           # (planned) Adapters that invoke external providers
│   │   │   └── ...               # e.g. GitProvider, FileSystemProvider, HttpProvider
│   │   ├── services/             # Business logic — composes components and types
│   │   │   └── GitDataService.ts # Owns repo data; exposes getRepoData(), getBranchSummary(), getTagSummary()
│   │   └── panels/               # VS Code API surface — composes services and utilities into webview HTML
│   │       ├── HiGitPanel.ts     # Full-screen graph WebviewPanel
│   │       └── HiGitSidebarProvider.ts # Activity bar sidebar WebviewView
│   │
│   └── webview/                  # Webview React source (authored as JSX, excluded from tsc)
│       ├── GitNexus.html         # Standalone dev harness (CDN React + data.js, browser only)
│       ├── app.jsx               # Root React component — mounts to #root
│       ├── panel.jsx             # Commits table, header, filter bar, detail panel
│       ├── network.jsx           # Branch Relations SVG view
│       ├── data.js               # Static sample data for dev harness only (not loaded by extension)
│       ├── graph.js              # SVG graph edge computation (Bezier curves, lane layout)
│       └── styles.css            # All component styles + VS Code theme tokens
│
├── media/                        # Assets consumed by the webview at runtime
│   ├── icon.svg                  # Activity bar icon
│   ├── vendor/                   # GENERATED — React 18 UMD production builds
│   └── webview/                  # GENERATED — esbuild JSX transpilation output
│
├── out/                          # GENERATED — compiled extension host
├── docs/                         # Project documentation
│   ├── architecture.md           # Source of truth for structure, layers, and dependency rules
│   ├── coding_conventions.md     # Code style and gotchas
│   └── features/                 # Feature-level docs: data flows, behaviors, APIs
├── esbuild.js                    # Build script
├── package.json                  # Extension manifest + npm config
└── tsconfig.json
```

**Do not edit `media/vendor/`, `media/webview/`, or `out/`** — generated at build time, git-ignored.

## Layer Dependency Rules

Within the extension host, dependencies flow in one direction only — no layer may import from a layer above it:

```
panels/      →  services/   →  types/
panels/      →  utilities/  →  types/
components/  →  (external providers: git CLI, file system, HTTP)
services/    →  components/
```

- `types/` — no imports from any internal layer
- `utilities/` — may only import from `types/`
- `components/` — adapters for external I/O; may import from `types/` and `utilities/`
- `services/` — business logic; may import from `components/`, `utilities/`, and `types/`
- `panels/` — VS Code API surface; may import from `services/` and `utilities/`

Extension host and webview are fully isolated — they do not share imports. Communication is via `postMessage` only.

## Webview Script Load Order

The webview has no bundler at runtime. Scripts are loaded in dependency order, each exposing a `window` global:

```
1. react.production.min.js      → window.React
2. react-dom.production.min.js  → window.ReactDOM
3. (inline script)              → window.GITNEXUS_DATA  ← serialized from GitDataService by HiGitPanel
4. graph.js                     → window.GitGraph
5. network.js                   → window.BranchRelationsView
6. panel.js                     → window.GitNexusPanel
7. app.js                       → mounts <App /> to #root
```

New webview modules must be exposed as `window.X` globals and added to the script load order in `HiGitPanel._getWebviewContent()`.

## Content Security Policy

```
default-src 'none';
style-src   {webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com;
font-src    {webview.cspSource} https://fonts.gstatic.com;
script-src  'nonce-{nonce}';
img-src     {webview.cspSource};
```

Every `<script>` tag requires a per-load nonce. The nonce is generated by `src/extension/utilities/getNonce.ts` and applied by both panel providers.

## Key Design Decisions

- **UMD React over bundled React**: webview CSP blocks external scripts; UMD globals copied from `node_modules` at build time satisfy this constraint.
- **`src/webview/GitNexus.html` dev harness**: uses CDN React + in-browser Babel for instant browser iteration without a build step. Production build uses esbuild-transpiled output.
- **`retainContextWhenHidden`**: the WebviewPanel keeps its state when hidden, avoiding re-render on panel switch.
