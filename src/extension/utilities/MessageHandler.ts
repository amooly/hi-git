import * as vscode from 'vscode';
import type { WebviewRequest, WebviewResponse } from '@shared/types/messages.js';

type RequestHandler<TPayload, TResponseData> = (payload: TPayload) => Promise<TResponseData> | TResponseData;

export class MessageHandler {
  private handlers: Map<string, RequestHandler<any, any>> = new Map();

  constructor(private readonly webview: vscode.Webview, private readonly disposables: vscode.Disposable[]) {
    this.webview.onDidReceiveMessage(this.handleMessage, this, this.disposables);
  }

  /**
   * Register a handler for a specific command.
   */
  public registerHandler<TCommand extends string, TPayload, TResponseData>(
    command: TCommand,
    handler: RequestHandler<TPayload, TResponseData>
  ) {
    this.handlers.set(command, handler);
  }

  private async handleMessage(message: WebviewRequest | any) {
    // We only process messages that look like our WebviewRequest format
    if (!message || !message.command || !message.requestId) {
      return;
    }

    const { command, payload, requestId } = message as WebviewRequest;
    const handler = this.handlers.get(command);

    if (!handler) {
      console.warn(`[MessageHandler] No handler registered for command: ${command}`);
      this.sendResponse({ requestId, error: `Unknown command: ${command}` });
      return;
    }

    try {
      const data = await handler(payload);
      this.sendResponse({ requestId, data });
    } catch (error: any) {
      console.error(`[MessageHandler] Error handling command ${command}:`, error);
      this.sendResponse({ requestId, error: error.message || 'Internal error' });
    }
  }

  private sendResponse(response: WebviewResponse) {
    this.webview.postMessage(response);
  }
}
