import { Button, Input, Tree } from 'antd';
import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { BranchInfo } from '../../model/git';
import { buildBranchTree } from '../utils/branchTreeUtils';

interface BranchFilterDropdownProps {
    branches: BranchInfo[];
    selectedBranches: string[];
    onBranchSelect: (branches: string[]) => void;
    confirm?: () => void;
    clearFilters?: () => void;
}

export const BranchFilterDropdown: React.FC<BranchFilterDropdownProps> = ({
    branches,
    selectedBranches,
    onBranchSelect,
    confirm,
    clearFilters,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [checkedKeys, setCheckedKeys] = useState<string[]>(selectedBranches);

    // Sync with external selected branches
    useEffect(() => {
        setCheckedKeys(selectedBranches);
    }, [selectedBranches]);

    // Build tree structure from branches
    const treeData = useMemo(() => buildBranchTree(branches), [branches]);

    // Filter tree data based on search term
    const filteredTreeData = useMemo(() => {
        if (!searchTerm) return treeData;

        const filterTree = (nodes: any[]): any[] => {
            return nodes
                .map(node => {
                    const matchesSearch = node.title?.toLowerCase().includes(searchTerm.toLowerCase());
                    const filteredChildren = node.children ? filterTree(node.children) : [];

                    if (matchesSearch || filteredChildren.length > 0) {
                        return {
                            ...node,
                            children: filteredChildren.length > 0 ? filteredChildren : node.children
                        };
                    }
                    return null;
                })
                .filter(Boolean) as any[];
        };

        return filterTree(treeData);
    }, [treeData, searchTerm]);



    // Handle checkbox change
    const onCheck = (checked: any) => {
        const keys = Array.isArray(checked) ? checked : checked.checked;
        const validKeys = keys.filter((key: string) => key !== 'local-group');
        setCheckedKeys(validKeys);
    };

    // Apply filter
    const applyFilter = () => {
        onBranchSelect(checkedKeys);
        confirm?.();
    };

    // Clear filter
    const handleClearFilter = () => {
        setCheckedKeys([]);
        onBranchSelect([]);
        clearFilters?.();
    };



    return (
        <div style={{ padding: '12px', width: '400px', maxHeight: '500px', overflow: 'auto' }}>
            {/* Search Input */}
            <Input
                placeholder="Search branches..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ marginBottom: '12px' }}
            />



            {/* Branch Tree */}
            <div style={{ marginBottom: '12px', maxHeight: '300px', overflow: 'auto' }}>
                <Tree
                    checkable
                    selectable={false}
                    defaultExpandAll
                    checkedKeys={checkedKeys}
                    onCheck={onCheck}
                    treeData={filteredTreeData}
                    titleRender={(node: any) => (
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <span>{node.title}</span>
                            {node.lastCommitTime && (
                                <span style={{ fontSize: '11px', color: '#888', marginLeft: '8px' }}>
                                    {new Date(node.lastCommitTime).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    )}
                />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <Button type="link" size="small" onClick={handleClearFilter}
                    disabled={checkedKeys.length === 0}>
                    Reset
                </Button>
                <Button type="primary" size="small" onClick={applyFilter}>
                    OK
                </Button>
            </div>
        </div>
    );
};
