/* GraphPanel — root panel component for the commit graph view.
 * Manages shared state and composes Header, FilterBar, CommitTable, and ContextMenu.
 */

import { Header }      from './Header.jsx';
import { FilterBar }   from './FilterBar.jsx';
import { CommitTable } from './CommitTable.jsx';
import { ContextMenu } from './ContextMenu.jsx';
import { buildEdges }  from '../graph.js';

export function GraphPanel({
  data, theme, onToggleTheme,
  rowH, density, nodeStyle, showFilters, onToggleFilters,
}) {
  const [filters, setFilters]       = React.useState({ sha: '', msg: '', author: '', date: '' });
  const [selectedSha, setSelectedSha] = React.useState(data.COMMITS[0].sha);
  const [contextMenu, setContextMenu] = React.useState(null); // {x, y, sha}
  const [refreshing, setRefreshing]   = React.useState(false);

  // Filtering — keep DOM nodes alive so rows can animate out.
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
    () => buildEdges(data.COMMITS, rowH, data.BRANCHES),
    [data.COMMITS, rowH, data.BRANCHES]
  );
  const graphColW = Math.max(graphWidth + 180, 260); // graph + branch label space

  // Close context menu on outside click, scroll, or Escape.
  React.useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', onKey);
    };
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

  return (
    <div className="gx-panel" style={{ '--graph-col-w': `${graphColW}px`, '--row-h': `${rowH}px` }}>
      <Header
        theme={theme} onToggleTheme={onToggleTheme}
        onRefresh={onRefresh} refreshing={refreshing}
        showFilters={showFilters} onToggleFilters={onToggleFilters}
      />

      <FilterBar showFilters={showFilters} filters={filters} setFilters={setFilters} />

      <CommitTable
        data={data}
        rowH={rowH}
        nodeStyle={nodeStyle}
        edges={edges}
        graphWidth={graphWidth}
        selectedSha={selectedSha}
        setSelectedSha={setSelectedSha}
        filteredOut={filteredOut}
        onRowContext={onRowContext}
      />

      {contextMenu && <ContextMenu menu={contextMenu} onCopySha={onCopySha} />}
    </div>
  );
}
