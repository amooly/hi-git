import 'antd/dist/reset.css';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { GitCommit } from '../../model/git';
import { GitGraphContent } from './GitGraphContent';
import { GitGraphHeader } from './GitGraphHeader';

declare const vscode: any;

export const GitGraph: React.FC = () => {
    const [commits, setCommits] = useState<GitCommit[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    const [branches, setBranches] = useState<string[]>([]);
    const [authors, setAuthors] = useState<string[]>([]);
    const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
    const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
    const [selectedCommits, setSelectedCommits] = useState<string[]>([]);

    // Column widths
    const [commitColWidth, setCommitColWidth] = useState(120);
    const [authorColWidth, setAuthorColWidth] = useState(150);
    const [dateColWidth, setDateColWidth] = useState(160);
    const [svgWidth, setSvgWidth] = useState(0);

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
                case 'setAuthors':
                    setAuthors(message.data);
                    break;
            }
        };

        window.addEventListener('message', handleMessage);

        // Initial load
        loadMore(0);
        vscode.postMessage({ command: 'getBranches' });
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
            `}</style>

            <GitGraphHeader
                commits={commits}
                branches={branches}
                authors={authors}
                selectedBranches={selectedBranches}
                selectedAuthors={selectedAuthors}
                selectedCommits={selectedCommits}
                onBranchesChange={setSelectedBranches}
                onAuthorsChange={setSelectedAuthors}
                onCommitsChange={setSelectedCommits}
                svgWidth={svgWidth}
                commitColWidth={commitColWidth}
                authorColWidth={authorColWidth}
                dateColWidth={dateColWidth}
                onCommitWidthChange={setCommitColWidth}
                onAuthorWidthChange={setAuthorColWidth}
                onDateWidthChange={setDateColWidth}
            />

            <GitGraphContent
                commits={commits}
                isLoading={isLoading}
                hasMore={hasMore}
                commitColWidth={commitColWidth}
                authorColWidth={authorColWidth}
                dateColWidth={dateColWidth}
                onLoadMore={loadMore}
                onSvgWidthChange={setSvgWidth}
            />
        </div>
    );
};
