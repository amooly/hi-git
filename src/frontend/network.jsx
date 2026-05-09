/* GitNexus — Branch Relations (Vertical River) view
   High-level "bird's eye" SVG: trunk runs top→bottom, branches spur off
   with smooth Bezier curves and merge back. No individual commit nodes —
   just branch labels, spawn points, and merge points. */

// Layout constants — defined at module scope so they are not reallocated per render
const NW_LANE_W   = 110;
const NW_TRUNK_X  = 100;
const NW_TOP_PAD  = 60;
const NW_BOTTOM_PAD = 80;
const NW_TRUNK_LEN  = 560;

// SHA → fractional trunk position (static layout for the demo dataset)
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

function branchY(sha) {
  return NW_TOP_PAD + (TRUNK_POSITIONS[sha] ?? 0.5) * NW_TRUNK_LEN;
}

// Maps branch index (1-based, skipping trunk) to an x coordinate
function laneXForBranch(i) { return NW_TRUNK_X + i * NW_LANE_W; }

function BranchRelationsView({ data }) {
  const { branches } = React.useMemo(() => {
    const branches = data.BRANCH_RELATIONS.branches;
    return { branches };
  }, [data]);

  const W = NW_TRUNK_X + branches.length * NW_LANE_W + 80;
  const H = NW_TOP_PAD + NW_TRUNK_LEN + NW_BOTTOM_PAD;

  return (
    <div className="gx-network">
      <div className="gx-network-toolbar">
        <span className="codicon" style={{fontSize: 14, color: 'var(--vsc-fg-2)'}}>graph_2</span>
        <span>Branch relations · bird’s eye view</span>
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
            x1={NW_TRUNK_X} y1={NW_TOP_PAD - 20}
            x2={NW_TRUNK_X} y2={NW_TOP_PAD + NW_TRUNK_LEN + 20}
            stroke="var(--branch-main)"
            strokeWidth="3"
            strokeOpacity="0.25"
          />
          {/* Active trunk */}
          <line
            x1={NW_TRUNK_X} y1={NW_TOP_PAD - 20}
            x2={NW_TRUNK_X} y2={NW_TOP_PAD + NW_TRUNK_LEN + 20}
            stroke="var(--branch-main)"
            strokeWidth="2.5"
          />
          {/* Trunk caps (HEAD and root markers) */}
          <circle cx={NW_TRUNK_X} cy={NW_TOP_PAD - 20} r="6" fill="var(--branch-main)" />
          <text x={NW_TRUNK_X + 14} y={NW_TOP_PAD - 16} fontSize="11" fontFamily="var(--gx-font-mono)"
                fill="var(--vsc-fg-1)" fontWeight="600">main · HEAD</text>
          <circle cx={NW_TRUNK_X} cy={NW_TOP_PAD + NW_TRUNK_LEN + 20} r="4" fill="var(--branch-main)" opacity="0.6" />
          <text x={NW_TRUNK_X + 14} y={NW_TOP_PAD + NW_TRUNK_LEN + 24} fontSize="10" fontFamily="var(--gx-font-mono)"
                fill="var(--vsc-fg-3)">root · t8c9d44</text>

          {/* Branch tracks */}
          {branches.filter(b => b.name !== 'main').map((b, i) => {
            const x = laneXForBranch(i + 1);
            const ySpawn = branchY(b.spawnAt);
            const yMerge = b.mergePoint ? branchY(b.mergePoint) : NW_TOP_PAD + 20;
            const isOpen = !b.mergePoint;
            const isActive = b.status === 'active' || b.status === 'in-progress' || b.status === 'current';

            // Spawn curve: trunk -> branch lane
            const spawnPath = `M ${NW_TRUNK_X} ${ySpawn} C ${NW_TRUNK_X + 40} ${ySpawn}, ${x - 40} ${ySpawn - 20}, ${x} ${ySpawn - 30}`;
            // Branch vertical
            const branchTopY = isOpen ? NW_TOP_PAD - 10 : yMerge + 30;
            // Merge curve: branch lane -> trunk
            const mergePath = b.mergePoint
              ? `M ${x} ${yMerge + 30} C ${x} ${yMerge + 10}, ${NW_TRUNK_X + 40} ${yMerge}, ${NW_TRUNK_X} ${yMerge}`
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
                <circle cx={NW_TRUNK_X} cy={ySpawn} r="3.5" fill={b.color}
                        stroke="var(--vsc-editor-bg)" strokeWidth="1.5" />
                {/* merge point dot */}
                {b.mergePoint && (
                  <circle cx={NW_TRUNK_X} cy={yMerge} r="4" fill="var(--vsc-editor-bg)"
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
