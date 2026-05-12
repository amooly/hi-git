/* GitNexus — commit graph SVG generator
   Renders nodes + smooth Bezier curves between commits in the same lane and
   between merge points. Lane positions are precomputed in data.js. */

const LANE_W = 22;       // px between lanes
const LANE_X0 = 18;      // first lane x-offset
const ROW_H_DEFAULT = 36;

function laneX(lane) { return LANE_X0 + lane * LANE_W; }

/**
 * Build SVG path between two points with smooth Bezier curve.
 * Used for both vertical (same-lane) and diagonal (merge/spawn) edges.
 */
function edgePath(x1, y1, x2, y2) {
  if (x1 === x2) {
    // straight vertical
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  // smooth S-curve: control points 50% of the vertical distance
  const dy = y2 - y1;
  const c1y = y1 + dy * 0.5;
  const c2y = y2 - dy * 0.5;
  return `M ${x1} ${y1} C ${x1} ${c1y}, ${x2} ${c2y}, ${x2} ${y2}`;
}

/**
 * Greedily assign lanes to minimise total graph width.
 * Processes commits newest-first, tracking which SHA is "expected" on each
 * lane slot and reusing freed slots immediately.
 */
function assignLanes(commits) {
  const lanes = new Array(commits.length).fill(0);
  // activeLanes[slot] = sha we're still waiting for on that lane, null = free
  const activeLanes = [];

  const findFreeSlot = () => {
    for (let i = 0; i < activeLanes.length; i++) {
      if (activeLanes[i] === null) return i;
    }
    return activeLanes.length;
  };

  for (let i = 0; i < commits.length; i++) {
    const c = commits[i];

    let myLane = activeLanes.indexOf(c.sha);
    if (myLane === -1) {
      myLane = findFreeSlot();
      if (myLane === activeLanes.length) activeLanes.push(null);
    }
    lanes[i] = myLane;
    activeLanes[myLane] = null;

    if (c.parents.length > 0) {
      // First parent continues on this lane (unless already tracked elsewhere)
      if (activeLanes.indexOf(c.parents[0]) === -1) {
        activeLanes[myLane] = c.parents[0];
      }
      // Additional parents (merge) take the smallest available slot
      for (let k = 1; k < c.parents.length; k++) {
        if (activeLanes.indexOf(c.parents[k]) === -1) {
          const slot = findFreeSlot();
          if (slot === activeLanes.length) activeLanes.push(c.parents[k]);
          else activeLanes[slot] = c.parents[k];
        }
      }
    }
  }
  return lanes;
}

/**
 * Build the full set of edges for the commit list.
 * @param {object[]} commits - ordered newest→oldest
 * @param {number} rowH - row height in px
 * @param {object} branches - BRANCHES map from GITNEXUS_DATA
 * Returns: { edges, graphWidth, maxLane, totalHeight, yPositions, computedLanes }
 */
function buildEdges(commits, baseRowH, branches, filteredOut = new Set()) {
  const byShaIndex = new Map();
  commits.forEach((c, i) => byShaIndex.set(c.sha, i));

  const computedLanes = assignLanes(commits);

  const edges = [];
  let maxLane = 0;

  const yPositions = new Array(commits.length);
  let currentY = 0;
  for (let i = 0; i < commits.length; i++) {
    const c = commits[i];
    const isOut = filteredOut.has(c.sha);
    const h = isOut ? 6 : (c.refs.length > 0 ? baseRowH + 18 : baseRowH);
    yPositions[i] = { top: currentY, center: currentY + h / 2, height: h };
    currentY += h;
  }
  const totalHeight = currentY;

  commits.forEach((c, i) => {
    const cl = computedLanes[i];
    if (cl > maxLane) maxLane = cl;
    const cx = laneX(cl);
    const cy = yPositions[i].center;

    c.parents.forEach((parentSha) => {
      const parentIdx = byShaIndex.get(parentSha);
      if (parentIdx == null) return;
      const parent = commits[parentIdx];
      const pl = computedLanes[parentIdx];
      const px = laneX(pl);
      const py = yPositions[parentIdx].center;
      // color the edge by the LOWER (older) of the two commits' branch
      // so merges into main appear in main's color near the merge point;
      // spurs leaving main are colored by the branch they spawn.
      let edgeColor;
      if (cl === pl) {
        edgeColor = branches[c.branch].color;
      } else if (c.parents.length > 1) {
        // merge: this edge brings parent's branch INTO c's branch
        edgeColor = branches[parent.branch].color;
      } else {
        // spawn: c is on a new branch off parent's lane
        edgeColor = branches[c.branch].color;
      }
      edges.push({
        d: edgePath(cx, cy, px, py),
        color: edgeColor,
        key: `${c.sha}-${parentSha}`,
        fromIdx: i,
      });
    });
  });

  const graphWidth = laneX(maxLane) + LANE_X0;
  return { edges, graphWidth, maxLane, totalHeight, yPositions, computedLanes };
}

export { buildEdges, laneX, LANE_W, LANE_X0, ROW_H_DEFAULT };
