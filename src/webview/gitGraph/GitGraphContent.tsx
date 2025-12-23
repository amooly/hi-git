import { Dropdown, Spin, Tooltip } from 'antd';
import * as React from 'react';
import { GitCommit } from '../../model/git';
import { formatDate } from '../common';

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
    commitColWidth: number;
    authorColWidth: number;
    dateColWidth: number;
    onLoadMore: (skip: number) => void;
    onSvgWidthChange: (width: number) => void;
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
    commitColWidth,
    authorColWidth,
    dateColWidth,
    onLoadMore,
    onSvgWidthChange,
}) => {
    const containerRef = React.useRef<HTMLDivElement>(null);

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

    React.useEffect(() => {
        onSvgWidthChange(svgWidth);
    }, [svgWidth, onSvgWidthChange]);

    React.useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

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
                                        <span className="commit-hash" style={{ width: commitColWidth }}>
                                            {commit.shortHash}
                                        </span>
                                        <span className="commit-message" style={{ flex: 1 }}>
                                            {commit.branches && commit.branches.length > 0 && (
                                                <React.Fragment>
                                                    {commit.branches.map(branchName => (
                                                        <span key={branchName} style={{
                                                            backgroundColor: 'var(--vscode-badge-background)',
                                                            color: 'var(--vscode-badge-foreground)',
                                                            padding: '2px 6px',
                                                            borderRadius: '3px',
                                                            marginRight: '4px',
                                                            fontSize: '0.85em',
                                                            display: 'inline-block'
                                                        }}>
                                                            {branchName}
                                                        </span>
                                                    ))}
                                                </React.Fragment>
                                            )}
                                            {commit.message}
                                        </span>
                                        <span className="commit-author" style={{ width: authorColWidth, marginRight: '10px' }}>{commit.author}</span>
                                        <span className="commit-date" style={{ width: dateColWidth }}>{formatDate(commit.date)}</span>
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
            </div>        </>);
};
