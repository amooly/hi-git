/* CommitTable — scrollable table of commit rows with SVG graph overlay. */

import { authorAvatarColor, authorInitials } from '../utils/authorUtils.js';
import { laneX } from '../graph.js';
import { ColumnFilter } from './ColumnFilter.jsx';

const MIN_COL_WIDTHS = { graph: 60, sha: 100, author: 80, date: 60 };

export function CommitTable({
  data, nodeStyle, edges, graphWidth, totalHeight, yPositions,
  computedLanes,
  selectedSha, setSelectedSha, filteredOut, onRowContext,
  colFilters, setColFilters,
  rowH,
}) {
  const tableWrapRef = React.useRef(null);
  const sentinelRef = React.useRef(null);

  const [visibleCount, setVisibleCount] = React.useState(() =>
    Math.min(Math.ceil((window.innerHeight * 1.5) / rowH), data.COMMITS.length)
  );

  React.useEffect(() => {
    if (visibleCount >= data.COMMITS.length) return;
    const chunkSize = () =>
      Math.ceil(((tableWrapRef.current?.clientHeight ?? window.innerHeight) * 1.5) / rowH);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting)
        setVisibleCount(prev => Math.min(prev + chunkSize(), data.COMMITS.length));
    }, { root: tableWrapRef.current, threshold: 0 });
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [visibleCount, data.COMMITS.length, rowH]);

  const visibleCommits = data.COMMITS.slice(0, visibleCount);
  const visibleEdges = edges.filter(e => e.fromIdx < visibleCount);
  const lastPos = yPositions[visibleCount - 1];
  const visibleHeight = lastPos ? lastPos.top + lastPos.height : totalHeight;

  const [colWidths, setColWidths] = React.useState(() => ({
    graph: Math.min(300, Math.max(graphWidth + 180, 260)),
    sha: 100,
    author: 160,
    date: 130,
  }));
  const colWidthsRef = React.useRef(colWidths);
  colWidthsRef.current = colWidths;

  const startResize = React.useCallback((col, e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = colWidthsRef.current[col];
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMove = (ev) => {
      const w = Math.max(MIN_COL_WIDTHS[col], startW + ev.clientX - startX);
      setColWidths(prev => ({ ...prev, [col]: w }));
    };
    const onUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  return (
    <div
      className="gx-table-wrap"
      ref={tableWrapRef}
      style={{
        '--graph-col-w': `${colWidths.graph}px`,
        '--col-sha': `${colWidths.sha}px`,
        '--col-author': `${colWidths.author}px`,
        '--col-date': `${colWidths.date}px`,
      }}
    >
      {/* Column headers */}
      <div className="gx-table">
        <div className="gx-thead">
          {/* GRAPH */}
          <div className="gx-th">
            Graph
            <ColumnFilter
              label="Graph"
              items={colFilters.graph.all}
              selected={colFilters.graph.selected}
              onChange={sel => setColFilters(f => ({ ...f, graph: { ...f.graph, selected: sel } }))}
            />
            <div className="gx-col-resize-handle" onMouseDown={e => startResize('graph', e)} />
          </div>

          {/* SHA */}
          <div className="gx-th">
            SHA
            <ColumnFilter
              label="SHA"
              items={colFilters.sha.all}
              selected={colFilters.sha.selected}
              onChange={sel => setColFilters(f => ({ ...f, sha: { ...f.sha, selected: sel } }))}
            />
            <div className="gx-col-resize-handle" onMouseDown={e => startResize('sha', e)} />
          </div>

          <div className="gx-th">Message</div>

          {/* AUTHOR */}
          <div className="gx-th">
            Author
            <ColumnFilter
              label="Author"
              items={colFilters.author.all}
              selected={colFilters.author.selected}
              onChange={sel => setColFilters(f => ({ ...f, author: { ...f.author, selected: sel } }))}
            />
            <div className="gx-col-resize-handle" onMouseDown={e => startResize('author', e)} />
          </div>

          <div className="gx-th">
            Date
            <div className="gx-col-resize-handle" onMouseDown={e => startResize('date', e)} />
          </div>
        </div>
      </div>

      <div className="gx-rows" style={{ position: 'relative' }}>
        {/* SVG graph overlay — clipped to current graph column width */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: colWidths.graph,
          height: visibleHeight,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 1,
        }}>
          <svg className="gx-graph-svg"
            width={graphWidth}
            height={visibleHeight}
            style={{ height: visibleHeight }}>
            {visibleEdges.map(e => (
              <path key={e.key} d={e.d} fill="none" stroke={e.color}
                strokeWidth="2" strokeLinecap="round" />
            ))}
          </svg>
        </div>

        {visibleCommits.map((c, i) => {
          const out = filteredOut.has(c.sha);
          const branch = data.BRANCHES[c.branch];
          const isMerge = c.parents.length > 1;
          const lane = computedLanes ? computedLanes[i] : c.lane;
          const x = laneX(lane);
          const yPos = yPositions[i];
          const nodeStyleProps = nodeStyle === 'square'
            ? { borderRadius: 2, width: 11, height: 11 }
            : nodeStyle === 'ring'
              ? { background: 'var(--vsc-editor-bg)', borderColor: branch.color, borderWidth: 3, width: 13, height: 13 }
              : { background: branch.color, borderColor: 'var(--vsc-editor-bg)' };

          return (
            <div
              key={c.sha}
              data-sha={c.sha}
              className={`gx-row ${selectedSha === c.sha ? 'selected' : ''} ${out ? 'filtered-out' : ''}`}
              style={{ height: yPos.height, maxHeight: yPos.height }}
              onClick={() => {
                setSelectedSha(c.sha);
                window.vscodeAPI?.postEvent('commitSelected', { commit: c, branch: data.BRANCHES[c.branch] });
              }}
              onDoubleClick={() => {
                window.vscodeAPI?.postEvent('commitReveal', { commit: c, branch: data.BRANCHES[c.branch] });
              }}
              onContextMenu={(e) => onRowContext(e, c.sha)}
            >
              {/* Graph cell */}
              <div className="gx-cell gx-cell-graph">
                {!out && <div className="gx-graph-node"
                  style={{
                    left: x, top: '50%',
                    ...(isMerge && nodeStyle !== 'ring'
                      ? { background: 'var(--vsc-editor-bg)', borderColor: branch.color, borderWidth: 3 }
                      : nodeStyleProps)
                  }} />}
              </div>

              {/* SHA */}
              <div className="gx-cell">
                <span className="gx-sha-pill">{c.sha}</span>
              </div>

              {/* Message */}
              <div className="gx-cell" title={c.msg}>
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%', overflow: 'hidden' }}>
                    {isMerge && <span className="codicon" style={{ fontSize: 13, color: 'var(--vsc-fg-3)', flexShrink: 0, marginRight: 4 }}>merge</span>}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.msg.split('\n')[0]}</span>
                  </div>
                  {c.refs.length > 0 && (
                    <div className="gx-graph-label" style={{ paddingLeft: 0, marginTop: 4 }}>
                      {c.refs.map((r, ri) => (
                        <span key={ri}
                          className={`gx-ref ${r.type === 'tag' ? 'gx-ref-tag'
                            : r.type === 'remote' ? 'gx-ref-remote' : 'gx-ref-branch'}`}
                          data-current={r.current ? 'true' : 'false'}
                          style={r.type !== 'tag' && r.type !== 'remote'
                            ? {
                              '--branch-main': branch.color, color: branch.color,
                              background: `color-mix(in srgb, ${branch.color} ${r.current ? 28 : 14}%, transparent)`,
                              borderColor: r.current ? branch.color
                                : `color-mix(in srgb, ${branch.color} 35%, transparent)`
                            }
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
                  )}
                </div>
              </div>

              {/* Author */}
              <div className="gx-cell">
                <div className="gx-author">
                  <span className="gx-avatar" style={{ background: authorAvatarColor(c.author) }}>
                    {authorInitials(c.author)}
                  </span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.author}</span>
                </div>
              </div>

              {/* Date */}
              <div className="gx-cell">
                <span className="gx-meta" title={c.dateAbs}>{c.date}</span>
              </div>
            </div>
          );
        })}

        {visibleCount < data.COMMITS.length && (
          <div ref={sentinelRef} style={{ height: 1 }} />
        )}
      </div>
    </div>
  );
}
