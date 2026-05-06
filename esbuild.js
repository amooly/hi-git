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
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'out/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  minify: false,
  alias: {
    '@services': path.resolve(__dirname, 'src/services'),
    '@panels': path.resolve(__dirname, 'src/panels'),
    '@utilities': path.resolve(__dirname, 'src/utilities'),
    '@types': path.resolve(__dirname, 'src/types'),
  },
  plugins: [watchPlugin],
};

// ---------- Target 2: Webview JSX transpilation ----------
const jsxFiles = ['src/frontend/app.jsx', 'src/frontend/panel.jsx', 'src/frontend/network.jsx'];

const webviewConfig = {
  entryPoints: jsxFiles,
  outdir: 'media/webview',
  bundle: false,       // No bundling — just JSX transform
  format: 'iife',
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  sourcemap: true,
  minify: false,
  plugins: [watchPlugin],
};

// ---------- Copy React UMD vendor files ----------
function copyVendorFiles() {
  const vendorDir = path.join(__dirname, 'media', 'vendor');
  fs.mkdirSync(vendorDir, { recursive: true });

  const filesToCopy = [
    {
      src: path.join(__dirname, 'node_modules', 'react', 'umd', 'react.production.min.js'),
      dest: path.join(vendorDir, 'react.production.min.js'),
    },
    {
      src: path.join(__dirname, 'node_modules', 'react-dom', 'umd', 'react-dom.production.min.js'),
      dest: path.join(vendorDir, 'react-dom.production.min.js'),
    },
  ];

  for (const { src, dest } of filesToCopy) {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`  ✓ Copied ${path.basename(src)}`);
    } else {
      console.warn(`  ⚠ Missing: ${src}`);
    }
  }
}

// ---------- Build ----------
async function build() {
  console.log('🔨 Building Hi Git extension...\n');

  // Copy vendor files
  console.log('📦 Copying React vendor files...');
  copyVendorFiles();
  console.log('');

  if (isWatch) {
    console.log('👀 Watch mode — rebuilding on change...\n');

    const extCtx = await esbuild.context(extensionConfig);
    const webCtx = await esbuild.context(webviewConfig);

    await extCtx.watch();
    await webCtx.watch();

    console.log('  Extension host: watching src/**/*.ts');
    console.log('  Webview JSX:    watching src/frontend/**/*.jsx');
    console.log('');
  } else {
    // One-shot build
    console.log('⚡ Compiling extension host...');
    await esbuild.build(extensionConfig);
    console.log('  ✓ out/extension.js\n');

    console.log('⚡ Transpiling webview JSX...');
    await esbuild.build(webviewConfig);
    jsxFiles.forEach(f => {
      const base = path.basename(f, '.jsx');
      console.log(`  ✓ media/webview/${base}.js`);
    });
    console.log('\n✅ Build complete.');
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
