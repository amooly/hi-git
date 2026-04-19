import { ConfigProvider, theme as antdTheme } from 'antd';
import 'antd/dist/reset.css';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { MetaData } from '../../const_def/messages';
import { GitCommit } from '../../model/git';
import { Header, Theme } from '../components/Header';
import { GitGraphContent } from './GitGraphContent';
import { GitGraphHeader } from './GitGraphHeader';

declare const vscode: any;

export interface ColWidth {
    branchColWidth: number;
    commitColWidth: number;
    authorColWidth: number;
    dateColWidth: number;
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
        branchColWidth: 100,
        commitColWidth: 100,
        authorColWidth: 120,
        dateColWidth: 120,
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
        setCommits([]);
        setHasMore(true);
        loadMore(0);
        vscode.postMessage({ command: 'queryMetaData' });
    };

    const handleThemeToggle = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const themeAlgorithm = theme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm;

    return (
        <ConfigProvider
            theme={{
                algorithm: themeAlgorithm,
            }}
        >
            <div className="git-graph-container">
                <style>{`
                    .git-graph-container {
                        height: 100vh;
                        display: flex;
                        flex-direction: column;
                        position: relative;
                    }
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

                    filter={filter}
                    onFilterChange={updateFilter}

                    columnWidth={columnWidth}
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
        </ConfigProvider>
    );
};
