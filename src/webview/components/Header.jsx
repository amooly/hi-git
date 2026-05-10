/* Header toolbar — theme toggle, refresh, filter toggle, remote link. */

export function Header({ theme, onToggleTheme, onRefresh, refreshing,
  showFilters, onToggleFilters }) {
  const [hoverRemote, setHoverRemote] = React.useState(false);
  return (
    <div className="gx-header">
      <div className="gx-header-left">
        <span className="gx-branch-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M11.75 2.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zM9.5 3.75a2.25 2.25 0 1 1 3 2.122V6a2.5 2.5 0 0 1-2.5 2.5h-3a1 1 0 0 0-1 1v.628a2.251 2.251 0 1 1-1.5 0V5.872a2.25 2.25 0 1 1 1.5 0v3.378A2.49 2.49 0 0 1 7 9h3a1 1 0 0 0 1-1v-.128A2.252 2.252 0 0 1 9.5 5.75v-2zM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zM3.5 3.75a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0z"
              fill="currentColor" />
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
          <span className="gx-tooltip" style={{ opacity: hoverRemote ? 1 : 0, transform: hoverRemote ? 'translateY(0)' : 'translateY(-4px)' }}>
            git@github.com:gitnexus/vscode-extension.git
          </span>
        </button>
        <div className="gx-header-divider" />
      </div>
    </div>
  );
}
