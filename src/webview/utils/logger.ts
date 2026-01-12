export enum WebviewMessageType {
    LOG = 'log',
}

export const logger = {
    log: (message: any) => {
        if (window.vscode) {
            window.vscode.postMessage({
                command: WebviewMessageType.LOG,
                data: message,
            });
        } else {
            console.log(message);
        }
    },
    error: (message: any) => {
        if (window.vscode) {
            window.vscode.postMessage({
                command: WebviewMessageType.LOG,
                data: `[ERROR] ${message}`,
            });
        } else {
            console.error(message);
        }
    }
};
