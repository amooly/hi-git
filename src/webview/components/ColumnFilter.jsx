/* ColumnFilter — filterable column header dropdown.
 * Props:
 *   label        {string}   Column display name
 *   items        {any[]}    All unique values (strings or objects for Graph)
 *   selected     {Set}      Currently selected (included) values
 *   onChange     {fn}       Called with new Set of selected values
 */

export function ColumnFilter({ label, items, selected, onChange }) {
  const [open, setOpen]       = React.useState(false);
  const [search, setSearch]   = React.useState('');
  const dropRef               = React.useRef(null);
  const searchRef             = React.useRef(null);

  const isGraph = label.toLowerCase() === 'graph';
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
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [open]);

  // Focus search when opened
  React.useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  const filteredItems = React.useMemo(() => {
    const s = search.toLowerCase();
    if (isGraph) {
      return items.filter(it => it.name.toLowerCase().includes(s));
    }
    return items.filter(it => it.toLowerCase().includes(s));
  }, [items, search, isGraph]);

  const allFilteredChecked = React.useMemo(() => {
    if (filteredItems.length === 0) return false;
    return filteredItems.every(it => selected.has(isGraph ? it.name : it));
  }, [filteredItems, selected, isGraph]);

  const toggle = (value) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  };

  const toggleAll = () => {
    const next = new Set(selected);
    const names = filteredItems.map(it => isGraph ? it.name : it);
    if (allFilteredChecked) {
      names.forEach(n => next.delete(n));
    } else {
      names.forEach(n => next.add(n));
    }
    onChange(next);
  };

  const reset = () => {
    onChange(new Set());
    setSearch('');
  };

  const apply = () => {
    setOpen(false);
    setSearch('');
  };

  // --- Graph Tree Logic ---
  const treeGroups = React.useMemo(() => {
    if (!isGraph) return null;
    const groups = {
      local:  { key: 'local',  name: 'Local',  children: {}, isGroup: true, defaultExpanded: true },
      tags:   { key: 'tags',   name: 'Tags',   children: {}, isGroup: true, defaultExpanded: false },
      remote: { key: 'remote', name: 'Remote', children: {}, isGroup: true, defaultExpanded: false },
    };

    filteredItems.forEach(item => {
      let gKey = 'local';
      let dName = item.name;
      if (item.type === 'tag') gKey = 'tags';
      else if (item.type === 'remote') {
        gKey = 'remote';
        dName = dName.replace(/^[^/]+\//, ''); // omit origin/
      }

      const parts = dName.split('/');
      let curr = groups[gKey];
      parts.forEach((p, i) => {
        if (!curr.children[p]) {
          curr.children[p] = {
            name: p,
            fullName: item.name,
            isLeaf: i === parts.length - 1,
            children: {},
            groupKey: gKey
          };
        }
        curr = curr.children[p];
      });
    });
    return groups;
  }, [isGraph, filteredItems]);

  return (
    <div className="gx-col-filter" ref={dropRef}>
      <button
        className={`gx-col-filter-btn ${isActive ? 'active' : ''}`}
        title={`Filter by ${label}`}
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M1 2h10L7 6.5V10.5L5 9V6.5L1 2z"
            fill={isActive ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="1.3"
            strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="gx-col-filter-drop" onClick={e => e.stopPropagation()}>
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

          <div className="gx-cfd-list">
            {filteredItems.length === 0 && <div className="gx-cfd-empty">No matches</div>}

            {isGraph ? (
              <div className="gx-cfd-tree">
                {Object.values(treeGroups).map(g => (
                  <TreeItem key={g.key} node={g} selected={selected} toggle={toggle} onChange={onChange} search={search} />
                ))}
              </div>
            ) : (
              filteredItems.map(val => (
                <label key={val} className="gx-cfd-item">
                  <input type="checkbox" checked={selected.has(val)} onChange={() => toggle(val)} />
                  <span className="gx-cfd-item-label" title={val}>{val}</span>
                </label>
              ))
            )}
          </div>

          <div className="gx-cfd-footer">
            <button className="gx-cfd-reset" onClick={reset}>Reset</button>
            <button className="gx-cfd-ok" onClick={apply}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TreeItem({ node, selected, toggle, onChange, search }) {
  const hasChildren = Object.keys(node.children).length > 0;
  const [expanded, setExpanded] = React.useState(node.defaultExpanded || (search && hasChildren));
  
  // Keep expanded if search matches
  React.useEffect(() => {
    if (search && hasChildren) setExpanded(true);
  }, [search, hasChildren]);

  // Recursively find all leaf descendants
  const getLeafFullNames = React.useCallback((n) => {
    let leafs = [];
    if (n.isLeaf) leafs.push(n.fullName);
    Object.values(n.children).forEach(c => leafs.push(...getLeafFullNames(c)));
    return leafs;
  }, []);

  const descendants = React.useMemo(() => getLeafFullNames(node), [node, getLeafFullNames]);
  const checkedCount = descendants.filter(n => selected.has(n)).length;
  const isChecked = descendants.length > 0 && checkedCount === descendants.length;
  const isIndeterminate = checkedCount > 0 && checkedCount < descendants.length;

  const onToggle = (e) => {
    e.stopPropagation();
    const next = new Set(selected);
    if (isChecked) {
      descendants.forEach(n => next.delete(n));
    } else {
      descendants.forEach(n => next.add(n));
    }
    onChange(next);
  };

  const children = React.useMemo(() => {
    return Object.values(node.children).sort((a, b) => {
      // main/master always at top for Local and Remote
      const gKey = node.groupKey || node.key;
      if (gKey === 'local' || gKey === 'remote') {
        const aHigh = a.name === 'main' || a.name === 'master';
        const bHigh = b.name === 'main' || b.name === 'master';
        if (aHigh && !bHigh) return -1;
        if (!aHigh && bHigh) return 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [node]);

  if (!node.isGroup && !node.isLeaf && !hasChildren) return null;

  return (
    <div className={`gx-tree-node ${node.isGroup ? 'gx-tree-group' : ''}`}>
      <div className="gx-tree-row" onClick={() => hasChildren && setExpanded(!expanded)}>
        {hasChildren ? (
          <span className={`codicon gx-tree-arrow ${expanded ? 'expanded' : ''}`}>chevron_right</span>
        ) : <span className="gx-tree-spacer" />}
        
        <div className="gx-tree-check-wrap" onClick={e => e.stopPropagation()}>
          <input 
            type="checkbox" 
            checked={isChecked} 
            ref={el => el && (el.indeterminate = isIndeterminate)}
            onChange={onToggle}
          />
        </div>
        
        <span className={`gx-tree-label ${node.isGroup ? 'group-title' : ''}`}>{node.name}</span>
      </div>
      
      {expanded && hasChildren && (
        <div className="gx-tree-children">
          {children.map(child => (
            <TreeItem key={child.name} node={child} selected={selected} toggle={toggle} onChange={onChange} search={search} />
          ))}
        </div>
      )}
    </div>
  );
}
