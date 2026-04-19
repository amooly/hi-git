import { Spin, Tag, Tooltip } from 'antd';
import * as React from 'react';
import { GitCommit } from '../../model/git';
import { formatDate } from '../utils/common';
import { CommitRowDropdown } from './CommitRowDropdown';
import { ColWidth } from './GitGraph';

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

interface GitGraphContentProps {
    commits: GitCommit[];
    isLoading: boolean;
    hasMore: boolean;
    columnWidth: ColWidth;
    onColumnWidthChange: (updates: Partial<ColWidth>) => void;
    onLoadMore: (skip: number) => void;
    scrollToCommit?: { hash: string; ts: number } | null;
}

const COLORS = [
    '#00a8ff', '#9c88ff', '#4cd137', '#487eb0', '#e84118', '#fbc531', '#7f8fa6', '#273c75'
];

const ROW_HEIGHT = 30;
const COL_WIDTH = 20;
const CIRCLE_RADIUS = 5;
const HALF_ROW = ROW_HEIGHT / 2;
const HALF_COL = COL_WIDTH / 2;

declare const vscode: any;

// Helper functions
const getFreeColumn = (taken: Set<number>) => {
    let col = 0;
    while (taken.has(col)) col++;
    return col;
};

const getColumnX = (column: number) => column * COL_WIDTH + HALF_COL;
const getRowY = (row: number) => row * ROW_HEIGHT + HALF_ROW;

const showCommitDetails = (commitHash: string, focusView: boolean) => {
    vscode.postMessage({
        command: 'showCommitDetails',
        data: { commitHash, focusView }
    });
};

export const GitGraphContent: React.FC<GitGraphContentProps> = ({
    commits,
    isLoading,
    hasMore,
    columnWidth,
    onColumnWidthChange,
    onLoadMore,
    scrollToCommit,
}) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [selectedCommitHash, setSelectedCommitHash] = React.useState<string | null>(null);

    const selectCommit = React.useCallback((hash: string, focusView: boolean) => {
        setSelectedCommitHash(hash);
        showCommitDetails(hash, focusView);
    }, []);

    React.useEffect(() => {
        if (scrollToCommit && containerRef.current) {
            const { hash } = scrollToCommit;
            const index = commits.findIndex(c => c.hash === hash || c.shortHash === hash);
            if (index !== -1) {
                containerRef.current.scrollTop = index * ROW_HEIGHT;
                setSelectedCommitHash(commits[index].hash);
            }
        }
    }, [scrollToCommit, commits]);

    // Graph Calculation
    const { graphCommits, links, svgWidth } = React.useMemo(() => {
        const processedCommits: GraphCommit[] = [];
        const links: GraphLink[] = [];
        const activeBranches: { [hash: string]: number } = {};
        let maxColumn = 0;

        commits.forEach((commit, index) => {
            let column = activeBranches[commit.hash];

            if (column === undefined) {
                column = getFreeColumn(new Set(Object.values(activeBranches)));
            }

            delete activeBranches[commit.hash];

            // Add vertical lines for continuing branches
            Object.values(activeBranches).forEach(col => {
                links.push({
                    x1: getColumnX(col),
                    y1: getRowY(index),
                    x2: getColumnX(col),
                    y2: getRowY(index + 1),
                    color: COLORS[col % COLORS.length],
                    isMerge: false
                });
            });

            const color = COLORS[column % COLORS.length];
            processedCommits.push({ ...commit, column, color });
            maxColumn = Math.max(maxColumn, column);

            // Add parent connections
            commit.parents.forEach((parentHash, parentIndex) => {
                let parentCol = activeBranches[parentHash];

                if (parentCol === undefined) {
                    parentCol = parentIndex === 0 ? column : getFreeColumn(new Set(Object.values(activeBranches)));
                    activeBranches[parentHash] = parentCol;
                }

                links.push({
                    x1: getColumnX(column),
                    y1: getRowY(index),
                    x2: getColumnX(parentCol),
                    y2: getRowY(index + 1),
                    color: parentIndex === 0 ? color : COLORS[parentCol % COLORS.length],
                    isMerge: parentIndex > 0 || column !== parentCol
                });
            });
        });

        return {
            graphCommits: processedCommits,
            links,
            svgWidth: (maxColumn + 1) * COL_WIDTH + 20
        };
    }, [commits]);

    const handleScroll = React.useCallback((event: Event) => {
        const container = event.target as HTMLDivElement;
        if (!container || isLoading || !hasMore) return;

        const { scrollTop, scrollHeight, clientHeight } = container;
        if (scrollHeight - scrollTop <= clientHeight + 100) {
            onLoadMore(commits.length);
        }
    }, [isLoading, hasMore, onLoadMore, commits.length]);

    React.useEffect(() => {
        onColumnWidthChange({ branchColWidth: svgWidth });
    }, [svgWidth, onColumnWidthChange]);

    React.useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    // Keyboard navigation
    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (commits.length === 0 || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return;

            event.preventDefault();
            const currentIndex = selectedCommitHash ? commits.findIndex(c => c.hash === selectedCommitHash) : -1;

            let targetIndex: number;
            if (event.key === 'ArrowDown') {
                targetIndex = Math.min(currentIndex + 1, commits.length - 1);
            } else {
                targetIndex = Math.max(currentIndex - 1, 0);
            }

            if (targetIndex >= 0) {
                selectCommit(commits[targetIndex].hash, false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [commits, selectedCommitHash, selectCommit]);

    return (
        <>
            <style>{`
                .commit-row:hover {
                    background-color: rgba(128, 128, 128, 0.1);
                }
                .commit-row.selected {
                    background-color: #1677ff;
                    color: #fff;
                }
            `}</style>
            <div ref={containerRef} style={{ position: 'relative', flex: 1, overflowY: 'auto' }}>
                <svg width={svgWidth} height={commits.length * ROW_HEIGHT} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
                    {links.map((link, i) => (
                        <path
                            key={`link-${i}`}
                            d={`M ${link.x1} ${link.y1} C ${link.x1} ${link.y1 + HALF_ROW}, ${link.x2} ${link.y1 + HALF_ROW}, ${link.x2} ${link.y2}`}
                            stroke={link.color}
                            strokeWidth="2"
                            fill="none"
                        />
                    ))}
                    {graphCommits.map((commit, i) => (
                        <Tooltip
                            key={`node-${commit.hash}`}
                            title={commit.branches?.join(', ')}
                            placement="right"
                        >
                            <circle
                                cx={getColumnX(commit.column)}
                                cy={getRowY(i)}
                                r={CIRCLE_RADIUS}
                                fill={commit.color}
                                stroke="currentColor"
                                strokeWidth={selectedCommitHash === commit.hash ? 2 : 0}
                                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                            />
                        </Tooltip>
                    ))}
                </svg>

                <div style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {graphCommits.map(commit => (
                        <CommitRowDropdown key={commit.hash} commitHash={commit.hash}>
                            <div
                                className={`commit-row ${selectedCommitHash === commit.hash ? 'selected' : ''}`}
                                style={{
                                    height: ROW_HEIGHT,
                                    display: 'flex',
                                    alignItems: 'center',
                                    boxSizing: 'border-box',
                                    paddingRight: '10px'
                                }}
                                onClick={() => selectCommit(commit.hash, false)}
                                onDoubleClick={() => selectCommit(commit.hash, true)}
                            >
                                <div style={{ width: svgWidth, flexShrink: 0 }} />
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                    <span style={{
                                        width: columnWidth.commitColWidth,
                                        fontFamily: 'monospace',
                                        marginRight: '10px',
                                        opacity: 0.8,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        flexShrink: 0
                                    }}>
                                        {commit.shortHash}
                                    </span>
                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '10px' }}>
                                        {commit.branches?.map(branchName => (
                                            <Tag
                                                key={branchName}
                                                color="blue"
                                                style={{ marginRight: '4px', fontSize: '0.85em' }}
                                            >
                                                {branchName}
                                            </Tag>
                                        ))}
                                        {commit.message}
                                    </span>
                                    <span style={{ width: columnWidth.authorColWidth, marginRight: '10px', opacity: 0.7, fontSize: '0.9em' }}>
                                        {commit.author}
                                    </span>
                                    <span style={{ width: columnWidth.dateColWidth, opacity: 0.5, fontSize: '0.8em', textAlign: 'right' }}>
                                        {formatDate(commit.date)}
                                    </span>
                                </div>
                            </div>
                        </CommitRowDropdown>
                    ))}
                </div>
                {isLoading && (
                    <div style={{ padding: '20px', textAlign: 'center' }}>
                        <Spin size="large" />
                    </div>
                )}
            </div>
        </>
    );
};
