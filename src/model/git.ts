export interface GitCommit {
    hash: string;
    shortHash: string;
    author: string;
    date: string;
    message: string;
    parents: string[];
    branches: string[];
}

export interface GitFileChange {
    path: string;
    status: 'M' | 'A' | 'D' | 'R' | 'C' | 'U';
    oldPath?: string; // For renamed files
}

export interface BranchInfo {
    name: string;
    lastCommitTime: string;
}
