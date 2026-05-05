/* GitNexus — Branch Relations (Vertical River) view
   High-level "bird's eye" SVG: trunk runs top→bottom, branches spur off
   with smooth Bezier curves and merge back. No individual commit nodes —
   just branch labels, spawn points, and merge points. */

function BranchRelationsView({ data }) {
  const { branches, trunkLane } = React.useMemo(() => {
    const branches = data.BRANCH_RELATIONS.branches;
    return { branches, trunkLane: branches.find(b => b.name === 'main').lane };
  }, [data]);

  // Layout constants
  const LANE_W = 110;
  const TRUNK_X = 100;
  const TOP_PAD = 60;
  const BOTTOM_PAD = 80;
  const TRUNK_LEN = 560;
  const branchCount = branches.length;
  const W = TRUNK_X + (branchCount) * LANE_W + 80;
  const H = TOP_PAD + TRUNK_LEN + BOTTOM_PAD;

  // For each branch, compute spawn-y and merge-y as a fraction of trunk
  const branchY = (b) => {
    // map sha to trunk position - this is a manual layout for the demo
    const TRUNK_POSITIONS = {
      't8c9d44': 0.95,
      's7a8b33': 0.82,
      'p6a7b00': 0.70,
      'm9d0e77': 0.62,
      'j7e8f44': 0.52,
      'i6f2d33': 0.42,
      'g4d7e21': 0.34,
      'f0a8b13': 0.26,
      'd1f3a09': 0.16,
      'c7a2f88': 0.08,
    };
    return TOP_PAD + (TRUNK_POSITIONS[b] ?? 0.5) * TRUNK_LEN;
  };

  // Each non-trunk branch gets its own x lane on the right
  const laneXForBranch = (i) => TRUNK_X + i * LANE_W;

  return (
    <div className="gx-network">
      <div className="gx-network-toolbar">
        <span className="codicon" style={{fontSize: 14, color: 'var(--vsc-fg-2)'}}>graph_2</span>
        <span>Branch relations · bird's eye view</span>
        <div className="legend">
          <div className="legend-item"><span className="legend-swatch" style={{background:'var(--branch-main)'}}/>trunk</div>
          <div className="legend-item"><span className="legend-swatch" style={{background:'var(--branch-feature)'}}/>feature</div>
          <div className="legend-item"><span className="legend-swatch" style={{background:'var(--branch-release)'}}/>release</div>
          <div className="legend-item"><span className="legend-swatch" style={{background:'var(--branch-hotfix)'}}/>hotfix</div>
          <div className="legend-item"><span className="legend-swatch" style={{background:'var(--branch-experiment)'}}/>experiment</div>
        </div>
      </div>
      <div className="gx-network-canvas">
        <svg className="gx-network-svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {/* Background trunk track (faint) */}
          <line
            x1={TRUNK_X} y1={TOP_PAD - 20}
            x2={TRUNK_X} y2={TOP_PAD + TRUNK_LEN + 20}
            stroke="var(--branch-main)"
            strokeWidth="3"
            strokeOpacity="0.25"
          />
          {/* Active trunk */}
          <line
            x1={TRUNK_X} y1={TOP_PAD - 20}
            x2={TRUNK_X} y2={TOP_PAD + TRUNK_LEN + 20}
            stroke="var(--branch-main)"
            strokeWidth="2.5"
          />
          {/* Trunk caps (HEAD and root markers) */}
          <circle cx={TRUNK_X} cy={TOP_PAD - 20} r="6" fill="var(--branch-main)" />
          <text x={TRUNK_X + 14} y={TOP_PAD - 16} fontSize="11" fontFamily="var(--gx-font-mono)"
                fill="var(--vsc-fg-1)" fontWeight="600">main · HEAD</text>
          <circle cx={TRUNK_X} cy={TOP_PAD + TRUNK_LEN + 20} r="4" fill="var(--branch-main)" opacity="0.6" />
          <text x={TRUNK_X + 14} y={TOP_PAD + TRUNK_LEN + 24} fontSize="10" fontFamily="var(--gx-font-mono)"
                fill="var(--vsc-fg-3)">root · t8c9d44</text>

          {/* Branch tracks */}
          {branches.filter(b => b.name !== 'main').map((b, i) => {
            const x = laneXForBranch(i + 1);
            const ySpawn = branchY(b.spawnAt);
            const yMerge = b.mergePoint ? branchY(b.mergePoint) : TOP_PAD + 20;
            const isOpen = !b.mergePoint;
            const isActive = b.status === 'active' || b.status === 'in-progress' || b.status === 'current';

            // Spawn curve: trunk -> branch lane
            const spawnPath = `M ${TRUNK_X} ${ySpawn} C ${TRUNK_X + 40} ${ySpawn}, ${x - 40} ${ySpawn - 20}, ${x} ${ySpawn - 30}`;
            // Branch vertical
            const branchTopY = isOpen ? TOP_PAD - 10 : yMerge + 30;
            // Merge curve: branch lane -> trunk
            const mergePath = b.mergePoint
              ? `M ${x} ${yMerge + 30} C ${x} ${yMerge + 10}, ${TRUNK_X + 40} ${yMerge}, ${TRUNK_X} ${yMerge}`
              : null;

            const dash = b.status === 'in-progress' ? '4 3' : null;

            return (
              <g key={b.name}>
                {/* spawn curve */}
                <path d={spawnPath} fill="none" stroke={b.color} strokeWidth="2"
                      opacity={isActive ? 1 : 0.7} />
                {/* branch vertical */}
                <line x1={x} y1={branchTopY} x2={x} y2={ySpawn - 30}
                      stroke={b.color} strokeWidth="2.5"
                      strokeDasharray={dash}
                      opacity={isActive ? 1 : 0.85} />
                {/* merge curve */}
                {mergePath && (
                  <path d={mergePath} fill="none" stroke={b.color} strokeWidth="2"
                        opacity={0.85} />
                )}
                {/* spawn point dot */}
                <circle cx={TRUNK_X} cy={ySpawn} r="3.5" fill={b.color}
                        stroke="var(--vsc-editor-bg)" strokeWidth="1.5" />
                {/* merge point dot */}
                {b.mergePoint && (
                  <circle cx={TRUNK_X} cy={yMerge} r="4" fill="var(--vsc-editor-bg)"
                          stroke={b.color} strokeWidth="2.5" />
                )}
                {/* branch tip / cap */}
                {isOpen ? (
                  <>
                    <circle cx={x} cy={branchTopY} r="6" fill={b.color} />
                    <circle cx={x} cy={branchTopY} r="9" fill="none"
                            stroke={b.color} strokeOpacity="0.3" strokeWidth="2" />
                  </>
                ) : (
                  <rect x={x - 4} y={branchTopY - 4} width="8" height="8"
                        fill="var(--vsc-editor-bg)" stroke={b.color} strokeWidth="2"
                        transform={`rotate(45 ${x} ${branchTopY})`} />
                )}
                {/* branch label */}
                <text x={x} y={branchTopY - 18} textAnchor="middle"
                      className="gx-network-branch-label"
                      fill={b.color}>
                  {b.name}
                </text>
                <text x={x} y={branchTopY - 32} textAnchor="middle"
                      className="gx-network-meta">
                  {b.commits} commits · {b.status}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

window.BranchRelationsView = BranchRelationsView;
