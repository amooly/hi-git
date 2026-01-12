import { SearchOutlined } from '@ant-design/icons';
import { Input, Table } from 'antd';
import 'antd/dist/reset.css';
import type { ColumnsType } from 'antd/es/table';
import * as React from 'react';
import { MetaData } from '../../const_def/messages';
import { GitCommit } from '../../model/git';
import { buildBranchTree } from '../utils/branchTreeUtils';
import { ColWidth, Filter } from './GitGraph';

interface GitGraphHeaderProps {
    commits: GitCommit[];
    metaData: MetaData;
    filter: Filter;
    onFilterChange: (updates: Partial<Filter>) => void;
    columnWidth: ColWidth;
    onScrollToCommit: (hash: string) => void;
}

export const GitGraphHeader: React.FC<GitGraphHeaderProps> = ({
    commits,
    metaData,
    filter,
    onFilterChange,
    columnWidth,
    onScrollToCommit,
}) => {
    const branchTreeFilters = React.useMemo(
        () => buildBranchTree(metaData.branches),
        [metaData.branches]
    );

    const styles = `
        .git-graph-table-header .ant-table {
            background: transparent;
        }
        .git-graph-table-header .ant-table-thead > tr > th {
            border-right: 1px solid rgba(128, 128, 128, 0.2);
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
            background-color: #1677ff;
        }
        .header-title-wrapper {
            display: flex;
            align-items: center;
            width: 100%;
        }
    `;

    const columns: ColumnsType<any> = [
        {
            title: 'Branch',
            dataIndex: 'branch',
            key: 'branch',
            width: columnWidth.branchColWidth,
            filterMode: 'tree',
            filterSearch: true,
            filters: branchTreeFilters,
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
                    />
                </div>
            ),
            filterIcon: (filtered: boolean) => (
                <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined, pointerEvents: 'auto' }} />
            ),
            onFilter: () => true, // We're using this for search/scroll, not actual filtering
        },
        {
            title: "Message",
            dataIndex: 'message',
            key: 'message',
            filterDropdown: ({ setSelectedKeys, selectedKeys, confirm }) => {
                const searchTerm = selectedKeys[0] as string || '';
                const searchResults = searchTerm
                    ? commits.filter(c => c.message.toLowerCase().includes(searchTerm.toLowerCase()))
                    : [];

                return (
                    <div style={{ padding: 8, minWidth: 300 }}>
                        <Input.Search
                            placeholder="Search message..."
                            value={searchTerm}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                            style={{ width: '100%', marginBottom: 8 }}
                        />
                        {searchResults.length > 0 && (
                            <div style={{ maxHeight: 300, overflow: 'auto', borderTop: '1px solid rgba(128, 128, 128, 0.2)', paddingTop: 8 }}>
                                {searchResults.map(c => (
                                    <div
                                        key={c.hash}
                                        onClick={() => {
                                            onScrollToCommit(c.hash);
                                            confirm();
                                        }}
                                        style={{
                                            padding: '8px',
                                            cursor: 'pointer',
                                            borderRadius: '4px',
                                            marginBottom: '4px',
                                            maxWidth: 400,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(128, 128, 128, 0.1)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <span style={{ fontWeight: 'bold', marginRight: 8 }}>{c.shortHash}</span>
                                        {c.message}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            },
            filterIcon: (filtered: boolean) => (
                <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined, pointerEvents: 'auto' }} />
            ),
            onFilter: () => true, // We're using this for search/scroll, not actual filtering
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
                            const selectedValues = filters.branch as string[];
                            const validBranches = new Set(metaData.branches);
                            updates.branches = selectedValues.filter(b => validBranches.has(b));
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
