// esbuild.js — Build script for Hi Git VS Code extension
// Handles two targets:
//   1. Extension host: TypeScript → JS (bundled)
//   2. Webview JSX: JSX → JS (transpile only, no bundling)

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');

// ---------- Watch Plugin ----------
const watchPlugin = {
  name: 'watch-plugin',
  setup(build) {
    build.onStart(() => {
      console.log('[watch] build started');
    });
    build.onEnd(result => {
      if (result.errors && result.errors.length > 0) {
        console.log(`[watch] build finished with ${result.errors.length} errors`);
      } else {
        console.log('[watch] build finished');
      }
    });
  },
};

// ---------- Target 1: Extension host ----------
const extensionConfig = {
  entryPoints: ['src/extension/extension.ts'],
  bundle: true,
  outfile: 'out/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  minify: false,
  alias: {
    '@services': path.resolve(__dirname, 'src/extension/services'),
    '@vs-ui': path.resolve(__dirname, 'src/extension/vs-ui'),
    '@utilities': path.resolve(__dirname, 'src/extension/utilities'),
    '@shared': path.resolve(__dirname, 'src/shared'),
  },
  plugins: [watchPlugin],
};

// ---------- Target 2a: VSCode API wrapper (no bundling — exposes window.vscodeAPI) ----------
const vscodeApiConfig = {
  entryPoints: ['src/webview/vscodeApi.ts'],
  outfile: 'media/webview/vscodeApi.js',
  bundle: false,
  format: 'iife',
  sourcemap: true,
  minify: false,
  plugins: [watchPlugin],
};

// ---------- Target 2b: Webview React bundle ----------
// React and ReactDOM are bundled directly into the output via the inject shim.
// No UMD script tags needed — everything is self-contained in panel-bundle.js.
const panelBundleConfig = {
  entryPoints: ['src/webview/app.jsx'],
  outfile: 'media/webview/panel-bundle.js',
  bundle: true,
  format: 'iife',
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  sourcemap: true,
  minify: false,
  // Inject the React shim so components can reference React/ReactDOM as globals
  // without needing an explicit import statement in every file.
  inject: ['./src/webview/react-shim.js'],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  plugins: [watchPlugin],
};

// ---------- Build ----------
async function build() {
  console.log('🔨 Building Hi Git extension...\n');

  if (isWatch) {
    console.log('👀 Watch mode — rebuilding on change...\n');

    const extCtx        = await esbuild.context(extensionConfig);
    const apiCtx        = await esbuild.context(vscodeApiConfig);
    const bundleCtx     = await esbuild.context(panelBundleConfig);

    await extCtx.watch();
    await apiCtx.watch();
    await bundleCtx.watch();

    console.log('  Extension host: watching src/extension/**/*.ts');
    console.log('  Webview API:    watching src/webview/vscodeApi.ts');
    console.log('  Webview bundle: watching src/webview/**/*.jsx');
    console.log('');
  } else {
    // One-shot build
    console.log('⚡ Compiling extension host...');
    await esbuild.build(extensionConfig);
    console.log('  ✓ out/extension.js\n');

    console.log('⚡ Transpiling VSCode API wrapper...');
    await esbuild.build(vscodeApiConfig);
    console.log('  ✓ media/webview/vscodeApi.js\n');

    console.log('⚡ Bundling webview React components...');
    await esbuild.build(panelBundleConfig);
    console.log('  ✓ media/webview/panel-bundle.js\n');

    console.log('✅ Build complete.');

  // Copy styles.css to media/webview so it ships in the .vsix
  const stylesSrc = path.resolve(__dirname, 'src', 'webview', 'styles.css');
  const stylesDest = path.resolve(__dirname, 'media', 'webview', 'styles.css');
  fs.mkdirSync(path.dirname(stylesDest), { recursive: true });
  fs.copyFileSync(stylesSrc, stylesDest);
  console.log('  ✓ media/webview/styles.css\n');
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
