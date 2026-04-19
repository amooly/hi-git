# Hi Git - Project Principles and Guidelines

## Project Overview
This is a VS Code extension for visualizing Git graph and comparing branches/tags with an interactive webview UI.

## Folder Structure

### Source Code Organization (`/src`)
- `/src` - Root source directory
  - `extension.ts` - Main extension entry point with activation logic
  - `global.d.ts` - Global TypeScript type definitions

- `/src/commands` - Command handlers
  - `base.ts` - Base utility functions for commands
  - Each command in its own file (e.g., `compareWith.ts`, `showWorkspaceGitGraph.ts`)
  - Command handlers should be async functions

- `/src/const_def` - Constants and type definitions
  - Shared constants across the extension

- `/src/git` - Git service layer
  - `gitService.ts` - Main git operations and interactions
  - Encapsulate all git CLI interactions here

- `/src/model` - Data models
  - `git.ts` - Git-related data structures and types
  - Keep models separate from business logic

- `/src/panels` - Webview panel controllers
  - `GitGraphPanel.ts` - Workspace git graph panel
  - `HistoryPanel.ts` - File/directory history panel
  - Panels manage webview lifecycle and communication

- `/src/providers` - VS Code tree view providers
  - `CommitDetailsProvider.ts` - Commit details tree provider
  - `DirectoryDiffProvider.ts` - Directory diff tree provider
  - Implement VS Code provider interfaces

- `/src/vscode` - VS Code integration utilities
  - `extensionVariable.ts` - Extension context and state management
  - VS Code-specific helpers

- `/src/webview` - Webview UI components
  - `common.ts` - Shared webview utilities
  - `/gitGraph` - Git graph visualization (React + TypeScript)
  - `/gitHistory` - Git history visualization (React + TypeScript)
  - Each webview has its own `index.tsx`, component files, and `index.css`

### Root Configuration Files
- `package.json` - Extension manifest and dependencies
- `tsconfig.json` - TypeScript compiler configuration
- `webpack.config.js` - Webpack bundling configuration
- `README.md` - Project documentation

## Coding Standards

### TypeScript
- **Always use TypeScript** for all source files
- Use **strict mode** (`strict: true` in tsconfig.json)
- Target ES6 or higher
- Explicit return types for exported functions
- Avoid using `any` - use proper types or `unknown`

### Naming Conventions
- **Files**: camelCase (e.g., `gitService.ts`, `compareWith.ts`)
- **Classes/Interfaces/Types**: PascalCase (e.g., `GitGraphPanel`, `HistoryPanel`)
- **Functions/Variables**: camelCase (e.g., `handleShowWorkspaceGitGraph`)
- **Constants**: UPPER_SNAKE_CASE for true constants
- **React Components**: PascalCase (e.g., `GitGraph.tsx`, `HistoryView.tsx`)

### Code Organization
- **One primary export per file** (class, function, or service)
- **Group related functionality** in the same directory
- **Separate concerns**: UI (webview) from business logic (commands, services)
- **Use absolute imports** from `vscode` module
- **Use relative imports** for project files

### VS Code Extension Patterns
- Register all commands in `extension.ts` activation function
- Add all disposables to `context.subscriptions`
- Use singleton pattern for services (e.g., `gitService`)
- Initialize extension variables via `InitExtensionVariables`
- Check workspace availability before operations
- Show user-friendly messages for errors using `vscode.window.showWarningMessage`

### Command Handlers
- Place command handlers in `/src/commands`
- Commands should be async functions
- Commands should validate inputs before processing
- Use `gitService` for all git operations
- Check if files/folders are tracked before operations
- Provide meaningful error messages to users

### Panels and Webviews
- Create panel classes extending base webview panel patterns
- Use static `createOrShow` methods for singleton panels
- Handle webview lifecycle (creation, disposal, visibility)
- Communicate with webviews using message passing
- Keep webview HTML generation in panel classes

### React Components (Webviews)
- Use React with TypeScript (`.tsx` files)
- Keep components in `/src/webview/<feature>/`
- Each webview feature has: `index.tsx` (entry), components, and `index.css`
- Use functional components with hooks
- Type all props interfaces

### Error Handling
- Always check for workspace folders existence
- Validate git repository before operations
- Use try-catch for async operations
- Show user-friendly error messages
- Log errors to console for debugging

### Git Operations
- Centralize all git operations in `gitService`
- Don't execute git commands directly in UI code
- Check file/folder tracked status before operations
- Handle git errors gracefully
- Return meaningful error messages

## File Creation Guidelines

### Creating New Commands
1. Create file in `/src/commands/<commandName>.ts`
2. Export an async handler function
3. Register command in `extension.ts`
4. Add command to `package.json` contributes section
5. Validate inputs and check git status
6. Use `gitService` for git operations

### Creating New Panels
1. Create file in `/src/panels/<PanelName>Panel.ts`
2. Implement singleton pattern with `createOrShow`
3. Handle webview lifecycle
4. Implement message passing with webview
5. Generate HTML content for webview

### Creating New Providers
1. Create file in `/src/providers/<ProviderName>Provider.ts`
2. Implement VS Code provider interface
3. Export singleton instance
4. Register in `extension.ts`

### Creating New Webviews
1. Create folder `/src/webview/<featureName>/`
2. Create `index.tsx` as entry point
3. Create component files (e.g., `<FeatureName>View.tsx`)
4. Create `index.css` for styles
5. Use TypeScript for all components

## Dependencies
- Use `vscode` API for all VS Code interactions
- Keep dependencies minimal and necessary
- Document why external dependencies are needed

## Comments and Documentation
- Add JSDoc comments for exported functions and classes
- Document non-obvious logic with inline comments
- Keep comments concise and meaningful
- Update comments when code changes

## Testing and Quality
- Validate all user inputs
- Check workspace state before operations
- Handle edge cases (no workspace, not a git repo, untracked files)
- Test commands from both Explorer context menu and command palette

## Build and Distribution
- Use webpack for bundling
- Output to `/dist` directory
- Source maps enabled for debugging
- Exclude test and config files from distribution


## Rule
- Arrange the code based on the `Source Code Organization` section.
  - Constants go into const_def;
  - Models go into model;