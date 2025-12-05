import * as React from 'react';
import { useEffect, useState, useRef, useMemo } from 'react';
import { Dropdown, Checkbox, Input, Tag, Tooltip, Spin, Space, Typography } from 'antd';
import { FilterOutlined, DownOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import 'antd/dist/reset.css';

interface GitCommit {
    hash: string;
    author: string;
    date: string;
    message: string;
    parents: string[];
}

interface GraphCommit extends GitCommit {
    column: number;
    color: string;
}

interface GraphLink {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
    isMerge: boolean;
}

declare const vscode: any;

const COLORS = [
    '#00a8ff', '#9c88ff', '#fbc531', '#4cd137', '#487eb0', '#e84118', '#7f8fa6', '#273c75'
];

const ROW_HEIGHT = 30; // Height of each commit row
const COL_WIDTH = 20;  // Width of each graph column
const CIRCLE_RADIUS = 5;

const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const yyyy = date.getFullYear();
    const MM = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`;
};

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

export const GitGraph: React.FC = () => {
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

    // Graph Calculation
    const { graphCommits, links, svgWidth, commitToBranches } = useMemo(() => {
        const processedCommits: GraphCommit[] = [];
        const links: GraphLink[] = [];
        const activeBranches: { [hash: string]: number } = {}; // parentHash -> column
        let maxColumn = 0;

        // Create reverse mapping: commit hash -> branch names
        const commitToBranches: { [hash: string]: string[] } = {};
        Object.entries(branchHeads).forEach(([branchName, commitHash]) => {
            if (!commitToBranches[commitHash]) {
                commitToBranches[commitHash] = [];
            }
            commitToBranches[commitHash].push(branchName);
        });

        // Helper to get a free column
        const getFreeColumn = (taken: Set<number>) => {
            let col = 0;
            while (taken.has(col)) col++;
            return col;
        };

        commits.forEach((commit, index) => {
            let column = activeBranches[commit.hash];

            if (column === undefined) {
                // New branch tip or root
                const takenColumns = new Set(Object.values(activeBranches));
                column = getFreeColumn(takenColumns);
            }

            // Remove this commit from active branches as we are processing it
            delete activeBranches[commit.hash];

            // Add pass-through links for other active branches
            Object.entries(activeBranches).forEach(([hash, col]) => {
                links.push({
                    x1: col * COL_WIDTH + COL_WIDTH / 2,
                    y1: index * ROW_HEIGHT + ROW_HEIGHT / 2,
                    x2: col * COL_WIDTH + COL_WIDTH / 2,
                    y2: (index + 1) * ROW_HEIGHT + ROW_HEIGHT / 2,
                    color: COLORS[col % COLORS.length],
                    isMerge: false
                });
            });

            // Assign color
            const color = COLORS[column % COLORS.length];

            processedCommits.push({
                ...commit,
                column,
                color
            });

            maxColumn = Math.max(maxColumn, column);

            // Process parents
            commit.parents.forEach((parentHash, parentIndex) => {
                let parentCol = activeBranches[parentHash];

                if (parentCol === undefined) {
                    // If parent not yet seen, assign it to this column if it's the first parent (main line)
                    // or a new column if it's a merge/fork
                    if (parentIndex === 0) {
                        parentCol = column;
                    } else {
                        const takenColumns = new Set(Object.values(activeBranches));
                        parentCol = getFreeColumn(takenColumns);
                    }
                    activeBranches[parentHash] = parentCol;
                }

                links.push({
                    x1: column * COL_WIDTH + COL_WIDTH / 2,
                    y1: index * ROW_HEIGHT + ROW_HEIGHT / 2,
                    x2: parentCol * COL_WIDTH + COL_WIDTH / 2,
                    y2: (index + 1) * ROW_HEIGHT + ROW_HEIGHT / 2,
                    color: parentIndex === 0 ? color : COLORS[parentCol % COLORS.length], // Use child color for main line, parent color for merge
                    isMerge: parentIndex > 0 || column !== parentCol
                });
            });
        });

        return {
            graphCommits: processedCommits,
            links,
            svgWidth: (maxColumn + 1) * COL_WIDTH + 20,
            commitToBranches
        };
    }, [commits, branchHeads]);

    // Compute unique commit identifiers for filtering
    const commitOptions = useMemo(() => {
        return commits.map(c => `${c.hash.substring(0, 7)} - ${c.message}`);
    }, [commits]);

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
                .graph-svg {
                    position: absolute;
                    top: 0;
                    left: 0;
                    pointer-events: none;
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
                .commit-graph-spacer {
                    flex-shrink: 0;
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
                .expanded-content {
                    background-color: var(--vscode-editor-inactiveSelectionBackground);
                    border-left: 3px solid var(--vscode-textLink-foreground);
                    padding: 10px 15px;
                    margin-left: 20px;
                    margin-right: 20px;
                    margin-bottom: 5px;
                    border-radius: 4px;
                }
                .expanded-content-label {
                    font-weight: bold;
                    margin-bottom: 5px;
                    opacity: 0.7;
                }
            `}</style>

            <div className="header-row">
                <div className="header-col" style={{ width: svgWidth }}>
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
                <svg className="graph-svg" width={svgWidth} height={commits.length * ROW_HEIGHT}>
                    {links.map((link, i) => {
                        // Draw bezier curve for smoother connections
                        const d = `M ${link.x1} ${link.y1} C ${link.x1} ${link.y1 + ROW_HEIGHT / 2}, ${link.x2} ${link.y1 + ROW_HEIGHT / 2}, ${link.x2} ${link.y2}`;
                        return (
                            <path
                                key={`link-${i}`}
                                d={d}
                                stroke={link.color}
                                strokeWidth="2"
                                fill="none"
                            />
                        );
                    })}
                    {graphCommits.map((commit, i) => {
                        const branchNames = commitToBranches[commit.hash];
                        const tooltipTitle = branchNames && branchNames.length > 0
                            ? branchNames.join(', ')
                            : undefined;

                        return (
                            <Tooltip key={`node-${commit.hash}`} title={tooltipTitle} placement="right">
                                <circle
                                    cx={commit.column * COL_WIDTH + COL_WIDTH / 2}
                                    cy={i * ROW_HEIGHT + ROW_HEIGHT / 2}
                                    r={CIRCLE_RADIUS}
                                    fill={commit.color}
                                    stroke="var(--vscode-editor-background)"
                                    strokeWidth="2"
                                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                                />
                            </Tooltip>
                        );
                    })}
                </svg>

                <div className="commit-list">
                    {graphCommits.map((commit, i) => (
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
                                    style={{ height: ROW_HEIGHT }}
                                    onDoubleClick={() => {
                                        vscode.postMessage({
                                            command: 'showCommitDetails',
                                            data: commit.hash
                                        });
                                    }}
                                >
                                    <div className="commit-graph-spacer" style={{ width: svgWidth }}></div>
                                    <div className="commit-info">
                                        <span className="commit-hash" style={{ width: '120px' }}>
                                            {commit.hash.substring(0, 7)}
                                            {commitToBranches[commit.hash] && (
                                                <Space size={4}>
                                                    {commitToBranches[commit.hash].map(branchName => (
                                                        <Tag key={branchName} color="blue">
                                                            {branchName}
                                                        </Tag>
                                                    ))}
                                                </Space>
                                            )}
                                        </span>
                                        <span className="commit-message" style={{ flex: 1 }}>
                                            {commit.message}
                                        </span>
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
