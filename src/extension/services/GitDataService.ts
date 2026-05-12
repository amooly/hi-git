import { execSync } from 'child_process';
import * as vscode from 'vscode';
import type {
  RepoData, BranchSummaryEntry, TagSummaryEntry,
  CompareFileData, CommitCompareData, CommitData, RefData, BranchRelationEntry,
} from '@shared/types/index.js';

const BRANCH_COLORS: Record<string, string> = {
  main:       '#4FC1FF',
  master:     '#4FC1FF',
  develop:    '#C586C0',
  feature:    '#9CDCFE',
  release:    '#DCDCAA',
  hotfix:     '#F48771',
  experiment: '#4EC9B0',
  fix:        '#F48771',
  chore:      '#B5CEA8',
};

const FALLBACK_COLORS = ['#CE9178', '#D7BA7D', '#569CD6', '#4EC9B0', '#C586C0'];

function getBranchColor(name: string): string {
  for (const [prefix, color] of Object.entries(BRANCH_COLORS)) {
    if (name === prefix || name.startsWith(prefix + '/')) return color;
  }
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FALLBACK_COLORS[h % FALLBACK_COLORS.length];
}

function getWorkspaceRoot(): string {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
}

function exec(cmd: string, cwd: string): string {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', timeout: 10_000 }).trim();
  } catch {
    return '';
  }
}

interface RawCommit {
  sha: string;
  parents: string[];
  refs: RefData[];
  msg: string;
  author: string;
  email: string;
  date: string;
  dateAbs: string;
}

function parseRefs(decorator: string): RefData[] {
  if (!decorator.trim()) return [];
  const refs: RefData[] = [];
  for (const part of decorator.split(', ')) {
    const p = part.trim();
    const lower = p.toLowerCase();
    if (!p || lower === 'head') continue;

    if (lower.startsWith('head -> refs/heads/')) {
      refs.push({ type: 'branch', name: p.slice(19), current: true });
    } else if (lower.startsWith('head -> ')) {
      refs.push({ type: 'branch', name: p.slice(8), current: true });
    } else if (lower.startsWith('refs/heads/')) {
      refs.push({ type: 'branch', name: p.slice(11) });
    } else if (lower.startsWith('refs/remotes/')) {
      refs.push({ type: 'remote', name: p.slice(13) });
    } else if (lower.startsWith('refs/tags/')) {
      refs.push({ type: 'tag', name: p.slice(10) });
    } else if (lower.startsWith('tag: ')) {
      refs.push({ type: 'tag', name: p.slice(5) });
    } else if (p.includes('/')) {
      // Check if it's a remote but prefixed with REFS/ (sometimes happens in some git versions/output)
      if (lower.startsWith('refs/')) {
        const stripped = p.slice(5);
        if (lower.startsWith('refs/tags/')) refs.push({ type: 'tag', name: stripped.slice(5) });
        else if (lower.startsWith('refs/remotes/')) refs.push({ type: 'remote', name: stripped.slice(8) });
        else refs.push({ type: 'branch', name: stripped });
      } else {
        refs.push({ type: 'remote', name: p });
      }
    } else {
      refs.push({ type: 'branch', name: p });
    }
  }
  return refs;
}

function fetchRawCommits(cwd: string, maxCount = 500): RawCommit[] {
  // Use git's own hex escapes (%x1f, %x1e) as field/record separators in the output.
  // This avoids conflicts with any characters that could appear in commit metadata.
  const raw = exec(
    `git log --all --topo-order --decorate=full --max-count=${maxCount}` +
    ` --format=%H%x1f%P%x1f%D%x1f%s%x1f%aN%x1f%aE%x1f%ar%x1f%ai%x1e`,
    cwd,
  );

  return raw.split('\x1e')
    .map(r => r.trim())
    .filter(Boolean)
    .map(record => {
      const f = record.split('\x1f');
      return {
        sha:     f[0]?.trim() ?? '',
        parents: f[1]?.trim() ? f[1].trim().split(' ').filter(Boolean) : [],
        refs:    parseRefs(f[2]?.trim() ?? ''),
        msg:     f[3]?.trim() ?? '',
        author:  f[4]?.trim() ?? '',
        email:   f[5]?.trim() ?? '',
        date:    f[6]?.trim() ?? '',
        dateAbs: f[7]?.trim() ?? '',
      };
    })
    .filter(c => c.sha.length > 0);
}

// Assign commits to lanes using the active-lanes graph-walk algorithm.
// Each lane tracks the next SHA it expects; when a commit matches, it inherits that lane.
// Merge parents open new lanes so their branch is rendered independently.
function buildGraphData(rawCommits: RawCommit[]): {
  commits: CommitData[];
  branches: RepoData['BRANCHES'];
  branchColors: RepoData['BRANCH_COLORS'];
  branchLanes: Map<string, number>;
} {
  const activeLanes: Array<string | null> = [];
  const laneBranch: string[] = [];
  const branchLanes = new Map<string, number>();
  const branchColorMap: Record<string, string> = {};
  const commits: CommitData[] = [];

  for (const rc of rawCommits) {
    let laneIdx = activeLanes.indexOf(rc.sha);
    const localRef = rc.refs.find(r => r.type === 'branch');

    let branch: string;
    if (laneIdx >= 0) {
      // Inherit the lane's branch, but let an explicit ref override the placeholder name
      branch = localRef?.name ?? laneBranch[laneIdx];
      laneBranch[laneIdx] = branch;
      activeLanes[laneIdx] = rc.parents[0] ?? null;
    } else {
      // New branch tip — open a fresh lane
      branch = localRef?.name
             ?? rc.refs.find(r => r.type === 'remote')?.name.replace(/^[^/]+\//, '')
             ?? `anon-${rc.sha.slice(0, 4)}`;
      laneIdx = activeLanes.indexOf(null);
      if (laneIdx < 0) { laneIdx = activeLanes.length; activeLanes.push(null); laneBranch.push(''); }
      laneBranch[laneIdx] = branch;
      activeLanes[laneIdx] = rc.parents[0] ?? null;
    }

    if (!branchLanes.has(branch)) {
      branchLanes.set(branch, laneIdx);
      branchColorMap[branch] = getBranchColor(branch);
    }

    // Open a new lane for each merge parent (parents[1+]) so it renders as a separate branch line
    for (let i = 1; i < rc.parents.length; i++) {
      const pSha = rc.parents[i];
      if (!activeLanes.includes(pSha)) {
        const freeIdx = activeLanes.indexOf(null);
        const placeholder = `anon-${pSha.slice(0, 4)}`;
        if (freeIdx >= 0) {
          activeLanes[freeIdx] = pSha;
          laneBranch[freeIdx] = placeholder;
        } else {
          activeLanes.push(pSha);
          laneBranch.push(placeholder);
        }
      }
    }

    commits.push({
      sha:     rc.sha.slice(0, 7),
      lane:    laneIdx,
      branch,
      parents: rc.parents.map(p => p.slice(0, 7)),
      refs:    rc.refs,
      msg:     rc.msg,
      author:  rc.author,
      email:   rc.email,
      date:    rc.date,
      dateAbs: rc.dateAbs,
    });
  }

  const branches: RepoData['BRANCHES'] = {};
  for (const [name, lane] of branchLanes) {
    branches[name] = { lane, color: getBranchColor(name), label: name };
  }

  return { commits, branches, branchColors: branchColorMap, branchLanes };
}

function buildBranchRelations(
  commits: CommitData[],
  branchLanes: Map<string, number>,
  headBranch: string,
): RepoData['BRANCH_RELATIONS'] {
  const allBranches = [...branchLanes.keys()];
  const trunk = allBranches.includes('main') ? 'main'
              : allBranches.includes('master') ? 'master'
              : allBranches[0] ?? 'main';

  const commitMap = new Map<string, CommitData>(commits.map(c => [c.sha, c]));

  const entries: BranchRelationEntry[] = [];
  for (const [name, lane] of branchLanes) {
    const branchCommits = commits.filter(c => c.branch === name);

    // Find the merge commit (on another branch) that merged this branch in
    let mergePoint: string | null = null;
    let mergesInto: string | null = null;
    if (name !== trunk) {
      for (const c of commits) {
        if (c.parents.length >= 2) {
          for (let i = 1; i < c.parents.length; i++) {
            if (commitMap.get(c.parents[i])?.branch === name) {
              mergePoint = c.sha;
              mergesInto = c.branch;
              break;
            }
          }
          if (mergePoint) break;
        }
      }
    }

    // The spawn point is the first parent of the oldest branch commit that lives on a different branch
    let spawnAt: string | null = null;
    let spawnedFrom: string | null = null;
    if (name !== trunk && branchCommits.length > 0) {
      const oldest = branchCommits[branchCommits.length - 1];
      const firstParent = oldest.parents[0] ? commitMap.get(oldest.parents[0]) : undefined;
      if (firstParent && firstParent.branch !== name) {
        spawnAt = oldest.parents[0];
        spawnedFrom = firstParent.branch;
      }
    }

    const status = name === headBranch ? 'current'
                 : mergePoint          ? 'merged'
                 : 'active';

    entries.push({
      name, lane,
      color: getBranchColor(name),
      commits: branchCommits.length,
      status,
      mergesInto,
      mergePoint,
      spawnedFrom,
      spawnAt,
    });
  }

  entries.sort((a, b) => a.name === trunk ? -1 : b.name === trunk ? 1 : a.lane - b.lane);
  return { trunk, branches: entries };
}

function formatTrack(track: string): string | undefined {
  const ahead  = track.match(/ahead (\d+)/)?.[1];
  const behind = track.match(/behind (\d+)/)?.[1];
  const parts: string[] = [];
  if (ahead)  parts.push(`↑${ahead}`);
  if (behind) parts.push(`↓${behind}`);
  return parts.join(' ') || undefined;
}

class GitDataService {
  getRepoData(): RepoData {
    const cwd = getWorkspaceRoot();
    const rawCommits = fetchRawCommits(cwd);

    if (rawCommits.length === 0) {
      return { COMMITS: [], BRANCHES: {}, BRANCH_COLORS: {}, BRANCH_RELATIONS: { trunk: 'main', branches: [] } };
    }

    const headBranch = exec('git rev-parse --abbrev-ref HEAD', cwd);
    const { commits, branches, branchColors, branchLanes } = buildGraphData(rawCommits);
    const branchRelations = buildBranchRelations(commits, branchLanes, headBranch);

    return { COMMITS: commits, BRANCHES: branches, BRANCH_COLORS: branchColors, BRANCH_RELATIONS: branchRelations };
  }

  getBranchSummary(): BranchSummaryEntry[] {
    const cwd = getWorkspaceRoot();
    const headBranch = exec('git rev-parse --abbrev-ref HEAD', cwd);
    const out = exec(`git branch --format='%(refname:short)|%(upstream:track)'`, cwd);
    return out.split('\n')
      .filter(Boolean)
      .map(line => {
        const [name, track = ''] = line.split('|');
        const trimmedName = name.trim();
        return {
          name: trimmedName,
          color: getBranchColor(trimmedName),
          current: trimmedName === headBranch,
          meta: formatTrack(track.trim()),
        };
      });
  }

  getTagSummary(): TagSummaryEntry[] {
    const cwd = getWorkspaceRoot();
    const out = exec('git tag --sort=-version:refname', cwd);
    return out.split('\n').filter(Boolean).map(name => ({ name: name.trim() }));
  }

  getCommitDiff(sha: string): CommitCompareData {
    const cwd = getWorkspaceRoot();
    const message  = exec(`git log -1 --format=%s ${sha}`, cwd);
    const parentLine = exec(`git log -1 --format=%P ${sha}`, cwd);
    const parentSha  = parentLine.split(' ')[0]?.slice(0, 7) || null;

    // name-status gives us A/M/D/R codes; numstat gives insertion/deletion counts
    const statusLines  = exec(`git diff-tree --no-commit-id -r --name-status -M50% ${sha}`, cwd).split('\n').filter(Boolean);
    const numstatLines = exec(`git diff-tree --no-commit-id -r --numstat -M50% ${sha}`, cwd).split('\n').filter(Boolean);

    const statusMap = new Map<string, { status: CompareFileData['status']; oldPath?: string }>();
    for (const line of statusLines) {
      const parts = line.split('\t');
      const code = parts[0].charAt(0);
      if (code === 'R' || code === 'C') {
        statusMap.set(parts[2], { status: 'renamed', oldPath: parts[1] });
      } else {
        const s: CompareFileData['status'] = code === 'A' ? 'added' : code === 'D' ? 'deleted' : 'modified';
        statusMap.set(parts[1], { status: s });
      }
    }

    const files: CompareFileData[] = numstatLines.flatMap(line => {
      const [ins, del, rawPath] = line.split('\t');
      if (!rawPath) return [];

      const insertions = ins === '-' ? 0 : (parseInt(ins) || 0);
      const deletions  = del === '-' ? 0 : (parseInt(del) || 0);

      // Parse git's brace-rename format: "some/{old => new}/path" or "old => new"
      let path = rawPath;
      let oldPath: string | undefined;
      const braceMatch = rawPath.match(/^(.*)\{(.+) => (.+)\}(.*)$/);
      if (braceMatch) {
        const [, pre, old, neu, suf] = braceMatch;
        oldPath = `${pre}${old}${suf}`.replace(/\/+/g, '/').replace(/^\//, '');
        path    = `${pre}${neu}${suf}`.replace(/\/+/g, '/').replace(/^\//, '');
      } else if (rawPath.includes(' => ')) {
        const idx = rawPath.indexOf(' => ');
        oldPath = rawPath.slice(0, idx).trim();
        path    = rawPath.slice(idx + 4).trim();
      }

      const info = statusMap.get(path) ?? statusMap.get(rawPath);
      if (!oldPath && info?.oldPath) oldPath = info.oldPath;

      const entry: CompareFileData = { status: info?.status ?? 'modified', path, insertions, deletions };
      if (oldPath) entry.oldPath = oldPath;
      return [entry];
    });

    return { sha: sha.slice(0, 7), parentSha, message, files };
  }
}

export const gitDataService = new GitDataService();
