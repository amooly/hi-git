<!-- Managed by consult. Edit directly or use /consult:add-to to add new knowledge. -->
# Project Instructions

> This file is the single source of truth for AI agents working in this project.
> Human-readable documentation lives in `docs/` and is referenced below.

## Architecture
→ See [docs/architecture.md](docs/architecture.md) for tech stack, layers, folder structure, and dependency rules.

Key constraints for AI agents:
- Edit only `src/extension/` (extension host) and `src/webview/` (webview UI). Never edit `media/vendor/`, `media/webview/`, or `out/` — these are generated.
- Extension host ↔ webview communication is via `postMessage` only. Shared TypeScript types/interfaces are allowed via `import type`, but shared runtime utilities are strictly prohibited.
- The webview source uses **ES Modules**. New React components go in `src/webview/components/`. Static data/constants go in `src/webview/constants/`. Pure helper functions go in `src/webview/utils/`. The entire webview is bundled by esbuild into `media/webview/panel-bundle.js` — do not add new `<script>` tags for individual component files.
- `src/extension/utilities/` is for stateless helper functions with no external I/O. `src/extension/components/` is for adapters that invoke external providers (git, file system, HTTP). Do not place I/O-capable code in `utilities/`, and do not place pure functions in `components/`.

## Documentation
→ See [docs/features/](docs/features/) for feature-level data flows and API docs.

Key constraints for AI agents:
- `docs/architecture.md` is the single source of truth for project structure, layer definitions, folder purposes, and dependency rules. Do not duplicate this information in feature docs or any other file.
- Feature docs in `docs/features/` describe behaviors, data flows, and public APIs — not folder structure or layer boundaries. Link to `architecture.md` instead of re-stating it.

## Coding Conventions
→ See [docs/coding_conventions.md](docs/coding_conventions.md) for global coding patterns, style rules, and gotchas.

Key constraints for AI agents:
- All relative TypeScript imports in `src/extension/` must use `.js` extensions (Node16 module resolution).
- After editing any `.jsx` file in `src/webview/`, the project must be rebuilt (`npm run compile`) before changes are visible in VS Code.
- No CSS-in-JS, no Tailwind. All styles go in `src/webview/styles.css` using CSS custom properties.

## Rules
- Never add external CDN script sources — the webview CSP blocks them. Ship dependencies as local files in `media/vendor/`.
- Do not modify `README.md` — it is the human-facing doc and is maintained separately from this AI instruction structure.
- The build command is `npm run compile`. Watch mode is `npm run watch`. To test in VS Code: press F5 to launch the Extension Development Host.
