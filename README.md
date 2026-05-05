# Hi Git

> **A beautiful Git graph visualization extension for VS Code.**
> Browse commit history, branch relations, and repository structure — all within a richly styled webview panel.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Folder Structure](#folder-structure)
3. [Development Instructions](#development-instructions)
4. [UI Explanation](#ui-explanation)
5. [Architecture & Data Flow](#architecture--data-flow)
6. [Design System](#design-system)
7. [Extension Manifest](#extension-manifest)
8. [Known Gotchas](#known-gotchas)

---

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
| **Material Symbols Outlined** | Icon font (used as a substitute for VS Code's codicon set) |
| **Fira Code** | Monospace font via Google Fonts |
| **Inter** | Primary sans-serif font (local variable font files) |

> **Why UMD React?** VS Code webviews run in a strict Content Security Policy sandbox. External CDN scripts are blocked. React is shipped as prebuilt UMD globals (`window.React`, `window.ReactDOM`) copied from `node_modules` at build time.

---

## Folder Structure

```
hi-git/
│
├── src/                          # Extension host TypeScript source
│   ├── extension.ts              # Entry point — activate(), registers commands & views
│   ├── panels/
│   │   ├── HiGitPanel.ts         # Manages the full-screen graph WebviewPanel
│   │   └── HiGitSidebarProvider.ts  # Manages the activity bar sidebar WebviewView
│   └── utilities/
│       └── getNonce.ts           # CSP nonce generator
│
├── frontend/                     # Webview React source (authored as JSX)
│   ├── GitNexus.html             # Standalone dev harness (open directly in browser)
│   ├── app.jsx                   # Root React component + VSCode chrome wrapper
│   ├── panel.jsx                 # Main commits table, header, filter bar, detail panel
│   ├── network.jsx               # Branch Relations "river" SVG view
│   ├── data.js                   # Static sample repo data (COMMITS, BRANCHES, etc.)
│   ├── graph.js                  # SVG graph edge computation (Bezier curves, lane layout)
│   ├── styles.css                # All component styles + VSCode dark/light theme tokens
│
├── media/                        # Generated/static assets consumed by the webview at runtime
│   ├── icon.svg                  # Activity bar icon (Hi Git sidebar entry)
│   ├── vendor/                   # ⚙ GENERATED — React 18 UMD production builds
│   │   ├── react.production.min.js
│   │   └── react-dom.production.min.js
│   └── webview/                  # ⚙ GENERATED — esbuild JSX transpilation output
│       ├── app.js
│       ├── panel.js
│       └── network.js
│
├── out/                          # ⚙ GENERATED — compiled extension host
│   └── extension.js
│
├── .vscode/
│   ├── launch.json               # F5 Extension Development Host config
│   └── tasks.json                # Build tasks (watch / compile)
│
├── esbuild.js                    # Build script (extension host + JSX + vendor copy)
├── package.json                  # Extension manifest + npm config
├── tsconfig.json                 # TypeScript config
├── .vscodeignore                 # Files excluded from .vsix package
└── .gitignore
```

> **Do not edit files in `media/vendor/`, `media/webview/`, or `out/`** — these are generated at build time and are git-ignored. Edit the source files in `frontend/` and `src/` instead.

---

## Development Instructions

### Prerequisites

- Node.js v18+ (via [nvm](https://github.com/nvm-sh/nvm) recommended)
- VS Code 1.85+

### First-time setup

```bash
# Install all dependencies (React, TypeScript, esbuild, vsce)
npm install
```

### Build

```bash
# One-shot build (compile TS + transpile JSX + copy vendor files)
npm run compile

# Watch mode — auto-rebuilds on any change in src/ or frontend/
npm run watch
```

### Run & Debug

1. Open this folder in VS Code
2. Press **F5** — this launches an **Extension Development Host** window with Hi Git loaded
3. In the new window, open the **Command Palette** (`Cmd+Shift+P`) and run **"Hi Git: Show Graph"**
4. Or click the **Hi Git icon** in the activity bar to open the sidebar

> **Tip:** With `npm run watch` running in the background, changes to `src/` or `frontend/` trigger an automatic rebuild. Reload the Extension Development Host window (`Cmd+R`) to see changes.

### Working on the frontend (UI)

The easiest frontend development loop is to **open `frontend/GitNexus.html` directly in a browser** — this bypasses the extension entirely and uses CDN React + in-browser Babel for instant iteration (no build step needed). Once you're happy, the production build will transpile the JSX.

```
# In browser: open frontend/GitNexus.html
# Live refresh, no build needed, CDN React + Babel
#
# Then when ready to test in VS Code:
npm run compile   # or watch mode will pick it up automatically
# F5 → reload Extension Dev Host
```

### Package for distribution

```bash
npx vsce package
# Outputs: hi-git-0.0.1.vsix
```

---

## UI Explanation

The extension has two surfaces:

### 1. Sidebar (Activity Bar)

The Hi Git icon in the activity bar opens a compact sidebar panel showing:

- **Branches** — list of all local branches with color-coded dots indicating their type (main, feature, hotfix, etc.) and ahead/behind indicators
- **Tags** — list of version tags
- **"Show Full Graph" button** — opens the main graph panel

The sidebar communicates with the extension host via `postMessage` to trigger the `hi-git.showGraph` command.

### 2. Graph Panel (`Hi Git: Show Graph`)

The main full-screen panel has three sub-views switchable from the header:

#### Commit History View (default)

A scrollable table of commits showing:

| Column | Contents |
|---|---|
| **Graph** | SVG lane visualization with Bezier edges + branch ref pills |
| **SHA** | Short commit hash (monospaced pill) |
| **Message** | Commit subject line + merge indicator |
| **Author** | Avatar (initials + deterministic hue) + name |
| **Date** | Relative date (hover for absolute) |

- **Click a row** — opens the Detail Panel (slides in from the right) showing SHA, branch, author, parents, refs, and changed files
- **Right-click a row** — opens a context menu with actions: copy SHA/message, compare, checkout, create branch/tag, revert, reset, open remote

#### Branch Relations View (Network)

A high-level bird's-eye SVG showing:
- The **main trunk** as a vertical line
- **Branch tracks** spurring off and (optionally) merging back in
- **Smooth Bezier curves** at spawn and merge points
- **Status indicators** — open branches have a glowing dot cap, merged branches have a diamond cap, in-progress use a dashed line

#### Filter Bar

A collapsible row above the table with inputs for:
- **SHA** — prefix/substring match
- **Message** — searches commit message text and ref names (branches, tags)
- **Author** — substring match
- **Date** — matches relative or absolute date strings

Filtered-out rows animate out smoothly (180ms height + opacity transition) without re-rendering the DOM.

#### Header Controls

| Button | Action |
|---|---|
| `filter_alt` | Toggle the filter bar |
| `refresh` | Simulated refresh (spin animation) |
| `light_mode` / `dark_mode` | Toggle dark/light theme (persisted to `localStorage`) |
| `open_in_new` | Show remote URL tooltip |
| `account_tree` / `list_alt` | Toggle between Commit History and Branch Relations views |

#### Tweaks Panel

An in-prototype edit panel (activated via `postMessage` from the parent frame) that lets you live-adjust:
- Theme
- Row density (compact / cozy / comfortable)
- Graph node style (dot / square / ring)
- View
- Filter bar visibility
- VS Code chrome visibility (legacy — disable the fake chrome wrapper)

---

## Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                   Extension Host (Node.js)               │
│                                                         │
│   extension.ts                                          │
│   ├── Registers: 'hi-git.showGraph' command             │
│   └── Registers: 'hi-git.sidebarView' webview view      │
│                                                         │
│   HiGitPanel.ts                                         │
│   ├── Creates WebviewPanel (retainContextWhenHidden)    │
│   ├── Sets localResourceRoots: [frontend/, media/]      │
│   └── Generates HTML with CSP nonce + webview URIs      │
│                                                         │
│   HiGitSidebarProvider.ts                               │
│   ├── Implements WebviewViewProvider                    │
│   └── Handles postMessage: 'showGraph' → executeCommand │
└─────────────────────────────────────────────────────────┘
         │ webview.asWebviewUri()       ▲ postMessage
         ▼                             │
┌─────────────────────────────────────────────────────────┐
│                   Webview (Browser sandbox)              │
│                                                         │
│   Script load order:                                    │
│   1. react.production.min.js   → window.React          │
│   2. react-dom.production.min.js → window.ReactDOM     │
│   3. data.js                   → window.GITNEXUS_DATA  │
│   4. graph.js                  → window.GitGraph       │
│   5. network.js                → window.BranchRelationsView │
│   6. panel.js                  → window.GitNexusPanel  │
│   7. app.js                    → mounts <App /> to #root│
└─────────────────────────────────────────────────────────┘
```

### Content Security Policy

The webview uses a strict CSP that:
- Blocks all external requests except Google Fonts (for Fira Code + Material Symbols)
- Requires a per-load nonce on every `<script>` tag
- Only allows styles from the extension's resource root + Google Fonts CDN

```
default-src 'none';
style-src   {webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com;
font-src    {webview.cspSource} https://fonts.gstatic.com;
script-src  'nonce-{nonce}';
img-src     {webview.cspSource};
```

---

## Design System

VS Code-specific semantic tokens and foundational tokens are defined per-theme in `styles.css`.

### Theme Tokens

| Token | Dark+ | Light+ |
|---|---|---|
| `--vsc-editor-bg` | `#1E1E1E` | `#FFFFFF` |
| `--vsc-fg-1` | `#CCCCCC` | `#333333` |
| `--vsc-list-active-bg` | `#094771` | `#0060C0` |
| `--vsc-statusbar-bg` | `#007ACC` | `#007ACC` |

### Branch Colors

| Branch type | Dark | Light |
|---|---|---|
| `main` | `#4FC1FF` (cyan-blue) | `#0066BF` |
| `develop` | `#C586C0` (purple) | `#8B2EA8` |
| `feature/*` | `#9CDCFE` (light blue) | `#2982EA` |
| `release/*` | `#DCDCAA` (yellow-tan) | `#B89500` |
| `hotfix/*` | `#F48771` (coral) | `#D7291C` |
| `experiment/*` | `#4EC9B0` (teal) | `#047C89` |

### Motion Tokens

| Token | Value |
|---|---|
| `--gx-dur-fast` | 120ms |
| `--gx-dur-base` | 180ms |
| `--gx-dur-slow` | 240ms |
| `--gx-ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` |

---

## Extension Manifest

Key fields in `package.json`:

```jsonc
{
  "name": "hi-git",
  "displayName": "Hi Git",
  "publisher": "Mooly",
  "engines": { "vscode": "^1.85.0" },
  "main": "./out/extension.js",    // compiled by esbuild
  "contributes": {
    "commands": [
      { "command": "hi-git.showGraph", "title": "Hi Git: Show Graph" }
    ],
    "viewsContainers": {
      "activitybar": [{ "id": "hi-git", "icon": "media/icon.svg" }]
    },
    "views": {
      "hi-git": [{ "type": "webview", "id": "hi-git.sidebarView" }]
    }
  }
}
```

---

## Known Gotchas

### `.js` extensions on TypeScript imports
With `"module": "Node16"` in `tsconfig.json`, all relative imports **must** use `.js` extensions (pointing to the compiled output), even though the source files are `.ts`:
```ts
// ✅ correct
import { getNonce } from '../utilities/getNonce.js';

// ❌ wrong — TypeScript won't resolve this under Node16
import { getNonce } from '../utilities/getNonce';
```

### Editing JSX requires a rebuild
The `.jsx` files in `frontend/` are pre-transpiled by esbuild. After editing them, you must rebuild (`npm run compile` or let `watch` mode pick it up) before the changes appear in the webview.

### `frontend/GitNexus.html` uses CDN React
The standalone HTML harness uses CDN-hosted React + Babel for rapid browser-based iteration. This is **only for development** — the actual extension loads everything locally to satisfy the webview CSP.

### `localStorage` in webviews
The webview stores theme and view preferences in `localStorage`. If you need to reset them, open DevTools in the Extension Dev Host (Help → Toggle Developer Tools) and clear storage.

### `window.parent.postMessage` in the Tweaks panel
The Tweaks panel protocol (`__activate_edit_mode`, `__edit_mode_set_keys`) was designed for the browser-based design tool and is largely a no-op in the VS Code webview context — `window.parent` is the webview itself.
