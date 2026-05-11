/* ColumnFilter — filterable column header dropdown.
 * Props:
 *   label        {string}   Column display name
 *   items        {string[]} All unique values for this column
 *   selected     {Set}      Currently selected (included) values
 *   onChange     {fn}       Called with new Set of selected values
 */

export function ColumnFilter({ label, items, selected, onChange }) {
  const [open, setOpen]       = React.useState(false);
  const [search, setSearch]   = React.useState('');
  const dropRef               = React.useRef(null);
  const searchRef             = React.useRef(null);

  const isActive = selected.size > 0;

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    // Use capture so this fires before context-menu close handlers
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [open]);

  // Focus search when opened
  React.useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  const filtered = React.useMemo(
    () => items.filter(v => v.toLowerCase().includes(search.toLowerCase())),
    [items, search]
  );

  const allFilteredChecked = filtered.length > 0 && filtered.every(v => selected.has(v));

  const toggle = (value) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  };

  const toggleAll = () => {
    if (allFilteredChecked) {
      // deselect all filtered items
      const next = new Set(selected);
      filtered.forEach(v => next.delete(v));
      onChange(next);
    } else {
      // select all filtered items
      const next = new Set(selected);
      filtered.forEach(v => next.add(v));
      onChange(next);
    }
  };

  const reset = () => {
    onChange(new Set()); // none selected = no filter
    setSearch('');
  };

  const apply = () => {
    setOpen(false);
    setSearch('');
  };

  return (
    <div className="gx-col-filter" ref={dropRef}>
      {/* Trigger */}
      <button
        className={`gx-col-filter-btn ${isActive ? 'active' : ''}`}
        title={`Filter by ${label}`}
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
      >
        {/* Funnel icon */}
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M1 2h10L7 6.5V10.5L5 9V6.5L1 2z"
            fill={isActive ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="1.3"
            strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="gx-col-filter-drop" onClick={e => e.stopPropagation()}>
          {/* Search */}
          <div className="gx-cfd-search-wrap">
            <span className="codicon gx-cfd-search-icon">search</span>
            <input
              ref={searchRef}
              className="gx-cfd-search"
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="gx-cfd-clear" onClick={() => setSearch('')}>
                <span className="codicon" style={{ fontSize: 13 }}>close</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="gx-cfd-list">
            {/* Select all (for filtered set) */}
            <label className="gx-cfd-item gx-cfd-item--all">
              <input
                type="checkbox"
                checked={allFilteredChecked}
                onChange={toggleAll}
              />
              <span className="gx-cfd-item-label">Select all</span>
            </label>
            <div className="gx-cfd-divider" />
            {filtered.length === 0 && (
              <div className="gx-cfd-empty">No matches</div>
            )}
            {filtered.map(value => (
              <label key={value} className="gx-cfd-item">
                <input
                  type="checkbox"
                  checked={selected.has(value)}
                  onChange={() => toggle(value)}
                />
                <span className="gx-cfd-item-label" title={value}>{value}</span>
              </label>
            ))}
          </div>

          {/* Footer */}
          <div className="gx-cfd-footer">
            <button className="gx-cfd-reset" onClick={reset}>Reset</button>
            <button className="gx-cfd-ok" onClick={apply}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
