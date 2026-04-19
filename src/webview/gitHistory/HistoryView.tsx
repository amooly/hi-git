import { DownOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Checkbox, Dropdown, Input, Space, Spin, Tag, Tooltip } from 'antd';
import 'antd/dist/reset.css';
import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GitCommit } from '../../model/git';
import { formatDate } from '../utils/common';

declare const vscode: any;

const ROW_HEIGHT = 30; // Height of each commit row

const FilterDropdown: React.FC<{
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    label: string;
}> = ({ options, selected, onChange, label }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [open, setOpen] = useState(false);

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const items: MenuProps['items'] = [
        {
            key: 'search',
            label: (
                <Input.Search
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    style={{ marginBottom: 8 }}
                />
            ),
        },
        {
            type: 'divider',
        },
        {
            key: 'options',
            label: (
                <Checkbox.Group
                    value={selected}
                    onChange={onChange as any}
                    style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                    <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                        {filteredOptions.map(option => (
                            <div key={option} style={{ padding: '4px 0' }}>
                                <Checkbox value={option}>{option}</Checkbox>
                            </div>
                        ))}
                    </div>
                </Checkbox.Group>
            ),
        },
    ];

    return (
        <Dropdown
            menu={{ items }}
            trigger={['click']}
            open={open}
            onOpenChange={setOpen}
        >
            <Space style={{ cursor: 'pointer' }}>
                {label}
                {selected.length > 0 ? (
                    <Tag color="blue">{selected.length}</Tag>
                ) : (
                    <DownOutlined style={{ fontSize: 10 }} />
                )}
            </Space>
        </Dropdown>
    );
};

export const HistoryView: React.FC = () => {
    const [commits, setCommits] = useState<GitCommit[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const [branches, setBranches] = useState<string[]>([]);
    const [authors, setAuthors] = useState<string[]>([]);
    const [branchHeads, setBranchHeads] = useState<{ [branchName: string]: string }>({});
    const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
    const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
    const [selectedCommits, setSelectedCommits] = useState<string[]>([]);
    const [hoveredCommitIndex, setHoveredCommitIndex] = useState<number | null>(null);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            switch (message.command) {
                case 'setLog':
                    const newCommits = message.data;
                    const skip = message.skip || 0;

                    if (newCommits.length === 0) {
                        setHasMore(false);
                    } else {
                        setCommits(prev => {
                            if (skip === 0) return newCommits;
                            // Avoid duplicates if any
                            const existingHashes = new Set(prev.map(c => c.hash));
                            const filtered = newCommits.filter((c: GitCommit) => !existingHashes.has(c.hash));
                            return [...prev, ...filtered];
                        });
                    }
                    setIsLoading(false);
                    break;
                case 'setBranches':
                    setBranches(message.data);
                    break;
                case 'setBranchHeads':
                    setBranchHeads(message.data);
                    break;
                case 'setAuthors':
                    setAuthors(message.data);
                    break;
            }
        };

        window.addEventListener('message', handleMessage);

        // Initial load
        loadMore(0);
        vscode.postMessage({ command: 'getBranches' });
        vscode.postMessage({ command: 'getBranchHeads' });
        vscode.postMessage({ command: 'getAuthors' });

        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const loadMore = (skip: number) => {
        setIsLoading(true);
        vscode.postMessage({
            command: 'getLog',
            data: {
                skip,
                filters: {
                    branches: selectedBranches,
                    authors: selectedAuthors,
                    commits: selectedCommits
                }
            }
        });
    };

    useEffect(() => {
        setCommits([]);
        setHasMore(true);
        loadMore(0);
    }, [selectedBranches, selectedAuthors, selectedCommits]);

    const handleScroll = () => {
        if (!containerRef.current || isLoading || !hasMore) return;

        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        if (scrollHeight - scrollTop <= clientHeight + 100) {
            loadMore(commits.length);
        }
    };

    // Compute unique commit identifiers for filtering
    const commitOptions = useMemo(() => {
        return commits.map(c => `${c.hash.substring(0, 7)} - ${c.message}`);
    }, [commits]);

    // Create reverse mapping: commit hash -> branch names
    const commitToBranches = useMemo(() => {
        const mapping: { [hash: string]: string[] } = {};
        Object.entries(branchHeads).forEach(([branchName, commitHash]) => {
            if (!mapping[commitHash]) {
                mapping[commitHash] = [];
            }
            mapping[commitHash].push(branchName);
        });
        return mapping;
    }, [branchHeads]);

    return (
        <div className="git-graph-container" ref={containerRef} onScroll={handleScroll}>
            <style>{`
                .git-graph-container {
                    height: 100vh;
                    overflow-y: auto;
                    position: relative;
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-editor-foreground);
                    background-color: var(--vscode-editor-background);
                }
                .graph-content {
                    position: relative;
                    min-height: 100%;
                }
                .commit-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                .commit-row {
                    height: 30px;
                    display: flex;
                    align-items: center;
                    box-sizing: border-box;
                    padding-right: 10px;
                }
                .commit-row:hover {
                    background-color: var(--vscode-list-hoverBackground);
                }
                .commit-info {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    overflow: hidden;
                    white-space: nowrap;
                }
                .commit-hash {
                    font-family: monospace;
                    margin-right: 10px;
                    color: var(--vscode-textPreformat-foreground);
                    opacity: 0.8;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-shrink: 0;
                }
                .commit-message {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    margin-right: 10px;
                    cursor: default;
                }
                .commit-author {
                    margin-right: 10px;
                    opacity: 0.7;
                    font-size: 0.9em;
                }
                .commit-date {
                    opacity: 0.5;
                    font-size: 0.8em;
                    width: 120px;
                    text-align: right;
                }
                .header-row {
                    display: flex;
                    height: 40px;
                    align-items: center;
                    background-color: var(--vscode-editor-background);
                    border-bottom: 1px solid var(--vscode-widget-border);
                    position: sticky;
                    top: 0;
                    z-index: 10;
                    font-weight: bold;
                    padding: 0 10px;
                }
                .header-col {
                    display: flex;
                    align-items: center;
                    padding: 0 5px;
                }
                /* Override Ant Design styles to match VS Code theme */
                .ant-dropdown {
                    background: var(--vscode-dropdown-background) !important;
                    border: 1px solid var(--vscode-dropdown-border) !important;
                    color: var(--vscode-dropdown-foreground) !important;
                }
                .ant-dropdown-menu {
                    background: var(--vscode-dropdown-background) !important;
                    color: var(--vscode-dropdown-foreground) !important;
                }
                .ant-dropdown-menu-item {
                    color: var(--vscode-dropdown-foreground) !important;
                }
                .ant-dropdown-menu-item:hover {
                    background: var(--vscode-list-hoverBackground) !important;
                }
                .ant-input {
                    background: var(--vscode-input-background) !important;
                    color: var(--vscode-input-foreground) !important;
                    border: 1px solid var(--vscode-input-border) !important;
                }
                .ant-checkbox-wrapper {
                    color: var(--vscode-dropdown-foreground) !important;
                }
                .ant-tag {
                    background-color: var(--vscode-badge-background) !important;
                    color: var(--vscode-badge-foreground) !important;
                    border: none !important;
                }
                .ant-spin {
                    color: var(--vscode-editor-foreground) !important;
                }
            `}</style>

            <div className="header-row">
                <div className="header-col" style={{ width: '150px' }}>
                    <FilterDropdown
                        label="Branch"
                        options={branches}
                        selected={selectedBranches}
                        onChange={setSelectedBranches}
                    />
                </div>
                <div className="header-col" style={{ width: '120px' }}>
                    <FilterDropdown
                        label="Commit"
                        options={commitOptions}
                        selected={selectedCommits}
                        onChange={setSelectedCommits}
                    />
                </div>
                <div className="header-col" style={{ flex: 1 }}>
                    <span>Message</span>
                </div>
                <div className="header-col" style={{ width: '150px' }}>
                    <FilterDropdown
                        label="Author"
                        options={authors}
                        selected={selectedAuthors}
                        onChange={setSelectedAuthors}
                    />
                </div>
                <div className="header-col" style={{ width: '160px', textAlign: 'right', justifyContent: 'flex-end' }}>
                    <span>Date</span>
                </div>
            </div>

            <div className="graph-content">
                <div className="commit-list">
                    {commits.map((commit, i) => (
                        <React.Fragment key={commit.hash}>
                            <Dropdown
                                menu={{
                                    items: [
                                        {
                                            key: 'copy-hash',
                                            label: 'Copy CommitID',
                                            onClick: () => {
                                                navigator.clipboard.writeText(commit.hash);
                                            }
                                        },
                                        {
                                            key: 'view-details',
                                            label: 'View Commit Detail',
                                            onClick: () => {
                                                vscode.postMessage({
                                                    command: 'showCommitDetails',
                                                    data: commit.hash
                                                });
                                            }
                                        },
                                        {
                                            key: 'compare-local',
                                            label: 'Compare Local with This Commit',
                                            onClick: () => {
                                                vscode.postMessage({
                                                    command: 'compareWith',
                                                    data: commit.hash
                                                });
                                            }
                                        }
                                    ]
                                }}
                                trigger={['contextMenu']}
                            >
                                <div
                                    className="commit-row"
                                    style={{ height: ROW_HEIGHT, cursor: 'pointer' }}
                                    onMouseEnter={() => setHoveredCommitIndex(i)}
                                    onMouseLeave={() => setHoveredCommitIndex(null)}
                                    onDoubleClick={() => {
                                        vscode.postMessage({
                                            command: 'showCommitDetails',
                                            data: commit.hash
                                        });
                                    }}
                                >
                                    <div className="commit-info">
                                        <div style={{ width: '150px', paddingLeft: '10px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {commitToBranches[commit.hash] && (
                                                <Space size={4}>
                                                    {commitToBranches[commit.hash].map(branchName => (
                                                        <Tag key={branchName} color="blue">
                                                            {branchName}
                                                        </Tag>
                                                    ))}
                                                </Space>
                                            )}
                                        </div>
                                        <span className="commit-hash" style={{ width: '120px' }}>
                                            {commit.hash.substring(0, 7)}
                                        </span>
                                        <Tooltip title={commit.message} placement="topLeft">
                                            <span className="commit-message" style={{ flex: 1 }}>
                                                {commit.message}
                                            </span>
                                        </Tooltip>
                                        <span className="commit-author" style={{ width: '150px', marginRight: '10px' }}>{commit.author}</span>
                                        <span className="commit-date" style={{ width: '160px' }}>{formatDate(commit.date)}</span>
                                    </div>
                                </div>
                            </Dropdown>
                        </React.Fragment>
                    ))}
                </div>
                {isLoading && (
                    <div style={{ padding: '20px', textAlign: 'center' }}>
                        <Spin size="large" />
                    </div>
                )}
            </div>
        </div>
    );
};
