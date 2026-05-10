/* FilterBar — collapsible row of filter inputs (SHA, message, author, date). */

export function FilterBar({ showFilters, filters, setFilters }) {
  return (
    <div className={`gx-filterbar ${showFilters ? '' : 'collapsed'}`}>
      <div className="gx-filter-cell">
        <span className="codicon filter-icon">filter_alt</span>
        <span className="gx-filter-graph-label">Graph</span>
      </div>
      <div className="gx-filter-cell">
        <input className="gx-filter-input" placeholder="SHA" value={filters.sha}
          onChange={e => setFilters({ ...filters, sha: e.target.value })} />
      </div>
      <div className="gx-filter-cell">
        <input className="gx-filter-input" placeholder="Filter messages, branches, tags…" value={filters.msg}
          onChange={e => setFilters({ ...filters, msg: e.target.value })} />
      </div>
      <div className="gx-filter-cell">
        <input className="gx-filter-input" placeholder="Author" value={filters.author}
          onChange={e => setFilters({ ...filters, author: e.target.value })} />
      </div>
      <div className="gx-filter-cell">
        <input className="gx-filter-input" placeholder="Date" value={filters.date}
          onChange={e => setFilters({ ...filters, date: e.target.value })} />
      </div>
    </div>
  );
}
