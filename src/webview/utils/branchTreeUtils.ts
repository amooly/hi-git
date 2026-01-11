/**
 * Utility functions for building branch tree structures
 */

/**
 * Build a tree structure from branch names, grouped by Local and Remote
 * @param branches - Array of branch names
 * @returns Tree structure compatible with Ant Design filter format
 */
export const buildBranchTree = (branches: string[]): any[] => {
    const localBranches: string[] = [];
    const remoteBranches: string[] = [];

    // Common remote prefixes
    const remotePrefixes = ['origin/', 'upstream/', 'remote/'];

    // Categorize branches as local or remote
    branches.forEach(branch => {
        const isRemote = remotePrefixes.some(prefix => branch.startsWith(prefix));
        if (isRemote) {
            remoteBranches.push(branch);
        } else {
            localBranches.push(branch);
        }
    });

    // Build tree for a list of branches
    const buildTree = (branchList: string[]): any => {
        const tree: any = {};

        branchList.forEach(branch => {
            const parts = branch.split('/');
            let current = tree;

            parts.forEach((part, index) => {
                if (!current[part]) {
                    current[part] = {
                        children: {}
                    };
                }

                // If this is the last part, store the full branch name
                if (index === parts.length - 1) {
                    current[part].fullName = branch;
                }

                current = current[part].children;
            });
        });

        return tree;
    };

    // Convert tree to Ant Design filter format
    const convertToFilterFormat = (node: any, path: string = ''): any[] => {
        return Object.keys(node).map(key => {
            const item = node[key];
            const currentPath = path ? `${path}/${key}` : key;
            const hasChildren = Object.keys(item.children).length > 0;

            if (hasChildren) {
                // This is a folder/group
                return {
                    text: key,
                    value: item.fullName || currentPath,
                    children: convertToFilterFormat(item.children, currentPath)
                };
            } else {
                // This is a leaf node
                return {
                    text: key,
                    value: item.fullName || currentPath
                };
            }
        });
    };

    const result: any[] = [];

    // Add Local branches group if there are any
    if (localBranches.length > 0) {
        const localTree = buildTree(localBranches);
        result.push({
            text: 'Local',
            value: 'Local',
            children: convertToFilterFormat(localTree)
        });
    }

    // Add Remote branches group if there are any
    if (remoteBranches.length > 0) {
        const remoteTree = buildTree(remoteBranches);
        result.push({
            text: 'Remote',
            value: 'Remote',
            children: convertToFilterFormat(remoteTree)
        });
    }

    return result;
};
