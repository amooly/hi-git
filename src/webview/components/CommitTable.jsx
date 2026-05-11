/* CommitTable — scrollable table of commit rows with SVG graph overlay. */

import { authorAvatarColor, authorInitials } from '../utils/authorUtils.js';
import { laneX } from '../graph.js';
import { ColumnFilter } from './ColumnFilter.jsx';

export function CommitTable({
  data, nodeStyle, edges, graphWidth, totalHeight, yPositions,
  selectedSha, setSelectedSha, filteredOut, onRowContext,
  colFilters, setColFilters,
}) {
  const tableWrapRef = React.useRef(null);

  return (
    <div className="gx-table-wrap" ref={tableWrapRef}>
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
          </div>

          <div className="gx-th">Date</div>
        </div>
      </div>

      <div className="gx-rows" style={{ position: 'relative' }}>
        {/* SVG graph overlay */}
        <svg className="gx-graph-svg"
          width={graphWidth}
          height={totalHeight}
          style={{ height: totalHeight }}>
          {edges.map(e => (
            <path key={e.key} d={e.d} fill="none" stroke={e.color}
              strokeWidth="2" strokeLinecap="round" />
          ))}
        </svg>

        {data.COMMITS.map((c, i) => {
          const out = filteredOut.has(c.sha);
          const branch = data.BRANCHES[c.branch];
          const isMerge = c.parents.length > 1;
          const x = laneX(c.lane);
          const yPos = yPositions[i];
          const nodeStyleProps = nodeStyle === 'square'
            ? { borderRadius: 2, width: 11, height: 11 }
            : nodeStyle === 'ring'
              ? { background: 'var(--vsc-editor-bg)', borderColor: branch.color, borderWidth: 3, width: 13, height: 13 }
              : { background: branch.color, borderColor: 'var(--vsc-editor-bg)' };

          return (
            <div
              key={c.sha}
              className={`gx-row ${selectedSha === c.sha ? 'selected' : ''} ${out ? 'filtered-out' : ''}`}
              style={{ height: yPos.height, maxHeight: yPos.height }}
              onClick={() => {
                setSelectedSha(c.sha);
                window.vscodeAPI?.postEvent('commitSelected', { commit: c, branch: data.BRANCHES[c.branch] });
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
      </div>
    </div>
  );
}
