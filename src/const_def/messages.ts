/**
 * Message definitions for webview communication
 */

// Webview to Extension messages
export enum WebviewMessageType {
    GET_LOG = 'getLog',
    QUERY_META_DATA = 'queryMetaData',
    SHOW_COMMIT_DETAILS = 'showCommitDetails',
    COMPARE_WITH = 'compareWith',
    REVERT_COMMIT = 'revertCommit',
    CHECKOUT_COMMIT = 'checkoutCommit',
    REFRESH = 'refresh',
    ERROR = 'error',
    LOG = 'log',
}

// Extension to Webview messages
export enum ExtensionMessageType {
    SET_LOG = 'setLog',
    SET_META_DATA = 'setMetaData',
    REFRESH = 'refresh',
}

// Message interfaces
export interface GetLogMessage {
    command: WebviewMessageType.GET_LOG;
    data: {
        skip?: number;
        filters?: {
            branches?: string[];
            authors?: string[];
            commits?: string[];
        };
    };
}

export interface QueryMetaDataMessage {
    command: WebviewMessageType.QUERY_META_DATA;
}

export interface ShowCommitDetailsMessage {
    command: WebviewMessageType.SHOW_COMMIT_DETAILS;
    data: {
        commitHash: string;
        focusView?: boolean;
    };
}

export interface CompareWithMessage {
    command: WebviewMessageType.COMPARE_WITH;
    data: string; // commit hash
}

export interface SetLogMessage {
    command: ExtensionMessageType.SET_LOG;
    data: any[];
    skip?: number;
}

export interface MetaData {
    branches: string[];
    authors: string[];
}

export interface SetMetaDataMessage {
    command: ExtensionMessageType.SET_META_DATA;
    data: MetaData;
}
