import { SearchOutlined } from '@ant-design/icons';
import { Button, Dropdown, Input, Space, Table } from 'antd';
import 'antd/dist/reset.css';
import type { ColumnsType } from 'antd/es/table';
import * as React from 'react';
import { MetaData } from '../../const_def/messages';
import { GitCommit } from '../../model/git';
import { ColWidth, Filter } from './GitGraph';

interface GitGraphHeaderProps {
    commits: GitCommit[];
    metaData: MetaData;
    filter: Filter;
    onFilterChange: (updates: Partial<Filter>) => void;
    columnWidth: ColWidth;
    onColumnWidthChange: (updates: Partial<ColWidth>) => void;
    onScrollToCommit: (hash: string) => void;
    onRefresh: () => void;
}

export const GitGraphHeader: React.FC<GitGraphHeaderProps> = ({
    commits,
    metaData,
    filter,
    onFilterChange,
    columnWidth,
    onColumnWidthChange,
    onScrollToCommit,
    onRefresh,
}) => {
    const [resizing, setResizing] = React.useState<string | null>(null);
    const [messageSearchTerm, setMessageSearchTerm] = React.useState('');
    const [messageDropdownOpen, setMessageDropdownOpen] = React.useState(false);

    const styles = `
        .git-graph-table-header .ant-table {
            background: transparent;
        }
        .git-graph-table-header .ant-table-thead > tr > th {
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            border-bottom: 1px solid var(--vscode-widget-border);
            border-right: 1px solid rgba(255, 255, 255, 0.2);
            font-weight: bold;
            padding: 8px 5px;
            position: relative;
            height: 40px;
        }
        .git-graph-table-header .ant-table-thead > tr > th:last-child {
            border-right: none;
        }
        .git-graph-table-header .ant-table-thead > tr > th::before {
            display: none;
        }
        .git-graph-table-header .ant-table-container {
            border: none;
        }
        .git-graph-table-header .ant-table-content {
            overflow: hidden;
        }
        .resize-handle {
            position: absolute;
            right: 0;
            top: 0;
            bottom: 0;
            width: 4px;
            cursor: col-resize;
            user-select: none;
            z-index: 10;
        }
        .resize-handle:hover {
            background-color: var(--vscode-textLink-foreground);
        }
        .header-title-wrapper {
            display: flex;
            align-items: center;
            width: 100%;
        }
    `;

    const messageSearchResults = React.useMemo(() => {
        if (!messageSearchTerm) return [];
        const term = messageSearchTerm.toLowerCase();
        return commits.filter(c => c.message.toLowerCase().includes(term));
    }, [commits, messageSearchTerm]);

    const handleMouseDown = (column: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setResizing(column);
    };

    React.useEffect(() => {
        if (!resizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const delta = e.movementX;
            if (resizing === 'commit') {
                onColumnWidthChange({ commitColWidth: Math.max(80, columnWidth.commitColWidth + delta) });
            } else if (resizing === 'author') {
                onColumnWidthChange({ authorColWidth: Math.max(100, columnWidth.authorColWidth + delta) });
            } else if (resizing === 'date') {
                onColumnWidthChange({ dateColWidth: Math.max(120, columnWidth.dateColWidth + delta) });
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
    }, [resizing, columnWidth, onColumnWidthChange]);

    const columns: ColumnsType<any> = [
        {
            title: 'Branch',
            dataIndex: 'branch',
            key: 'branch',
            width: columnWidth.branchColWidth,
            filters: metaData.branches.map(branch => ({ text: branch, value: branch })),
            filteredValue: filter.branches,
            onFilter: (value, record) => record.branch === value,
            filterMultiple: true,
        },
        {
            title: "Commit",
            dataIndex: 'commit',
            key: 'commit',
            width: columnWidth.commitColWidth,
            filterDropdown: ({ setSelectedKeys, selectedKeys, confirm }) => (
                <div style={{ padding: 8 }}>
                    <Input.Search
                        placeholder="Search commit hash..."
                        value={selectedKeys[0]}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                        onSearch={(value: string) => {
                            if (value) {
                                onScrollToCommit(value);
                                confirm();
                            }
                        }}
                        onPressEnter={() => {
                            if (selectedKeys[0]) {
                                onScrollToCommit(selectedKeys[0] as string);
                                confirm();
                            }
                        }}
                        style={{ width: 188, marginBottom: 8, display: 'block' }}
                        size="small"
                    />
                </div>
            ),
            filterIcon: (filtered) => (
                <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
            ),
            onFilter: () => true, // We're using this for search/scroll, not actual filtering
        },
        {
            title: (
                <div className="header-title-wrapper">
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
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessageSearchTerm(e.target.value)}
                                                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                                onPressEnter={() => {
                                                    // Trigger search logic if needed, currently auto-filters
                                                }}
                                            />
                                            <Button
                                                type="primary"
                                                icon={<SearchOutlined />}
                                                onClick={(e: React.MouseEvent) => {
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
            ),
            dataIndex: 'message',
            key: 'message',
        },
        {
            title: 'Author',
            dataIndex: 'author',
            key: 'author',
            width: columnWidth.authorColWidth,
            filters: metaData.authors.map(author => ({ text: author, value: author })),
            filteredValue: filter.authors,
            onFilter: (value, record) => record.author === value,
            filterMultiple: true,
        },
        {
            title: "Date",
            dataIndex: 'date',
            key: 'date',
            width: columnWidth.dateColWidth,
            align: 'right' as const,
        },
    ];

    return (
        <>
            <style>{styles}</style>
            <div className="git-graph-table-header">
                <Table
                    columns={columns}
                    dataSource={[]}
                    pagination={false}
                    showHeader={true}
                    size="small"
                    locale={{ emptyText: null }}
                    onChange={(pagination, filters, sorter) => {
                        const updates: Partial<Filter> = {};
                        if (filters.branch !== undefined) {
                            updates.branches = filters.branch as string[];
                        }
                        if (filters.author !== undefined) {
                            updates.authors = filters.author as string[];
                        }
                        if (Object.keys(updates).length > 0) {
                            onFilterChange(updates);
                        }
                    }}
                />
            </div>
        </>
    );
};
