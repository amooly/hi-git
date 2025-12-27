import * as cp from 'child_process';
import * as path from 'path';
import * as util from 'util';
import * as vscode from 'vscode';
import { GitCommit, GitFileChange } from '../model/git';

const exec = util.promisify(cp.exec);

export { GitCommit, GitFileChange };

class GitService {
    async getLog(cwd: string, filePath?: string, skip: number = 0, maxCount: number = 100, filters?: { branches?: string[], authors?: string[] }): Promise<GitCommit[]> {
        // Format: hash|shortHash|author|date|parents|message|branches
        const format = "%H|%h|%an|%ad|%P|%s|%D";
        let command = `git log --pretty=format:"${format}" --date=iso --skip=${skip} --max-count=${maxCount}`;

        if (filters?.authors && filters.authors.length > 0) {
            filters.authors.forEach(author => {
                command += ` --author="${author}"`;
            });
        }

        if (filePath) {
            command += ` -- "${filePath}"`;
        } else {
            if (filters?.branches && filters.branches.length > 0) {
                command += ` ${filters.branches.join(' ')}`;
            } else {
                command += ` --all`;
            }
        }

        const { stdout } = await exec(command, { cwd });

        return stdout.split('\n').filter(line => line.trim() !== '').map(line => {
            const [hash, shortHash, author, date, parentsStr, message, branchesStr] = line.split('|');
            // Parse branch names from %D format (e.g., "HEAD -> main, origin/main, feature")
            const branches = branchesStr
                ? branchesStr.split(', ').map(b => b.replace(/^HEAD -> /, '').trim()).filter(b => b !== '')
                : [];
            return {
                hash,
                shortHash,
                author,
                date,
                parents: parentsStr ? parentsStr.split(' ') : [],
                message,
                branches
            };
        });
    }

    async getBranches(cwd: string): Promise<string[]> {
        const { stdout } = await exec('git branch -a --format="%(refname:short)"', { cwd });
        return stdout.split('\n').filter(line => line.trim() !== '');
    }

    async getBranchHeads(cwd: string): Promise<{ [branchName: string]: string }> {
        // Get all branches with their commit hashes
        // Format: hash refname
        const { stdout } = await exec('git show-ref --heads --dereference', { cwd });
        const branchHeads: { [branchName: string]: string } = {};

        stdout.split('\n').filter(line => line.trim() !== '').forEach(line => {
            const [hash, ref] = line.split(' ');
            // ref format is refs/heads/branch-name
            const branchName = ref.replace('refs/heads/', '');
            branchHeads[branchName] = hash;
        });

        return branchHeads;
    }

    async getAuthors(cwd: string): Promise<string[]> {
        const { stdout } = await exec('git log --format="%an" | sort -u', { cwd });
        return stdout.split('\n').filter(line => line.trim() !== '');
    }

    async queryMetaData(cwd: string): Promise<{ branches: string[], authors: string[] }> {
        const [branches, authors] = await Promise.all([
            this.getBranches(cwd),
            this.getAuthors(cwd)
        ]);
        return { branches, authors };
    }

    async getTags(cwd: string): Promise<string[]> {
        const { stdout } = await exec('git tag', { cwd });
        return stdout.split('\n').filter(line => line.trim() !== '');
    }

    async getDiffFiles(cwd: string, ref1: string, ref2: string): Promise<string[]> {
        const { stdout } = await exec(`git diff --name-only ${ref1} ${ref2}`, { cwd });
        return stdout.split('\n').filter(line => line.trim() !== '');
    }

    async getDiffFilesWithStatus(cwd: string, ref1: string, ref2: string, filterPath?: string): Promise<GitFileChange[]> {
        let command = `git diff --name-status ${ref1} ${ref2}`;
        if (filterPath) {
            command += ` -- "${filterPath}"`;
        }
        const { stdout } = await exec(command, { cwd });
        return stdout.split('\n').filter(line => line.trim() !== '').map(line => {
            const parts = line.split('\t');
            const status = parts[0].charAt(0) as 'M' | 'A' | 'D' | 'R' | 'C' | 'U';
            const path = parts[1];
            const oldPath = parts[2]; // For renamed files

            return {
                path,
                status,
                oldPath
            };
        });
    }

    async getDiffFilesWithWorkingDirectory(cwd: string, ref: string, filterPath?: string): Promise<GitFileChange[]> {
        // Compare ref with working directory (includes uncommitted and unstaged changes)
        let command = `git diff --name-status ${ref}`;
        if (filterPath) {
            command += ` -- "${filterPath}"`;
        }
        const { stdout } = await exec(command, { cwd });
        return stdout.split('\n').filter(line => line.trim() !== '').map(line => {
            const parts = line.split('\t');
            const status = parts[0].charAt(0) as 'M' | 'A' | 'D' | 'R' | 'C' | 'U';
            const path = parts[1];
            const oldPath = parts[2]; // For renamed files

            return {
                path,
                status,
                oldPath
            };
        });
    }

    async getCommitDetails(cwd: string, commitHash: string): Promise<GitCommit> {
        const format = "%H|%h|%an|%ad|%P|%s|%D";
        const { stdout } = await exec(`git show -s --format="${format}" --date=iso ${commitHash}`, { cwd });
        const [hash, shortHash, author, date, parentsStr, message, branchesStr] = stdout.trim().split('|');
        const branches = branchesStr
            ? branchesStr.split(', ').map(b => b.replace(/^HEAD -> /, '').trim()).filter(b => b !== '')
            : [];
        return {
            hash,
            shortHash,
            author,
            date,
            parents: parentsStr ? parentsStr.split(' ') : [],
            message,
            branches
        };
    }

    async getCommitFiles(cwd: string, commitHash: string): Promise<string[]> {
        const { stdout } = await exec(`git show --pretty="" --name-only ${commitHash}`, { cwd });
        return stdout.split('\n').filter(line => line.trim() !== '');
    }

    async isInsideWorkTree(cwd: string): Promise<boolean> {
        try {
            const { stdout } = await exec('git rev-parse --is-inside-work-tree', { cwd });
            return stdout.trim() === 'true';
        } catch (e) {
            return false;
        }
    }

    async getRepoRoot(cwd: string): Promise<string> {
        const { stdout } = await exec('git rev-parse --show-toplevel', { cwd });
        return stdout.trim();
    }

    async isTracked(cwd: string, filePath: string): Promise<boolean> {
        try {
            // git ls-files --error-unmatch <file> exits with 1 if file is not tracked
            await exec(`git ls-files --error-unmatch "${filePath}"`, { cwd });
            return true;
        } catch (e) {
            return false;
        }
    }

    async checkFileOrFolderTracked(uri: vscode.Uri): Promise<boolean> {
        const stat = await vscode.workspace.fs.stat(uri);
        if (stat.type === vscode.FileType.Directory) {
            return this.isInsideWorkTree(uri.fsPath);
        } else {
            return this.isTracked(path.dirname(uri.fsPath), uri.fsPath);
        }
    }
}

export const gitService = new GitService();
