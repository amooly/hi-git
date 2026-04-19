/**
 * Utility functions for building branch tree structures
 */
import { BranchInfo } from '../../model/git';
import { logger } from './logger';

interface TreeNode {
    children: { [key: string]: TreeNode };
    fullName?: string;
    lastCommitTime?: string;
}

/**
 * Build a tree structure from branch info, grouped by Local and Remote
 * @param branches - Array of branch info objects
 * @returns Tree structure compatible with Ant Design Tree format
 */
export const buildBranchTree = (branches: BranchInfo[]): any[] => {
    logger.log('Building branch tree for ' + branches.length + ' branches');

    const localBranches: BranchInfo[] = [];
    const remoteBranches: BranchInfo[] = [];

    // Common remote prefixes
    const remotePrefixes = ['origin/', 'upstream/', 'remote/'];

    // Categorize branches as local or remote
    branches.forEach(branch => {
        // Skip invalid branch data
        if (!branch || !branch.name) {
            logger.log('Skipping invalid branch data: ' + JSON.stringify(branch));
            return;
        }

        const isRemote = remotePrefixes.some(prefix => branch.name.startsWith(prefix));
        if (isRemote) {
            remoteBranches.push(branch);
        } else {
            localBranches.push(branch);
        }
    });

    // Build tree for a list of branches
    const buildTree = (branchList: BranchInfo[]): TreeNode => {
        const tree: TreeNode = { children: {} };

        branchList.forEach(branch => {
            // Skip invalid branches
            if (!branch || !branch.name) {
                return;
            }

            const parts = branch.name.split('/');
            let current: TreeNode = tree;

            parts.forEach((part, index) => {
                if (!current.children[part]) {
                    current.children[part] = {
                        children: {}
                    };
                }

                // If this is the last part, store the full branch name and commit time
                if (index === parts.length - 1) {
                    current.children[part].fullName = branch.name;
                    current.children[part].lastCommitTime = branch.lastCommitTime;
                }

                current = current.children[part];
            });
        });

        return tree;
    };

    // Convert tree to Ant Design Tree format with sorting by commit time
    const convertToTreeFormat = (node: TreeNode, path: string = ''): any[] => {
        const keys = Object.keys(node.children);

        // Sort keys by their commit time (most recent first)
        const sortedKeys = keys.sort((a, b) => {
            const timeA = node.children[a].lastCommitTime;
            const timeB = node.children[b].lastCommitTime;

            if (!timeA && !timeB) return 0;
            if (!timeA) return 1;
            if (!timeB) return -1;

            // Sort descending (most recent first)
            return new Date(timeB).getTime() - new Date(timeA).getTime();
        });

        return sortedKeys.map(key => {
            const item = node.children[key];
            const currentPath = path ? `${path}/${key}` : key;
            const hasChildren = Object.keys(item.children).length > 0;

            if (hasChildren) {
                // This is a folder/group
                return {
                    title: key,
                    key: item.fullName || currentPath,
                    value: item.fullName || currentPath,
                    children: convertToTreeFormat(item, currentPath),
                    lastCommitTime: item.lastCommitTime
                };
            } else {
                // This is a leaf node
                return {
                    title: key,
                    key: item.fullName || currentPath,
                    value: item.fullName || currentPath,
                    lastCommitTime: item.lastCommitTime
                };
            }
        });
    };

    const result: any[] = [];

    // Add Local branches group if there are any
    if (localBranches.length > 0) {
        const localTree = buildTree(localBranches);
        result.push({
            title: 'Local',
            key: 'local-group',
            value: 'local-group',
            selectable: false,
            children: convertToTreeFormat(localTree)
        });
    }

    // Add Remote branches group if there are any
    if (remoteBranches.length > 0) {
        const remoteTree = buildTree(remoteBranches);
        result.push(...convertToTreeFormat(remoteTree));
    }

    return result;
};
