# Coding Conventions

> These conventions apply to ALL code in this project. Tool-specific conventions are in `docs/coding_conventions/`.

## Naming

- React component files use `.jsx` extension (in `src/webview/components/` or `src/webview/`).
- Extension host files use `.ts` extension (in `src/extension/`).
- The entire webview compiles to a single file: `src/webview/app.jsx` → `media/webview/panel-bundle.js`.

## Formatting

- TypeScript config uses `"module": "Node16"`.
- No CSS-in-JS, no Tailwind — all styling is vanilla CSS with heavy use of CSS custom properties.

## Patterns

### Cross-Boundary Communication

The extension host (`src/extension/`) and webview UI (`src/webview/`) run in separate environments.
- **Data Sharing**: Use `postMessage` exclusively.
- **Type Sharing**: You may share TypeScript types and interfaces between the extension and webview by placing them in `src/shared/types/` and using `import type` (type-only imports).
- **Utility Sharing Prohibited**: Do not share runtime utilities. The webview runs in the browser and the host in Node.js.
- **Request-Response**: When the webview needs data from the host, use the `requestId` pattern. Generate a unique `requestId` with the outgoing message, and the host must include the exact same `requestId` in its response to resolve the pending Promise.

- All webview modules use ES module `export`/`import` syntax. esbuild bundles the full module graph into `media/webview/panel-bundle.js` — do not expose components via `window.X` globals.
- Design tokens and VS Code semantic tokens are defined per-theme in `src/webview/styles.css`.
- Theme and view preferences are persisted to `localStorage` in the webview.

### Service singletons

Services in `src/services/` are instantiated once as module-level singletons. The class itself is not exported — only the instance is:

```ts
// src/services/MyService.ts
class MyService {
  getData() { ... }
}

export const myService = new MyService();
```

Consumers import the instance directly — they do not receive it via constructor injection:

```ts
// src/extension/vs-ui/MyPanel.ts
import { myService } from '@services/MyService.js';

// use myService.getData() directly — do not accept it as a parameter
```

The instance is created when the module is first imported, which happens inside `activate()` in `extension.ts`. There is no need to pass services through constructors or function parameters.

## Error Handling

<!-- How errors should be caught, logged, and surfaced. -->

## Testing

<!-- What to test, naming conventions for tests, where test files live. -->

## Import Paths

Always use path aliases instead of relative paths for imports across `src/` directories. The following aliases are configured in both `tsconfig.json` and `esbuild.js`:

| Alias | Resolves to |
|---|---|
| `@services/*` | `src/extension/services/*` |
| `@vs-ui/*` | `src/extension/vs-ui/*` |
| `@utilities/*` | `src/extension/utilities/*` |
| `@shared/*` | `src/shared/*` |

```ts
// correct
import { gitDataService } from '@services/GitDataService.js';
import { getNonce } from '@utilities/getNonce.js';

// wrong — use aliases, not relative paths
import { gitDataService } from '../services/GitDataService.js';
```

Keep the `.js` extension on alias imports (see Gotchas below).

## Gotchas

### `.js` extensions on TypeScript imports (required)

With `"module": "Node16"` in `tsconfig.json`, all imports **must** use `.js` extensions (pointing to the compiled output), even though source files are `.ts`:

```ts
// correct
import { getNonce } from '@utilities/getNonce.js';

// wrong — TypeScript won't resolve this under Node16
import { getNonce } from '@utilities/getNonce';
```

### Editing JSX requires a rebuild

The `.jsx` files in `src/webview/` are pre-transpiled by esbuild. After editing them, run `npm run compile` (or let `watch` mode pick it up) before changes appear in the webview.

### `src/webview/GitNexus.html` uses CDN React

The standalone HTML harness uses CDN React + Babel for rapid browser iteration only. The actual extension loads everything locally via `panel-bundle.js` (which includes React) to satisfy the webview CSP.

### `localStorage` in webviews

Theme and view preferences are stored in `localStorage`. To reset: open DevTools in the Extension Dev Host (Help → Toggle Developer Tools) and clear storage.

### Tweaks panel `postMessage` protocol

The `__activate_edit_mode` / `__edit_mode_set_keys` messages were designed for the browser-based design tool and are largely no-ops in VS Code — `window.parent` is the webview itself.

## Tool-Specific Conventions

<!-- Links to sub-files for specific tools/libraries: -->
<!-- - [esbuild](coding_conventions/esbuild.md) -->
