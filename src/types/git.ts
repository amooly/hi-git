export interface RefData {
  type: 'branch' | 'remote' | 'tag';
  name: string;
  current?: boolean;
}

export interface CommitData {
  sha: string;
  lane: number;
  branch: string;
  parents: string[];
  refs: RefData[];
  msg: string;
  author: string;
  email: string;
  date: string;
  dateAbs: string;
}

export interface BranchData {
  lane: number;
  color: string;
  label: string;
}

export interface BranchRelationEntry {
  name: string;
  lane: number;
  color: string;
  commits: number;
  status: string;
  mergesInto: string | null;
  mergePoint?: string | null;
  spawnedFrom: string | null;
  spawnAt: string | null;
}

export interface BranchRelations {
  trunk: string;
  branches: BranchRelationEntry[];
}

export interface RepoData {
  COMMITS: CommitData[];
  BRANCHES: Record<string, BranchData>;
  BRANCH_COLORS: Record<string, string>;
  BRANCH_RELATIONS: BranchRelations;
}
