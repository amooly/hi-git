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
    '#00a8ff', '#9c88ff', '#fbc531', '#4cd137', '#487eb0', '#e84118', '#7f8fa6', '#273c75'
];

const ROW_HEIGHT = 30;
const COL_WIDTH = 20;
const CIRCLE_RADIUS = 5;

declare const vscode: any;

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

        const getFreeColumn = (taken: Set<number>) => {
            let col = 0;
            while (taken.has(col)) col++;
            return col;
        };

        commits.forEach((commit, index) => {
            let column = activeBranches[commit.hash];

            if (column === undefined) {
                const takenColumns = new Set(Object.values(activeBranches));
                column = getFreeColumn(takenColumns);
            }

            delete activeBranches[commit.hash];

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

            const color = COLORS[column % COLORS.length];

            processedCommits.push({
                ...commit,
                column,
                color
            });

            maxColumn = Math.max(maxColumn, column);

            commit.parents.forEach((parentHash, parentIndex) => {
                let parentCol = activeBranches[parentHash];

                if (parentCol === undefined) {
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

    const styles = `
        .graph-content {
            position: relative;
            flex: 1;
            overflow-y: auto;
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
        .commit-row.selected {
            background-color: var(--vscode-list-activeSelectionBackground);
            color: var(--vscode-list-activeSelectionForeground);
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
        .commit-row .commit-col {
            padding: 0 5px;
        }
        .commit-row .commit-col:last-child {
            border-right: none;
        }
    `;

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
            if (commits.length === 0) return;

            const currentIndex = selectedCommitHash
                ? commits.findIndex(c => c.hash === selectedCommitHash)
                : -1;

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                const nextIndex = currentIndex < commits.length - 1 ? currentIndex + 1 : currentIndex;
                if (nextIndex >= 0) {
                    const nextCommit = commits[nextIndex];
                    setSelectedCommitHash(nextCommit.hash);
                    vscode.postMessage({
                        command: 'showCommitDetails',
                        data: { commitHash: nextCommit.hash, focusView: false }
                    });
                }
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : 0;
                const prevCommit = commits[prevIndex];
                setSelectedCommitHash(prevCommit.hash);
                vscode.postMessage({
                    command: 'showCommitDetails',
                    data: { commitHash: prevCommit.hash, focusView: false }
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [commits, selectedCommitHash]);

    return (
        <>
            <style>{styles}</style>
            <div className="graph-content" ref={containerRef} style={{ overflowY: 'auto' }}>
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
                        const tooltipTitle = commit.branches && commit.branches.length > 0
                            ? commit.branches.join(', ')
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
                        <CommitRowDropdown commitHash={commit.hash}>
                            <div
                                className={`commit-row ${selectedCommitHash === commit.hash ? 'selected' : ''}`}
                                style={{ height: ROW_HEIGHT }}
                                onClick={() => {
                                    setSelectedCommitHash(commit.hash);
                                    vscode.postMessage({
                                        command: 'showCommitDetails',
                                        data: { commitHash: commit.hash, focusView: false }
                                    });
                                }}
                                onDoubleClick={() => {
                                    setSelectedCommitHash(commit.hash);
                                    vscode.postMessage({
                                        command: 'showCommitDetails',
                                        data: { commitHash: commit.hash, focusView: true }
                                    });
                                }}
                            >
                                <div className="commit-graph-spacer" style={{ width: svgWidth }}></div>
                                <div className="commit-info">
                                    <span className="commit-hash" style={{ width: columnWidth.commitColWidth }}>
                                        {commit.shortHash}
                                    </span>
                                    <span className="commit-message" style={{ flex: 1 }}>
                                        {commit.branches && commit.branches.length > 0 && (
                                            <React.Fragment>
                                                {commit.branches.map(branchName => (
                                                    <Tag
                                                        key={branchName}
                                                        color="default"
                                                        style={{
                                                            backgroundColor: 'var(--vscode-badge-background)',
                                                            color: 'var(--vscode-badge-foreground)',
                                                            borderColor: 'var(--vscode-badge-background)',
                                                            marginRight: '4px',
                                                            fontSize: '0.85em',
                                                        }}
                                                    >
                                                        {branchName}
                                                    </Tag>
                                                ))}
                                            </React.Fragment>
                                        )}
                                        {commit.message}
                                    </span>
                                    <span className="commit-author" style={{ width: columnWidth.authorColWidth, marginRight: '10px' }}>{commit.author}</span>
                                    <span className="commit-date" style={{ width: columnWidth.dateColWidth }}>{formatDate(commit.date)}</span>
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
        </>);
};
