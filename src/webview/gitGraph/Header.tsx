import { BulbOutlined, GithubOutlined, ReloadOutlined } from '@ant-design/icons';
import * as React from 'react';

export type Theme = 'light' | 'dark';

interface HeaderProps {
    onRefresh: () => void;
    theme: Theme;
    onThemeToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh, theme, onThemeToggle }) => {
    const handleGithubClick = () => {
        window.open('https://github.com/harvey/hi-git.git', '_blank');
    };

    return (
        <>
            <style>{`
                .sticky-header {
                    position: sticky;
                    top: 0;
                    z-index: 10;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    background: var(--header-bg);
                    border-bottom: 1px solid var(--header-border);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }
                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .header-logo {
                    height: 32px;
                    width: auto;
                }
                .header-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: var(--header-text);
                    margin: 0;
                }
                .header-right {
                    display: flex;
                    gap: 8px;
                }
                .header-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    border: 1px solid var(--header-btn-border);
                    background: var(--header-btn-bg);
                    color: var(--header-btn-text);
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .header-btn:hover {
                    background: var(--header-btn-hover-bg);
                    border-color: var(--header-btn-hover-border);
                }
                .header-btn .anticon {
                    font-size: 16px;
                }
            `}</style>
            <div className="sticky-header">
                <div className="header-left">
                    <img
                        src="assets/hi_git.png"
                        alt="Hi Git Logo"
                        className="header-logo"
                    />
                </div>
                <div className="header-right">
                    <button
                        className="header-btn"
                        onClick={onRefresh}
                        title="Refresh"
                    >
                        <ReloadOutlined />
                    </button>
                    <button
                        className="header-btn"
                        onClick={handleGithubClick}
                        title="GitHub Repository"
                    >
                        <GithubOutlined />
                    </button>
                    <button
                        className="header-btn"
                        onClick={onThemeToggle}
                        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
                    >
                        <BulbOutlined />
                    </button>
                </div>
            </div>
        </>
    );
};
