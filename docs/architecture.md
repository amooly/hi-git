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
| **React 18** | UI components — bundled directly into `panel-bundle.js` via esbuild |
| **JSX / ES Modules** | Component authoring — `.jsx` source files use `export`/`import`; esbuild resolves the module graph and compiles JSX to `React.createElement()` calls |
| **Vanilla CSS** | All styling — no CSS-in-JS, no Tailwind. Heavy use of CSS custom properties |
| **Material Symbols Outlined** | Icon font |
| **Fira Code** | Monospace font via Google Fonts |
| **Inter** | Primary sans-serif font (local variable font files) |

## Folder Structure

```
hi-git/
├── src/
│   ├── shared/                   # Shared code across boundaries
│   │   └── types/                # Shared interfaces (no runtime code)
│   │       └── ...               # BranchSummaryEntry, TagSummaryEntry
│   │
│   ├── extension/                # Extension host TypeScript source
│   │   ├── extension.ts          # Entry point — activate(), wires services to panels
│   │   ├── vs-ui/               # VS Code API surface
│   │   │   ├── GraphPanel.ts     # Full-screen graph WebviewPanel
│   │   │   └── BranchProvider.ts # Activity bar sidebar WebviewView
│   │   ├── services/             # Business logic
│   │   │   └── ... 
│   │   ├── components/           # Encapsulates reusable logic
│   │   │   └── ...               
│   │   └── utilities/            # Stateless helper functions (no external I/O)
│   │       └── ...
│   │
│   └── webview/                  # Webview React source (ES Modules + JSX, bundled by esbuild)
│       ├── GitNexus.html         # Standalone dev harness (CDN React + browser only)
│       ├── app.jsx               # Entry point — mounts <App /> to #root
│       ├── components/           # React functional components
│       │   ├── GraphPanel.jsx    # Root panel: state, layout composition
│       │   ├── Header.jsx
│       │   ├── FilterBar.jsx
│       │   ├── CommitTable.jsx
│       │   └── ContextMenu.jsx
│       ├── constants/            # Static data definitions (no React or DOM logic)
│       │   └── contextMenuItems.js
│       ├── utils/                # Pure helper functions
│       │   └── authorUtils.js
│       ├── react-shim.js         # esbuild inject shim — makes React/ReactDOM available globally
│       ├── graph.js              # SVG graph edge computation (Bezier curves, lane layout)
│       ├── vscodeApi.ts          # VS Code postMessage wrapper (compiled separately)
│       └── styles.css            # All component styles + VS Code theme tokens
│
├── media/                        # Assets consumed by the webview at runtime
│   ├── icon.svg                  # Activity bar icon
│   └── webview/                  # GENERATED — esbuild output
│       ├── vscodeApi.js          # Compiled VS Code API wrapper
│       ├── panel-bundle.js       # Bundled React app (React + all components)
│       └── *.js.map              # Source maps
│
├── out/                          # GENERATED — compiled extension host
├── docs/                         # Project documentation
│   ├── architecture.md           # Project architecture, layers, and dependency rules
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
vs-ui/      →  services/   →  types/
vs-ui/      →  utilities/  →  types/
components/  →  (external providers: git CLI, file system, HTTP)
services/    →  components/
```

- `types/` — no imports from any internal layer
- `utilities/` — may only import from `types/`
- `components/` — adapters for external I/O; may import from `types/` and `utilities/`
- `services/` — business logic; may import from `components/`, `utilities/`, and `types/`
- `vs-ui/` — VS Code API surface; may import from `services/` and `utilities/`

Extension host and webview are fully isolated at runtime — they do not share utility functions. Communication is via `postMessage` only. However, both layers may use `import type` to consume interfaces from `src/shared/types/`.

## Webview Script Load Order

The webview loads three scripts in dependency order:

```
1. vscodeApi.js     ← window.vscodeAPI (compiled from vscodeApi.ts; must run before React mounts)
2. graph.js         ← window.GitGraph  (pure JS graph layout utility; no npm deps)
3. panel-bundle.js  ← self-contained React app (React 18 + ReactDOM + all components bundled by esbuild)
```

To add new webview functionality, add a `.jsx` file under `src/webview/components/` and import it from `GraphPanel.jsx` or `app.jsx`. esbuild will automatically include it in `panel-bundle.js`.

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

- **React bundled via esbuild inject**: React and ReactDOM are bundled directly into `panel-bundle.js` using `src/webview/react-shim.js` as an esbuild `inject` target. Components reference `React` and `ReactDOM` as identifiers without explicit imports, and esbuild links them to the bundled modules.
- **ES Modules in webview source**: All files under `src/webview/` use standard `export`/`import`. esbuild resolves the full module graph and emits a single self-contained IIFE (`panel-bundle.js`).
- **`vscodeApi.ts` compiled separately**: It must run *before* the React bundle mounts (it sets up `window.vscodeAPI`). It has no npm dependencies, so it stays as a standalone non-bundled output.
- **`src/webview/GitNexus.html` dev harness**: Uses CDN React + in-browser Babel for instant browser iteration without a build step. Production uses the esbuild bundle.
- **`retainContextWhenHidden`**: The WebviewPanel keeps its state when hidden, avoiding re-render on panel switch.
