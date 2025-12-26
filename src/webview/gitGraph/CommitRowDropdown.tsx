import { Dropdown } from 'antd';
import * as React from 'react';

declare const vscode: any;

interface CommitRowDropdownProps {
    commitHash: string;
    children: React.ReactNode;
}

export const CommitRowDropdown: React.FC<CommitRowDropdownProps> = ({ commitHash, children }) => {
    return (
        <Dropdown
            menu={{
                items: [
                    {
                        key: 'copy-hash',
                        label: 'Copy CommitID',
                        onClick: () => {
                            navigator.clipboard.writeText(commitHash);
                        }
                    },
                    {
                        key: 'view-details',
                        label: 'View Commit Detail',
                        onClick: () => {
                            vscode.postMessage({
                                command: 'showCommitDetails',
                                data: commitHash
                            });
                        }
                    },
                    {
                        key: 'compare-local',
                        label: 'Compare Local with This Commit',
                        onClick: () => {
                            vscode.postMessage({
                                command: 'compareWith',
                                data: commitHash
                            });
                        }
                    }
                ]
            }}
            trigger={['contextMenu']}
        >
            {children}
        </Dropdown>
    );
};
