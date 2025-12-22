import { DownOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Checkbox, Dropdown, Input, Space, Tag } from 'antd';
import 'antd/dist/reset.css';
import * as React from 'react';
import { useState } from 'react';

type FilterOption = string | { value: string; label: string; searchKeys?: string[] };

const FilterDropdown: React.FC<{
    options: FilterOption[];
    selected: string[];
    onChange: (selected: string[]) => void;
    label: string;
}> = ({ options, selected, onChange, label }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [open, setOpen] = useState(false);

    const normalizedOptions = options.map(opt =>
        typeof opt === 'string'
            ? { value: opt, label: opt, searchKeys: [opt] }
            : { value: opt.value, label: opt.label, searchKeys: opt.searchKeys || [opt.label] }
    );

    const filteredOptions = normalizedOptions.filter(opt =>
        opt.searchKeys.some(key => key.toLowerCase().includes(searchTerm.toLowerCase()))
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
                            <div key={option.value} style={{ padding: '4px 0' }}>
                                <Checkbox value={option.value}>{option.label}</Checkbox>
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

export { FilterDropdown };
