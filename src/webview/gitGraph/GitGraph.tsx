import 'antd/dist/reset.css';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { MetaData } from '../../const_def/messages';
import { GitCommit } from '../../model/git';
import { GitGraphContent } from './GitGraphContent';
import { GitGraphHeader } from './GitGraphHeader';
import { Header, Theme } from './Header';

declare const vscode: any;

export interface ColWidth {
    commitColWidth: number;
    authorColWidth: number;
    dateColWidth: number;
    branchColWidth: number;
}

export interface Filter {
    branches: string[];
    authors: string[];
    commits: string[];
}

export const GitGraph: React.FC = () => {
    const [commits, setCommits] = useState<GitCommit[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [theme, setTheme] = useState<Theme>('dark');

    const [metaData, setMetaData] = useState<MetaData>({ branches: [], authors: [] });
    const [filter, setFilter] = useState<Filter>({
        branches: [],
        authors: [],
        commits: []
    });

    const updateFilter = (updates: Partial<Filter>) => {
        setFilter(prev => ({
            ...prev,
            ...(updates.branches !== undefined && { branches: updates.branches }),
            ...(updates.authors !== undefined && { authors: updates.authors }),
            ...(updates.commits !== undefined && { commits: updates.commits })
        }));
    };

    // Column widths
    const [columnWidth, setColumnWidth] = useState<ColWidth>({
        commitColWidth: 120,
        authorColWidth: 150,
        dateColWidth: 160,
        branchColWidth: 0
    });

    const updateColumnWidth = (updates: Partial<ColWidth>) => {
        setColumnWidth(prev => ({
            ...prev,
            ...(updates.commitColWidth !== undefined && { commitColWidth: updates.commitColWidth }),
            ...(updates.authorColWidth !== undefined && { authorColWidth: updates.authorColWidth }),
            ...(updates.dateColWidth !== undefined && { dateColWidth: updates.dateColWidth }),
            ...(updates.branchColWidth !== undefined && { branchColWidth: updates.branchColWidth })
        }));
    };
    const [scrollToCommit, setScrollToCommit] = useState<{ hash: string; ts: number } | null>(null);

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
                case 'setMetaData':
                    setMetaData(message.data);
                    break;
                case 'refresh':
                    loadMore(0);
                    vscode.postMessage({ command: 'queryMetaData' });
                    break;
            }
        };

        window.addEventListener('message', handleMessage);

        // Initial load
        loadMore(0);
        vscode.postMessage({ command: 'queryMetaData' });

        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const loadMore = (skip: number) => {
        setIsLoading(true);
        vscode.postMessage({
            command: 'getLog',
            data: {
                skip,
                filters: filter
            }
        });
    };

    useEffect(() => {
        setCommits([]);
        setHasMore(true);
        loadMore(0);
    }, [filter]);

    const handleRefresh = () => {
        loadMore(0);
        vscode.postMessage({ command: 'queryMetaData' });
    };

    const handleThemeToggle = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <div className="git-graph-container">
            <style>{`
                .git-graph-container {
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-editor-foreground);
                    background-color: var(--vscode-editor-background);
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
                /* Table header specific styles */
                .ant-table-wrapper {
                    background: transparent !important;
                }
                .ant-table {
                    background: transparent !important;
                }
                .ant-table-container {
                    border: none !important;
                }
                .ant-table-thead > tr > th {
                    background: var(--vscode-editor-background) !important;
                    color: var(--vscode-editor-foreground) !important;
                    border-bottom: 1px solid var(--vscode-widget-border) !important;
                }
                /* Remove sorting icons and resize indicators from Ant Design */
                .ant-table-column-sorter {
                    display: none !important;
                }
                .ant-table-filter-column {
                    justify-content: flex-start !important;
                }
            `}</style>

            <Header
                onRefresh={handleRefresh}
                theme={theme}
                onThemeToggle={handleThemeToggle}
            />

            <GitGraphHeader
                commits={commits}
                metaData={metaData}
                onScrollToCommit={(hash) => setScrollToCommit({ hash, ts: Date.now() })}
                onRefresh={handleRefresh}

                filter={filter}
                onFilterChange={updateFilter}

                columnWidth={columnWidth}
                onColumnWidthChange={updateColumnWidth}
            />

            <GitGraphContent
                commits={commits}
                isLoading={isLoading}
                hasMore={hasMore}
                onLoadMore={loadMore}
                scrollToCommit={scrollToCommit}

                columnWidth={columnWidth}
                onColumnWidthChange={updateColumnWidth}
            />
        </div>
    );
};
