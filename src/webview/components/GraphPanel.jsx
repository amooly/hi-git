/* GraphPanel — root panel component for the commit graph view.
 * Manages shared state and composes Header, CommitTable, and ContextMenu.
 */

import { Header }      from './Header.jsx';
import { CommitTable } from './CommitTable.jsx';
import { ContextMenu } from './ContextMenu.jsx';
import { buildEdges }  from '../graph.js';

/** Build the initial colFilters structure from commit data. */
function buildColFilters(commits) {
  // GRAPH: unique branch names from refs
  const graphItems = [...new Set(
    commits.flatMap(c => c.refs.map(r => r.name))
  )].sort();

  // SHA: short SHAs (first 7 chars, should already be 7 in data)
  const shaItems = commits.map(c => c.sha);

  // AUTHOR: unique author names
  const authorItems = [...new Set(commits.map(c => c.author))].sort();

  return {
    graph:  { all: graphItems,  selected: new Set() },
    sha:    { all: shaItems,    selected: new Set() },
    author: { all: authorItems, selected: new Set() },
  };
}

export function GraphPanel({
  data, theme, onToggleTheme,
  rowH, density, nodeStyle,
}) {
  const [colFilters, setColFilters]   = React.useState(() => buildColFilters(data.COMMITS));
  const [selectedSha, setSelectedSha] = React.useState(data.COMMITS[0].sha);
  const [contextMenu, setContextMenu] = React.useState(null); // {x, y, sha}
  const [refreshing, setRefreshing]   = React.useState(false);

  // Column-filter-based exclusion — a commit is filtered out if ANY active column
  // filter excludes it.
  const filteredOut = React.useMemo(() => {
    const out = new Set();
    const { graph, sha, author } = colFilters;

    // A column is active if at least one item is selected.
    // If active, it excludes anything NOT in the selection.
    const graphActive  = graph.selected.size > 0;
    const shaActive    = sha.selected.size > 0;
    const authorActive = author.selected.size > 0;

    data.COMMITS.forEach(c => {
      if (shaActive && !sha.selected.has(c.sha)) {
        out.add(c.sha); return;
      }
      if (authorActive && !author.selected.has(c.author)) {
        out.add(c.sha); return;
      }
      if (graphActive) {
        // Commit passes the graph filter if it has no refs (keep it visible for graph continuity)
        // or if at least one of its refs is selected.
        const hasMatchingRef = c.refs.some(r => graph.selected.has(r.name));
        if (c.refs.length > 0 && !hasMatchingRef) {
          out.add(c.sha);
        }
      }
    });
    return out;
  }, [colFilters, data.COMMITS]);

  // Build SVG edges
  const { edges, graphWidth, totalHeight, yPositions } = React.useMemo(
    () => buildEdges(data.COMMITS, rowH, data.BRANCHES, filteredOut),
    [data.COMMITS, rowH, data.BRANCHES, filteredOut]
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

  const onCompareWithPrev = (sha) => {
    window.vscodeAPI.postEvent('compareWithPrev', { sha });
    setContextMenu(null);
  };

  return (
    <div className="gx-panel" style={{ '--graph-col-w': `${graphColW}px`, '--row-h': `${rowH}px` }}>
      <Header
        theme={theme} onToggleTheme={onToggleTheme}
        onRefresh={onRefresh} refreshing={refreshing}
      />

      <CommitTable
        data={data}
        nodeStyle={nodeStyle}
        edges={edges}
        graphWidth={graphWidth}
        totalHeight={totalHeight}
        yPositions={yPositions}
        selectedSha={selectedSha}
        setSelectedSha={setSelectedSha}
        filteredOut={filteredOut}
        onRowContext={onRowContext}
        colFilters={colFilters}
        setColFilters={setColFilters}
      />

      {contextMenu && <ContextMenu menu={contextMenu} onCopySha={onCopySha} onCompareWithPrev={onCompareWithPrev} />}
    </div>
  );
}
