/**
 * react-shim.js — injected by esbuild into every module in the bundle.
 * Maps the bare `React` and `ReactDOM` identifiers to the npm packages
 * so components can reference them without an explicit import statement.
 *
 * esbuild `inject` makes these exports available as if they were declared
 * at the top of every bundled file. Combined with `bundle: true` (no
 * `external: ['react', 'react-dom']`), React is fully included in the output.
 */

export { default as React } from 'react';
export { default as ReactDOM } from 'react-dom';
