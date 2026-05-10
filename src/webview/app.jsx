/* GitNexus — VSCode shell + app entry */

import { GraphPanel } from './components/GraphPanel.jsx';

/* hooks: use React.useX directly to avoid cross-file collisions */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfortable",
  "nodeStyle": "dot",
  "showFilters": true,
  "showVscChrome": false
}/*EDITMODE-END*/;

const FALLBACK_DATA = {
  COMMITS: [
    { sha: '0000000', lane: 0, branch: 'main', parents: [], refs: [{type: 'branch', name: 'main', current: true}], msg: 'No data (VS Code API not found)', author: 'System', email: '', date: '', dateAbs: '' }
  ],
  BRANCHES: { 'main': { lane: 0, color: '#4FC1FF', label: 'main' } },
  BRANCH_COLORS: { main: '#4FC1FF' },
  BRANCH_RELATIONS: { trunk: 'main', branches: [{ name: 'main', lane: 0, color: '#4FC1FF', commits: 1, status: 'current', mergesInto: null, spawnedFrom: null, spawnAt: null }] }
};



function App() {
  const [theme, setTheme] = React.useState(() => localStorage.getItem('gx-theme') || 'dark');

  const [density, setDensity] = React.useState(TWEAK_DEFAULTS.density);
  const [nodeStyle, setNodeStyle] = React.useState(TWEAK_DEFAULTS.nodeStyle);
  const [showFilters, setShowFilters] = React.useState(TWEAK_DEFAULTS.showFilters);
  const [showVscChrome, setShowVscChrome] = React.useState(TWEAK_DEFAULTS.showVscChrome);
  const [editMode, setEditMode] = React.useState(false);
  const [repoData, setRepoData] = React.useState(null);

  React.useEffect(() => {
    // Attempt to load from Extension Host, fallback to minimal error state
    if (window.vscodeAPI && window.vscodeAPI.request) {
      window.vscodeAPI.request('getRepoData')
        .then(data => {
          if (data) {
             setRepoData(data);
          } else {
             // Fallback to minimal state if empty response
             setRepoData(FALLBACK_DATA);
          }
        })
        .catch(err => {
          console.error('[Webview] Failed to load repo data', err);
          setRepoData(FALLBACK_DATA);
        });
    } else {
      setRepoData(FALLBACK_DATA);
    }
  }, []);

  React.useEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('gx-theme', theme); }, [theme]);


  // Tweaks protocol
  React.useEffect(() => {
    const onMsg = (e) => {
      if (e.data?.type === '__activate_edit_mode') setEditMode(true);
      if (e.data?.type === '__deactivate_edit_mode') setEditMode(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const persist = (edits) => {
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits }, '*');
  };

  const rowH = density === 'compact' ? 28 : density === 'cozy' ? 32 : 36;

  if (!repoData) {
    return <div style={{ padding: 20 }}>Loading repository data...</div>;
  }

  const panel = (
    <GraphPanel
      data={repoData}
      theme={theme}
      onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
      rowH={rowH}
      density={density}
      nodeStyle={nodeStyle}
      showFilters={showFilters}
      onToggleFilters={() => setShowFilters(s => !s)}
    />
  );

  return (
    <>
      {showVscChrome ? <VSCodeChrome>{panel}</VSCodeChrome> : panel}

      {editMode && (
        <div className="tweaks">
          <div className="tweaks-header">Tweaks</div>
          <div className="tweaks-body">
            <div className="tweak-row">
              <label>Theme</label>
              <div className="tweak-segmented">
                {['dark', 'light'].map(t => (
                  <button key={t} className={theme === t ? 'active' : ''} onClick={() => setTheme(t)}>{t}</button>
                ))}
              </div>
            </div>
            <div className="tweak-row">
              <label>Row density</label>
              <div className="tweak-segmented">
                {['compact', 'cozy', 'comfortable'].map(d => (
                  <button key={d} className={density === d ? 'active' : ''}
                    onClick={() => { setDensity(d); persist({ density: d }); }}>{d}</button>
                ))}
              </div>
            </div>
            <div className="tweak-row">
              <label>Graph node</label>
              <div className="tweak-segmented">
                {['dot', 'square', 'ring'].map(s => (
                  <button key={s} className={nodeStyle === s ? 'active' : ''}
                    onClick={() => { setNodeStyle(s); persist({ nodeStyle: s }); }}>{s}</button>
                ))}
              </div>
            </div>

            <div className="tweak-row">
              <label>Filter bar</label>
              <div className="tweak-segmented">
                <button className={showFilters ? 'active' : ''}
                  onClick={() => { setShowFilters(true); persist({ showFilters: true }); }}>shown</button>
                <button className={!showFilters ? 'active' : ''}
                  onClick={() => { setShowFilters(false); persist({ showFilters: false }); }}>collapsed</button>
              </div>
            </div>
            <div className="tweak-row">
              <label>VSCode chrome</label>
              <div className="tweak-segmented">
                <button className={showVscChrome ? 'active' : ''}
                  onClick={() => { setShowVscChrome(true); persist({ showVscChrome: true }); }}>shown</button>
                <button className={!showVscChrome ? 'active' : ''}
                  onClick={() => { setShowVscChrome(false); persist({ showVscChrome: false }); }}>hidden</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function VSCodeChrome({ children }) {
  return (
    <div className="app">
      <div className="titlebar">
        <div className="titlebar-menu">
          <span>File</span><span>Edit</span><span>Selection</span><span>View</span>
          <span>Go</span><span>Run</span><span>Terminal</span><span>Help</span>
        </div>
        <div className="titlebar-title">vscode-extension — GitNexus</div>
        <div className="titlebar-actions">
          <span className="codicon">remove</span>
          <span className="codicon">crop_square</span>
          <span className="codicon">close</span>
        </div>
      </div>

      <div className="activitybar">
        <div className="activitybar-item"><span className="codicon">folder</span></div>
        <div className="activitybar-item"><span className="codicon">search</span></div>
        <div className="activitybar-item active"><span className="codicon">account_tree</span></div>
        <div className="activitybar-item"><span className="codicon">bug_report</span></div>
        <div className="activitybar-item"><span className="codicon">extension</span></div>
        <div className="activitybar-spacer" />
        <div className="activitybar-item"><span className="codicon">person</span></div>
        <div className="activitybar-item"><span className="codicon">settings</span></div>
      </div>

      <div className="sidebar">
        <div className="sidebar-title">
          <span>Source Control</span>
          <span className="codicon" style={{ fontSize: 14, color: 'var(--vsc-fg-2)' }}>more_horiz</span>
        </div>
        <div className="sidebar-section">
          <div className="sidebar-section-title">
            <span className="codicon" style={{ fontSize: 11 }}>chevron_right</span>
            Changes (3)
          </div>
          <div className="sidebar-item"><span className="codicon">description</span>panel.jsx<span className="sidebar-item-meta" style={{ color: 'var(--vsc-fg-warning)' }}>M</span></div>
          <div className="sidebar-item"><span className="codicon">description</span>graph.js<span className="sidebar-item-meta" style={{ color: 'var(--vsc-fg-success)' }}>U</span></div>
          <div className="sidebar-item"><span className="codicon">description</span>styles.css<span className="sidebar-item-meta" style={{ color: 'var(--vsc-fg-warning)' }}>M</span></div>
        </div>
        <div className="sidebar-section">
          <div className="sidebar-section-title">
            <span className="codicon" style={{ fontSize: 11 }}>expand_more</span>
            Branches (7)
          </div>
          <div className="sidebar-item current">
            <span className="branch-dot" style={{ background: 'var(--branch-main)' }} />
            main
            <span className="sidebar-item-meta">↑2 ↓0</span>
          </div>
          <div className="sidebar-item">
            <span className="branch-dot" style={{ background: 'var(--branch-develop)' }} />
            develop
            <span className="sidebar-item-meta">↓3</span>
          </div>
          <div className="sidebar-item">
            <span className="branch-dot" style={{ background: 'var(--branch-feature)' }} />
            feature/network-view
            <span className="sidebar-item-meta">↑2</span>
          </div>
          <div className="sidebar-item">
            <span className="branch-dot" style={{ background: 'var(--branch-feature)' }} />
            feature/graph-bezier
          </div>
          <div className="sidebar-item">
            <span className="branch-dot" style={{ background: 'var(--branch-release)' }} />
            release/2.4.0
          </div>
          <div className="sidebar-item">
            <span className="branch-dot" style={{ background: 'var(--branch-hotfix)' }} />
            hotfix/auth-token-refresh
          </div>
          <div className="sidebar-item">
            <span className="branch-dot" style={{ background: 'var(--branch-experiment)' }} />
            experiment/wasm-diff
          </div>
        </div>
        <div className="sidebar-section">
          <div className="sidebar-section-title">
            <span className="codicon" style={{ fontSize: 11 }}>expand_more</span>
            Tags (3)
          </div>
          <div className="sidebar-item"><span className="codicon" style={{ color: 'var(--branch-release)' }}>sell</span>v2.3.4</div>
          <div className="sidebar-item"><span className="codicon" style={{ color: 'var(--branch-release)' }}>sell</span>v2.3.3</div>
          <div className="sidebar-item"><span className="codicon" style={{ color: 'var(--branch-release)' }}>sell</span>v2.3.0</div>
        </div>
      </div>

      <div className="editor">
        <div className="tabs">
          <div className="tab active">
            <span className="codicon">account_tree</span>
            GitNexus
            <span className="codicon tab-close">close</span>
          </div>
          <div className="tab">
            <span className="codicon" style={{ color: 'var(--vsc-fg-string)' }}>description</span>
            README.md
            <span className="codicon tab-close">close</span>
          </div>
          <div className="tab">
            <span className="codicon" style={{ color: 'var(--vsc-fg-warning)' }}>description</span>
            package.json
            <span className="codicon tab-close">close</span>
          </div>
        </div>
        {children}
      </div>

      <div className="statusbar">
        <div className="statusbar-item"><span className="codicon">call_split</span>main*</div>
        <div className="statusbar-item"><span className="codicon">sync</span>2 ↓ 0 ↑</div>
        <div className="statusbar-item"><span className="codicon">error</span>0</div>
        <div className="statusbar-item"><span className="codicon">warning</span>0</div>
        <div className="statusbar-spacer" />
        <div className="statusbar-item">Ln 1, Col 1</div>
        <div className="statusbar-item">Spaces: 2</div>
        <div className="statusbar-item">UTF-8</div>
        <div className="statusbar-item">TypeScript React</div>
        <div className="statusbar-item"><span className="codicon">notifications</span></div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
