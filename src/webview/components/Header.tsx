import { BulbOutlined, GithubOutlined, ReloadOutlined } from '@ant-design/icons';
import { ProLayout } from '@ant-design/pro-components';
import { Button, Space } from 'antd';
import * as React from 'react';

export type Theme = 'light' | 'dark';

interface HeaderProps {
    theme: Theme;
    onRefresh: () => void;
    onThemeToggle: () => void;
    children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh, theme, onThemeToggle, children }) => {
    const handleGithubClick = () => {
        window.open('https://github.com/harvey/hi-git.git', '_blank');
    };

    return (
        <ProLayout
            title="Hi Git"
            // logo="../assets/hi_git.png"
            fixedHeader
            layout="top"
            navTheme={theme === 'dark' ? 'realDark' : 'light'}
            contentWidth="Fluid"
            actionsRender={() => (
                <Space size="small">
                    <Button
                        type="text"
                        icon={<ReloadOutlined />}
                        onClick={onRefresh}
                        title="Refresh"
                    />
                    <Button
                        type="text"
                        icon={<GithubOutlined />}
                        onClick={handleGithubClick}
                        title="GitHub Repository"
                    />
                    <Button
                        type="text"
                        icon={<BulbOutlined />}
                        onClick={onThemeToggle}
                        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
                    />
                </Space>
            )}
            contentStyle={{ padding: 0, margin: 0 }}
        >
            {children}
        </ProLayout>
    );
};
