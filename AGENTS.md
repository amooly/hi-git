<!-- Managed by consult. Edit directly or use /consult:add-to to add new knowledge. -->
# Project Instructions

> This file is the single source of truth for AI agents working in this project.
> Human-readable documentation lives in `docs/` and is referenced below.

## Architecture
→ See [docs/architecture.md](docs/architecture.md) for tech stack, layers, folder structure, and dependency rules.

Key constraints for AI agents:
- Edit only `src/` (extension host) and `src/frontend/` (webview UI). Never edit `media/vendor/`, `media/webview/`, or `out/` — these are generated.
- Extension host ↔ webview communication is via `postMessage` only. No shared imports across the boundary.
- The webview has no bundler at runtime. New modules must be exposed as `window.X` globals and added to the script load order in the HTML template.

## Coding Conventions
→ See [docs/coding_conventions.md](docs/coding_conventions.md) for global coding patterns, style rules, and gotchas.

Key constraints for AI agents:
- All relative TypeScript imports in `src/` must use `.js` extensions (Node16 module resolution).
- After editing any `.jsx` file in `src/frontend/`, the project must be rebuilt (`npm run compile`) before changes are visible in VS Code.
- No CSS-in-JS, no Tailwind. All styles go in `src/frontend/styles.css` using CSS custom properties.

## Rules
- Never add external CDN script sources — the webview CSP blocks them. Ship dependencies as local files in `media/vendor/`.
- Do not modify `README.md` — it is the human-facing doc and is maintained separately from this AI instruction structure.
- The build command is `npm run compile`. Watch mode is `npm run watch`. To test in VS Code: press F5 to launch the Extension Development Host.
