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
 * Build the full set of edges for the commit list.
 * @param {object[]} commits - ordered newest→oldest
 * @param {number} rowH - row height in px
 * @param {object} branches - BRANCHES map from GITNEXUS_DATA
 * Returns: { edges: [{path, color, key}], graphWidth }
 */
function buildEdges(commits, rowH, branches) {
  const byShaIndex = new Map();
  commits.forEach((c, i) => byShaIndex.set(c.sha, i));

  const edges = [];
  let maxLane = 0;

  commits.forEach((c, i) => {
    if (c.lane > maxLane) maxLane = c.lane;
    const cx = laneX(c.lane);
    const cy = i * rowH + rowH / 2;

    c.parents.forEach((parentSha) => {
      const parentIdx = byShaIndex.get(parentSha);
      if (parentIdx == null) return;
      const parent = commits[parentIdx];
      const px = laneX(parent.lane);
      const py = parentIdx * rowH + rowH / 2;
      // color the edge by the LOWER (older) of the two commits' branch
      // so merges into main appear in main's color near the merge point;
      // spurs leaving main are colored by the branch they spawn.
      let edgeColor;
      if (c.lane === parent.lane) {
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
      });
    });
  });

  const graphWidth = laneX(maxLane) + LANE_X0;
  return { edges, graphWidth, maxLane };
}

export { buildEdges, laneX, LANE_W, LANE_X0, ROW_H_DEFAULT };
