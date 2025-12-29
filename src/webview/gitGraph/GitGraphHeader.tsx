import * as React from 'react';
import { DownOutlined, ReloadOutlined, BranchesOutlined, SearchOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Checkbox, Dropdown, Input, Space, Tag, Button } from 'antd';
import 'antd/dist/reset.css';
import * as React from 'react';
import { MetaData } from '../../const_def/messages';
import { GitCommit } from '../../model/git';
import { FilterDropdown } from './FilterDropdown';

interface GitGraphHeaderProps {
    commits: GitCommit[];
    metaData: MetaData;
    selectedBranches: string[];
    selectedAuthors: string[];
    selectedCommits: string[];
    onBranchesChange: (branches: string[]) => void;
    onAuthorsChange: (authors: string[]) => void;
    onCommitsChange: (commits: string[]) => void;
    svgWidth: number;
    commitColWidth: number;
    authorColWidth: number;
    dateColWidth: number;
    onCommitWidthChange: (width: number) => void;
    onAuthorWidthChange: (width: number) => void;
    onDateWidthChange: (width: number) => void;
    onScrollToCommit: (hash: string) => void;
    onRefresh: () => void;
}

export const GitGraphHeader: React.FC<GitGraphHeaderProps> = ({
    commits,
    metaData,
    selectedBranches,
    selectedAuthors,
    selectedCommits,
    onBranchesChange,
    onAuthorsChange,
    onCommitsChange,
    svgWidth,
    commitColWidth,
    authorColWidth,
    dateColWidth,
    onCommitWidthChange,
    onAuthorWidthChange,
    onDateWidthChange,
    onScrollToCommit,
    onRefresh,
}) => {
    const [resizing, setResizing] = React.useState<string | null>(null);
    const [messageSearchTerm, setMessageSearchTerm] = React.useState('');
    const [messageDropdownOpen, setMessageDropdownOpen] = React.useState(false);

    const styles = `
        .git-graph-header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 16px;
            background-color: var(--vscode-editor-background);
            border-bottom: 1px solid var(--vscode-widget-border);
        }
        .git-graph-title {
            font-size: 16px;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .header-row {
            display: flex;
            height: 40px;
            align-items: center;
            background-color: var(--vscode-editor-background);
            border-bottom: 1px solid var(--vscode-widget-border);
            flex-shrink: 0;
            font-weight: bold;
            padding: 0 10px;
        }
        .header-col {
            display: flex;
            align-items: center;
            padding: 0 5px;
            border-right: 1px solid rgba(255, 255, 255, 0.2);
            position: relative;
        }
        .header-col:last-child {
            border-right: none;
        }
        .resize-handle {
            position: absolute;
            right: 0;
            top: 0;
            bottom: 0;
            width: 4px;
            cursor: col-resize;
            user-select: none;
            z-index: 1;
        }
        .resize-handle:hover {
            background-color: var(--vscode-textLink-foreground);
        }
    `;

    const commitOptions = React.useMemo(() => {
        return commits.map(c => ({
            value: c.hash,
            label: c.shortHash,
            searchKeys: [c.hash, c.shortHash]
        }));
    }, [commits]);

    const messageSearchResults = React.useMemo(() => {
        if (!messageSearchTerm) return [];
        const term = messageSearchTerm.toLowerCase();
        return commits.filter(c => c.message.toLowerCase().includes(term));
    }, [commits, messageSearchTerm]);

    const handleMouseDown = (column: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        setResizing(column);
    };

    React.useEffect(() => {
        if (!resizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const delta = e.movementX;
            if (resizing === 'commit') {
                onCommitWidthChange(Math.max(80, commitColWidth + delta));
            } else if (resizing === 'author') {
                onAuthorWidthChange(Math.max(100, authorColWidth + delta));
            } else if (resizing === 'date') {
                onDateWidthChange(Math.max(120, dateColWidth + delta));
            }
        };

        const handleMouseUp = () => {
            setResizing(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizing, commitColWidth, authorColWidth, dateColWidth, onCommitWidthChange, onAuthorWidthChange, onDateWidthChange]);

    return (
        <>
            <style>{styles}</style>
            <div className="git-graph-header-top">
                <div className="git-graph-title">
                    <BranchesOutlined />
                    Git Graph
                </div>
                <Button 
                    type="text" 
                    icon={<ReloadOutlined />} 
                    onClick={onRefresh}
                    title="Refresh"
                />
            </div>
            <div className="header-row">
                <div className="header-col" style={{ width: svgWidth }}>
                    <FilterDropdown
                        label="Branch"
                        options={metaData.branches}
                        selected={selectedBranches}
                        onChange={onBranchesChange}
                    />
                </div>
                <div className="header-col" style={{ width: commitColWidth }}>
                    <Input.Search
                        placeholder="Commit"
                        onSearch={(value) => {
                            if (value) onScrollToCommit(value);
                        }}
                        style={{ width: '100%' }}
                        size="small"
                    />
                    <div className="resize-handle" onMouseDown={handleMouseDown('commit')} />
                </div>
                <div className="header-col" style={{ flex: 1 }}>
                    <Dropdown
                        trigger={['click']}
                        open={messageDropdownOpen}
                        onOpenChange={setMessageDropdownOpen}
                        menu={{
                            items: [
                                {
                                    key: 'search',
                                    label: (
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <Input
                                                placeholder="Keywords..."
                                                value={messageSearchTerm}
                                                onChange={e => setMessageSearchTerm(e.target.value)}
                                                onClick={e => e.stopPropagation()}
                                                onPressEnter={() => {
                                                    // Trigger search logic if needed, currently auto-filters
                                                }}
                                            />
                                            <Button 
                                                type="primary" 
                                                icon={<SearchOutlined />}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Search is reactive to state, just ensure dropdown stays open
                                                }}
                                            />
                                        </div>
                                    )
                                },
                                { type: 'divider' },
                                ...messageSearchResults.map(c => ({
                                    key: c.hash,
                                    label: (
                                        <div style={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            <span style={{ fontWeight: 'bold', marginRight: 8 }}>{c.shortHash}</span>
                                            {c.message}
                                        </div>
                                    ),
                                    onClick: () => {
                                        onScrollToCommit(c.hash);
                                        setMessageDropdownOpen(false);
                                    }
                                }))
                            ]
                        }}
                    >
                        <Space style={{ cursor: 'pointer', width: '100%' }}>
                            Message <SearchOutlined />
                        </Space>
                    </Dropdown>
                </div>
                <div className="header-col" style={{ width: authorColWidth }}>
                    <FilterDropdown
                        label="Author"
                        options={metaData.authors}
                        selected={selectedAuthors}
                        onChange={onAuthorsChange}
                    />
                    <div className="resize-handle" onMouseDown={handleMouseDown('author')} />
                </div>
                <div className="header-col" style={{ width: dateColWidth, textAlign: 'right', justifyContent: 'flex-end' }}>
                    <span>Date</span>
                    <div className="resize-handle" onMouseDown={handleMouseDown('date')} />
                </div>
            </div>
        </>
    );
};
