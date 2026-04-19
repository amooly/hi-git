/* ========================================================================
   GitNexus — sample repo data
   A realistic-looking active web-app repo: main + 4 active branches with
   hotfixes, feature work, a release branch, and merge points.
   Lanes are pre-assigned for the graph renderer.
   ======================================================================== */

// Branch palette (VSCode-esque, but distinct enough to read at a glance)
const BRANCH_COLORS = {
  main:        '#4FC1FF', // bright cyan-blue
  develop:     '#C586C0', // purple
  feature:     '#9CDCFE', // light blue
  release:     '#DCDCAA', // yellow-tan
  hotfix:      '#F48771', // coral
  experiment:  '#4EC9B0', // teal
};

const BRANCHES = {
  'main':                      { lane: 0, color: BRANCH_COLORS.main,       label: 'main' },
  'develop':                   { lane: 1, color: BRANCH_COLORS.develop,    label: 'develop' },
  'feature/network-view':      { lane: 2, color: BRANCH_COLORS.feature,    label: 'feature/network-view' },
  'feature/graph-bezier':      { lane: 3, color: BRANCH_COLORS.feature,    label: 'feature/graph-bezier' },
  'release/2.4.0':             { lane: 4, color: BRANCH_COLORS.release,    label: 'release/2.4.0' },
  'hotfix/auth-token-refresh': { lane: 5, color: BRANCH_COLORS.hotfix,     label: 'hotfix/auth-token-refresh' },
  'experiment/wasm-diff':      { lane: 6, color: BRANCH_COLORS.experiment, label: 'experiment/wasm-diff' },
};

// Commits — ordered newest -> oldest (top of graph = newest)
// Each commit lists the lane it sits on, and the parents (sha or null)
const COMMITS = [
  { sha: 'a3f9c21', lane: 2, branch: 'feature/network-view', parents: ['b8e4d10'],
    refs: [{type:'branch', name:'feature/network-view', current: false}],
    msg: 'feat(network): collapse single-commit branch tips',
    author: 'Mira Patel', email: 'mira@gitnexus.dev', date: '2 minutes ago', dateAbs: '2026-04-18 10:42' },

  { sha: 'b8e4d10', lane: 2, branch: 'feature/network-view', parents: ['c7a2f88'],
    refs: [],
    msg: 'feat(network): vertical river layout with bezier spurs',
    author: 'Mira Patel', email: 'mira@gitnexus.dev', date: '14 minutes ago', dateAbs: '2026-04-18 10:30' },

  { sha: 'c7a2f88', lane: 0, branch: 'main', parents: ['d1f3a09', 'e9c44b2'],
    refs: [{type:'branch', name:'main', current: true}, {type:'remote', name:'origin/main'}],
    msg: "Merge pull request #482 from develop\n\nRelease 2.3.4 → main",
    author: 'Developer', email: 'dev@gitnexus.dev', date: '1 hour ago', dateAbs: '2026-04-18 09:48' },

  { sha: 'd1f3a09', lane: 0, branch: 'main', parents: ['f0a8b13'],
    refs: [{type:'tag', name:'v2.3.4'}],
    msg: 'chore(release): bump version to 2.3.4',
    author: 'Release Bot', email: 'bot@gitnexus.dev', date: '2 hours ago', dateAbs: '2026-04-18 08:55' },

  { sha: 'e9c44b2', lane: 1, branch: 'develop', parents: ['a1b2c93'],
    refs: [{type:'branch', name:'develop'}, {type:'remote', name:'origin/develop'}],
    msg: 'fix(table): preserve scroll position when filter clears',
    author: 'Jonas Berg', email: 'jonas@gitnexus.dev', date: '3 hours ago', dateAbs: '2026-04-18 07:31' },

  { sha: 'f0a8b13', lane: 0, branch: 'main', parents: ['g4d7e21', 'h5b1c00'],
    refs: [],
    msg: "Merge branch 'hotfix/auth-token-refresh'",
    author: 'Developer', email: 'dev@gitnexus.dev', date: '5 hours ago', dateAbs: '2026-04-18 05:10' },

  { sha: 'h5b1c00', lane: 5, branch: 'hotfix/auth-token-refresh', parents: ['g4d7e21'],
    refs: [{type:'branch', name:'hotfix/auth-token-refresh'}],
    msg: 'hotfix(auth): refresh token before expiry, not after',
    author: 'Aiko Tanaka', email: 'aiko@gitnexus.dev', date: '6 hours ago', dateAbs: '2026-04-18 04:22' },

  { sha: 'g4d7e21', lane: 0, branch: 'main', parents: ['i6f2d33'],
    refs: [{type:'tag', name:'v2.3.3'}],
    msg: 'release: 2.3.3',
    author: 'Release Bot', email: 'bot@gitnexus.dev', date: 'Yesterday', dateAbs: '2026-04-17 18:05' },

  { sha: 'a1b2c93', lane: 1, branch: 'develop', parents: ['j7e8f44', 'k2a3b55'],
    refs: [],
    msg: "Merge pull request #481 from feature/graph-bezier",
    author: 'Developer', email: 'dev@gitnexus.dev', date: 'Yesterday', dateAbs: '2026-04-17 16:48' },

  { sha: 'k2a3b55', lane: 3, branch: 'feature/graph-bezier', parents: ['l8c9d66'],
    refs: [{type:'branch', name:'feature/graph-bezier'}],
    msg: 'refactor(graph): extract Bezier path generator',
    author: 'Mira Patel', email: 'mira@gitnexus.dev', date: 'Yesterday', dateAbs: '2026-04-17 15:30' },

  { sha: 'l8c9d66', lane: 3, branch: 'feature/graph-bezier', parents: ['j7e8f44'],
    refs: [],
    msg: 'feat(graph): smooth curves between commit nodes',
    author: 'Mira Patel', email: 'mira@gitnexus.dev', date: 'Yesterday', dateAbs: '2026-04-17 14:12' },

  { sha: 'i6f2d33', lane: 0, branch: 'main', parents: ['j7e8f44'],
    refs: [],
    msg: 'docs: update extension marketplace description',
    author: 'Developer', email: 'dev@gitnexus.dev', date: '2 days ago', dateAbs: '2026-04-16 11:00' },

  { sha: 'j7e8f44', lane: 1, branch: 'develop', parents: ['m9d0e77', 'n4b5c88'],
    refs: [],
    msg: "Merge branch 'release/2.3.0' into develop",
    author: 'Developer', email: 'dev@gitnexus.dev', date: '2 days ago', dateAbs: '2026-04-16 10:14' },

  { sha: 'n4b5c88', lane: 4, branch: 'release/2.4.0', parents: ['o5e6f99'],
    refs: [{type:'branch', name:'release/2.4.0'}],
    msg: 'chore(release): cherry-pick changelog for 2.4.0',
    author: 'Release Bot', email: 'bot@gitnexus.dev', date: '2 days ago', dateAbs: '2026-04-16 09:00' },

  { sha: 'o5e6f99', lane: 4, branch: 'release/2.4.0', parents: ['m9d0e77'],
    refs: [],
    msg: 'feat(filter): real-time DOM removal with 180ms transition',
    author: 'Jonas Berg', email: 'jonas@gitnexus.dev', date: '3 days ago', dateAbs: '2026-04-15 17:45' },

  { sha: 'm9d0e77', lane: 1, branch: 'develop', parents: ['p6a7b00', 'q1c2d11'],
    refs: [],
    msg: "Merge pull request #478 from experiment/wasm-diff",
    author: 'Developer', email: 'dev@gitnexus.dev', date: '3 days ago', dateAbs: '2026-04-15 14:20' },

  { sha: 'q1c2d11', lane: 6, branch: 'experiment/wasm-diff', parents: ['p6a7b00'],
    refs: [{type:'branch', name:'experiment/wasm-diff'}],
    msg: 'experiment: WASM-backed diff renderer (POC)',
    author: 'Aiko Tanaka', email: 'aiko@gitnexus.dev', date: '3 days ago', dateAbs: '2026-04-15 12:05' },

  { sha: 'p6a7b00', lane: 1, branch: 'develop', parents: ['r3e4f22'],
    refs: [],
    msg: 'fix(context-menu): prevent menu overflow at viewport edge',
    author: 'Jonas Berg', email: 'jonas@gitnexus.dev', date: '4 days ago', dateAbs: '2026-04-14 16:18' },

  { sha: 'r3e4f22', lane: 1, branch: 'develop', parents: ['s7a8b33'],
    refs: [],
    msg: 'feat(commit): copy SHA via context menu',
    author: 'Mira Patel', email: 'mira@gitnexus.dev', date: '4 days ago', dateAbs: '2026-04-14 11:42' },

  { sha: 's7a8b33', lane: 0, branch: 'main', parents: ['t8c9d44'],
    refs: [{type:'tag', name:'v2.3.0'}],
    msg: 'release: 2.3.0 — initial public release',
    author: 'Developer', email: 'dev@gitnexus.dev', date: '5 days ago', dateAbs: '2026-04-13 09:00' },

  { sha: 't8c9d44', lane: 0, branch: 'main', parents: [],
    refs: [],
    msg: 'initial commit',
    author: 'Developer', email: 'dev@gitnexus.dev', date: '6 days ago', dateAbs: '2026-04-12 18:30' },
];

// Branch Relations data — derived: who-merges-into-whom
const BRANCH_RELATIONS = {
  trunk: 'main',
  branches: [
    { name: 'main',                      lane: 0, color: BRANCH_COLORS.main,       commits: 6, status: 'current',
      mergesInto: null, spawnedFrom: null, spawnAt: null },
    { name: 'develop',                   lane: 1, color: BRANCH_COLORS.develop,    commits: 8, status: 'active',
      mergesInto: 'main', mergePoint: 'c7a2f88', spawnedFrom: 'main', spawnAt: 's7a8b33' },
    { name: 'feature/network-view',      lane: 2, color: BRANCH_COLORS.feature,    commits: 2, status: 'in-progress',
      mergesInto: null, spawnedFrom: 'main', spawnAt: 'c7a2f88' },
    { name: 'feature/graph-bezier',      lane: 3, color: BRANCH_COLORS.feature,    commits: 2, status: 'merged',
      mergesInto: 'develop', mergePoint: 'a1b2c93', spawnedFrom: 'develop', spawnAt: 'j7e8f44' },
    { name: 'release/2.4.0',             lane: 4, color: BRANCH_COLORS.release,    commits: 2, status: 'in-progress',
      mergesInto: 'develop', mergePoint: 'j7e8f44', spawnedFrom: 'develop', spawnAt: 'm9d0e77' },
    { name: 'hotfix/auth-token-refresh', lane: 5, color: BRANCH_COLORS.hotfix,     commits: 1, status: 'merged',
      mergesInto: 'main', mergePoint: 'f0a8b13', spawnedFrom: 'main', spawnAt: 'g4d7e21' },
    { name: 'experiment/wasm-diff',      lane: 6, color: BRANCH_COLORS.experiment, commits: 1, status: 'merged',
      mergesInto: 'develop', mergePoint: 'm9d0e77', spawnedFrom: 'develop', spawnAt: 'p6a7b00' },
  ],
};

window.GITNEXUS_DATA = { COMMITS, BRANCHES, BRANCH_COLORS, BRANCH_RELATIONS };
