/* GitNexus — main commits panel (table + header + filter + context menu) */

/* hooks: use React.useX directly to avoid cross-file collisions */

function authorAvatarColor(name) {
  // deterministic hash → hue
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  return `hsl(${hue}, 45%, 45%)`;
}
function authorInitials(name) {
  return name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
}

function GitNexusPanel({
  data, theme, onToggleTheme, view, onToggleView,
  rowH, density, nodeStyle, showFilters, onToggleFilters,
}) {
  const [filters, setFilters] = React.useState({ sha:'', msg:'', author:'', date:'' });
  const [selectedSha, setSelectedSha] = React.useState(data.COMMITS[0].sha);
  const [contextMenu, setContextMenu] = React.useState(null); // {x,y,sha}
  const [refreshing, setRefreshing] = React.useState(false);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [hoverRemote, setHoverRemote] = React.useState(false);

  const tableWrapRef = React.useRef(null);

  // Filtering — keep DOM, but mark filtered-out rows so they animate out
  const filteredOut = React.useMemo(() => {
    const out = new Set();
    data.COMMITS.forEach(c => {
      if (filters.sha && !c.sha.toLowerCase().includes(filters.sha.toLowerCase())) out.add(c.sha);
      else if (filters.msg && !c.msg.toLowerCase().includes(filters.msg.toLowerCase()) &&
               !c.refs.some(r => r.name.toLowerCase().includes(filters.msg.toLowerCase()))) out.add(c.sha);
      else if (filters.author && !c.author.toLowerCase().includes(filters.author.toLowerCase())) out.add(c.sha);
      else if (filters.date && !c.date.toLowerCase().includes(filters.date.toLowerCase()) &&
               !c.dateAbs.toLowerCase().includes(filters.date.toLowerCase())) out.add(c.sha);
    });
    return out;
  }, [filters, data.COMMITS]);

  // Build SVG edges
  const { edges, graphWidth } = React.useMemo(
    () => window.GitGraph.buildEdges(data.COMMITS, rowH),
    [data.COMMITS, rowH]
  );
  const graphColW = Math.max(graphWidth + 180, 260); // graph + branch label space

  // Context menu close on outside click / scroll / esc
  React.useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    return () => { window.removeEventListener('click', close); window.removeEventListener('scroll', close, true); };
  }, [contextMenu]);

  const onRowContext = (e, sha) => {
    e.preventDefault();
    setSelectedSha(sha);
    setContextMenu({ x: e.clientX, y: e.clientY, sha });
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 700);
  };

  const onCopySha = (sha) => {
    navigator.clipboard?.writeText(sha);
    setContextMenu(null);
  };

  const selectedCommit = data.COMMITS.find(c => c.sha === selectedSha);

  if (view === 'network') {
    return (
      <div className="gx-panel">
        <Header
          theme={theme} onToggleTheme={onToggleTheme}
          view={view} onToggleView={onToggleView}
          onRefresh={onRefresh} refreshing={refreshing}
          showFilters={showFilters} onToggleFilters={onToggleFilters}
          hoverRemote={hoverRemote} setHoverRemote={setHoverRemote}
        />
        {React.createElement(window.BranchRelationsView, { data })}
      </div>
    );
  }

  return (
    <div className="gx-panel" style={{'--graph-col-w': `${graphColW}px`, '--row-h': `${rowH}px`}}>
      <Header
        theme={theme} onToggleTheme={onToggleTheme}
        view={view} onToggleView={onToggleView}
        onRefresh={onRefresh} refreshing={refreshing}
        showFilters={showFilters} onToggleFilters={onToggleFilters}
        hoverRemote={hoverRemote} setHoverRemote={setHoverRemote}
      />

      {/* Filter bar */}
      <div className={`gx-filterbar ${showFilters ? '' : 'collapsed'}`}>
        <div className="gx-filter-cell">
          <span className="codicon filter-icon">filter_alt</span>
          <span className="gx-filter-graph-label">Graph</span>
        </div>
        <div className="gx-filter-cell">
          <input className="gx-filter-input" placeholder="SHA" value={filters.sha}
                 onChange={e => setFilters({...filters, sha: e.target.value})} />
        </div>
        <div className="gx-filter-cell">
          <input className="gx-filter-input" placeholder="Filter messages, branches, tags…" value={filters.msg}
                 onChange={e => setFilters({...filters, msg: e.target.value})} />
        </div>
        <div className="gx-filter-cell">
          <input className="gx-filter-input" placeholder="Author" value={filters.author}
                 onChange={e => setFilters({...filters, author: e.target.value})} />
        </div>
        <div className="gx-filter-cell">
          <input className="gx-filter-input" placeholder="Date" value={filters.date}
                 onChange={e => setFilters({...filters, date: e.target.value})} />
        </div>
      </div>

      {/* Table header */}
      <div className="gx-table-wrap" ref={tableWrapRef}>
        <div className="gx-table">
          <div className="gx-thead">
            <div className="gx-th">Graph</div>
            <div className="gx-th">SHA</div>
            <div className="gx-th">Message</div>
            <div className="gx-th">Author</div>
            <div className="gx-th">Date</div>
          </div>
        </div>

        <div className="gx-rows" style={{position: 'relative'}}>
          {/* SVG graph overlay */}
          <svg className="gx-graph-svg"
               width={graphWidth}
               height={data.COMMITS.length * rowH}
               style={{height: data.COMMITS.length * rowH}}>
            {edges.map(e => (
              <path key={e.key} d={e.d} fill="none" stroke={e.color}
                    strokeWidth="2" strokeLinecap="round" />
            ))}
          </svg>

          {data.COMMITS.map((c, i) => {
            const out = filteredOut.has(c.sha);
            const branch = data.BRANCHES[c.branch];
            const isMerge = c.parents.length > 1;
            const x = window.GitGraph.laneX(c.lane);
            const y = i * rowH + rowH / 2;
            const nodeStyleProps = nodeStyle === 'square'
              ? { borderRadius: 2, width: 11, height: 11 }
              : nodeStyle === 'ring'
              ? { background: 'var(--vsc-editor-bg)', borderColor: branch.color, borderWidth: 3, width: 13, height: 13 }
              : { background: branch.color, borderColor: 'var(--vsc-editor-bg)' };

            return (
              <div
                key={c.sha}
                className={`gx-row ${selectedSha === c.sha ? 'selected' : ''} ${out ? 'filtered-out' : ''}`}
                onClick={() => { setSelectedSha(c.sha); setDetailOpen(true); }}
                onContextMenu={(e) => onRowContext(e, c.sha)}
              >
                {/* Graph cell */}
                <div className="gx-cell gx-cell-graph">
                  <div className="gx-graph-node"
                       style={{
                         left: x, top: '50%',
                         ...(isMerge && nodeStyle !== 'ring'
                            ? { background: 'var(--vsc-editor-bg)', borderColor: branch.color, borderWidth: 3 }
                            : nodeStyleProps)
                       }} />
                  <div className="gx-graph-label" style={{paddingLeft: x + 14}}>
                    {c.refs.map((r, ri) => (
                      <span key={ri}
                            className={`gx-ref ${r.type === 'tag' ? 'gx-ref-tag'
                                            : r.type === 'remote' ? 'gx-ref-remote' : 'gx-ref-branch'}`}
                            data-current={r.current ? 'true' : 'false'}
                            style={r.type !== 'tag' && r.type !== 'remote'
                              ? { '--branch-main': branch.color, color: branch.color,
                                  background: `color-mix(in srgb, ${branch.color} ${r.current ? 28 : 14}%, transparent)`,
                                  borderColor: r.current ? branch.color
                                    : `color-mix(in srgb, ${branch.color} 35%, transparent)` }
                              : {}}>
                        <span className="codicon">
                          {r.type === 'tag' ? 'sell'
                            : r.type === 'remote' ? 'cloud'
                            : 'call_split'}
                        </span>
                        {r.name}
                      </span>
                    ))}
                  </div>
                </div>
                {/* SHA */}
                <div className="gx-cell">
                  <span className="gx-sha-pill">{c.sha}</span>
                </div>
                {/* Message */}
                <div className="gx-cell" title={c.msg}>
                  {isMerge && <span className="codicon" style={{fontSize:13, color:'var(--vsc-fg-3)', flexShrink:0}}>merge</span>}
                  <span style={{overflow:'hidden', textOverflow:'ellipsis'}}>{c.msg.split('\n')[0]}</span>
                </div>
                {/* Author */}
                <div className="gx-cell">
                  <div className="gx-author">
                    <span className="gx-avatar" style={{background: authorAvatarColor(c.author)}}>
                      {authorInitials(c.author)}
                    </span>
                    <span style={{overflow:'hidden', textOverflow:'ellipsis'}}>{c.author}</span>
                  </div>
                </div>
                {/* Date */}
                <div className="gx-cell">
                  <span className="gx-meta" title={c.dateAbs}>{c.date}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && <ContextMenu menu={contextMenu} onCopySha={onCopySha} />}

      {/* Detail panel */}
      <DetailPanel
        open={detailOpen}
        commit={selectedCommit}
        onClose={() => setDetailOpen(false)}
        branch={selectedCommit ? data.BRANCHES[selectedCommit.branch] : null}
      />
    </div>
  );
}

function Header({ theme, onToggleTheme, view, onToggleView, onRefresh, refreshing,
                  showFilters, onToggleFilters, hoverRemote, setHoverRemote }) {
  return (
    <div className="gx-header">
      <div className="gx-header-left">
        <span className="gx-branch-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M11.75 2.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zM9.5 3.75a2.25 2.25 0 1 1 3 2.122V6a2.5 2.5 0 0 1-2.5 2.5h-3a1 1 0 0 0-1 1v.628a2.251 2.251 0 1 1-1.5 0V5.872a2.25 2.25 0 1 1 1.5 0v3.378A2.49 2.49 0 0 1 7 9h3a1 1 0 0 0 1-1v-.128A2.252 2.252 0 0 1 9.5 5.75v-2zM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zM3.5 3.75a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0z"
                  fill="currentColor"/>
          </svg>
        </span>
        <span className="gx-user">Developer</span>
        <span className="gx-repo">gitnexus / vscode-extension</span>
      </div>
      <div className="gx-header-spacer" />
      <div className="gx-header-right">
        <button className="gx-icon-btn" onClick={onToggleFilters}
                title="Toggle filters" aria-pressed={showFilters}>
          <span className="codicon">filter_alt</span>
        </button>
        <div className="gx-header-divider" />
        <button className={`gx-icon-btn ${refreshing ? 'spinning' : ''}`} onClick={onRefresh} title="Refresh">
          <span className="codicon">refresh</span>
        </button>
        <button className="gx-icon-btn" onClick={onToggleTheme} title="Toggle theme">
          <span className="codicon">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
        </button>
        <button className="gx-icon-btn"
                onMouseEnter={() => setHoverRemote(true)}
                onMouseLeave={() => setHoverRemote(false)}
                title="Open remote">
          <span className="codicon">open_in_new</span>
          <span className="gx-tooltip" style={{opacity: hoverRemote ? 1 : 0, transform: hoverRemote ? 'translateY(0)' : 'translateY(-4px)'}}>
            git@github.com:gitnexus/vscode-extension.git
          </span>
        </button>
        <div className="gx-header-divider" />
        <button className={`gx-icon-btn ${view === 'network' ? 'toggle-on' : ''}`}
                onClick={onToggleView}
                title={view === 'network' ? 'Show commit history' : 'Show branch relations'}>
          <span className="codicon">{view === 'network' ? 'list_alt' : 'account_tree'}</span>
        </button>
      </div>
    </div>
  );
}

function ContextMenu({ menu, onCopySha }) {
  const items = [
    { icon: 'content_copy',     label: 'Copy commit ID',         shortcut: '⌘C',     action: () => onCopySha(menu.sha) },
    { icon: 'sell',             label: 'Copy commit message',    shortcut: null,     action: () => {} },
    { divider: true },
    { icon: 'difference',       label: 'Compare with local',     shortcut: '⌘D',     action: () => {} },
    { icon: 'compare_arrows',   label: 'Compare with previous',  shortcut: null,     action: () => {} },
    { divider: true },
    { icon: 'download_for_offline', label: 'Checkout commit',    shortcut: null,     action: () => {} },
    { icon: 'call_split',       label: 'Create branch from here', shortcut: null,    action: () => {} },
    { icon: 'sell',             label: 'Create tag at commit',   shortcut: null,     action: () => {} },
    { divider: true },
    { icon: 'undo',             label: 'Revert commit',          shortcut: null,     action: () => {} },
    { icon: 'restart_alt',      label: 'Reset current branch to here', shortcut: null, action: () => {} },
    { divider: true },
    { icon: 'open_in_new',      label: 'Open in remote',         shortcut: null,     action: () => {} },
  ];
  // Clamp to viewport
  const W = 240, H = items.length * 30;
  const x = Math.min(menu.x, window.innerWidth - W - 8);
  const y = Math.min(menu.y, window.innerHeight - H - 8);

  return (
    <div className="gx-context" style={{left: x, top: y}} onClick={e => e.stopPropagation()}>
      {items.map((it, i) => it.divider
        ? <div key={i} className="gx-context-divider" />
        : (
          <div key={i} className="gx-context-item" onClick={it.action}>
            <span className="codicon">{it.icon}</span>
            <span>{it.label}</span>
            {it.shortcut && <span className="ctx-shortcut">{it.shortcut}</span>}
          </div>
        )
      )}
    </div>
  );
}

function DetailPanel({ open, commit, onClose, branch }) {
  if (!commit) return null;
  // Synthetic file changes per commit
  const FILES = {
    'a3f9c21': [{ p: 'src/network/collapse.ts', t: 'add' }, { p: 'src/network/types.ts', t: 'mod' }],
    'b8e4d10': [{ p: 'src/network/river.ts', t: 'add' }, { p: 'src/graph/bezier.ts', t: 'add' }, { p: 'src/network.css', t: 'add' }],
    'c7a2f88': [{ p: 'CHANGELOG.md', t: 'mod' }, { p: 'package.json', t: 'mod' }],
    'd1f3a09': [{ p: 'package.json', t: 'mod' }],
    'h5b1c00': [{ p: 'src/auth/refresh.ts', t: 'mod' }, { p: 'src/auth/__tests__/refresh.test.ts', t: 'mod' }],
  };
  const files = FILES[commit.sha] || [
    { p: `src/${commit.branch.split('/').pop()}/index.ts`, t: 'mod' },
    { p: 'CHANGELOG.md', t: 'mod' },
  ];

  return (
    <div className={`gx-detail ${open ? 'open' : ''}`}>
      <div className="gx-detail-header">
        <span className="gx-sha-pill">{commit.sha}</span>
        <span style={{fontSize: 12, color: 'var(--vsc-fg-2)'}}>· {commit.dateAbs}</span>
        <div className="gx-detail-header-spacer" />
        <button className="gx-icon-btn" onClick={onClose} title="Close">
          <span className="codicon">close</span>
        </button>
      </div>
      <div className="gx-detail-body">
        <div className="gx-detail-msg">{commit.msg}</div>

        <div className="gx-detail-row">
          <div className="lbl">Branch</div>
          <div className="val" style={{display:'flex', alignItems:'center', gap:6}}>
            <span style={{width:8, height:8, borderRadius:'50%', background: branch.color, display:'inline-block'}}/>
            <span style={{fontFamily:'var(--gx-font-mono)', fontSize: 12}}>{commit.branch}</span>
          </div>
        </div>
        <div className="gx-detail-row">
          <div className="lbl">Author</div>
          <div className="val">{commit.author} &lt;{commit.email}&gt;</div>
        </div>
        <div className="gx-detail-row">
          <div className="lbl">Parents</div>
          <div className="val" style={{display:'flex', gap:4, flexWrap:'wrap'}}>
            {commit.parents.length === 0 ? <span style={{color:'var(--vsc-fg-3)'}}>none (root)</span> : null}
            {commit.parents.map(p => <span key={p} className="gx-sha-pill">{p}</span>)}
          </div>
        </div>
        {commit.refs.length > 0 && (
          <div className="gx-detail-row">
            <div className="lbl">Refs</div>
            <div className="val" style={{display:'flex', gap:4, flexWrap:'wrap'}}>
              {commit.refs.map((r,i) => (
                <span key={i} className={`gx-ref ${r.type === 'tag' ? 'gx-ref-tag' : r.type === 'remote' ? 'gx-ref-remote' : 'gx-ref-branch'}`}
                      style={r.type !== 'tag' && r.type !== 'remote'
                        ? {color: branch.color, background: `color-mix(in srgb, ${branch.color} 14%, transparent)`,
                           borderColor: `color-mix(in srgb, ${branch.color} 35%, transparent)`}
                        : {}}>
                  <span className="codicon">
                    {r.type === 'tag' ? 'sell' : r.type === 'remote' ? 'cloud' : 'call_split'}
                  </span>
                  {r.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="gx-detail-files">
          <div className="gx-detail-files-title">
            <span className="codicon" style={{fontSize:12}}>folder_open</span>
            Files changed · {files.length}
          </div>
          {files.map((f, i) => (
            <div key={i} className="gx-detail-file">
              <span className="codicon" style={{fontSize:13, color:'var(--vsc-fg-symbol)'}}>description</span>
              <span style={{overflow:'hidden', textOverflow:'ellipsis'}}>{f.p}</span>
              <span className={`badge ${f.t}`}>{f.t === 'add' ? '+' : f.t === 'del' ? '−' : 'M'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.GitNexusPanel = GitNexusPanel;
