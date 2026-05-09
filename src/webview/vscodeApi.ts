import type { WebviewRequest, WebviewResponse } from '../shared/types/messages.js';

declare function acquireVsCodeApi(): any;

class VSCodeAPIWrapper {
  private api: any;
  private pendingRequests: Map<string, { resolve: (data: any) => void; reject: (error: any) => void }>;

  constructor() {
    this.api = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;
    this.pendingRequests = new Map();

    window.addEventListener('message', (event) => {
      const message = event.data as WebviewResponse;
      if (message && message.requestId) {
        const pending = this.pendingRequests.get(message.requestId);
        if (pending) {
          if (message.error) {
            pending.reject(new Error(message.error));
          } else {
            pending.resolve(message.data);
          }
          this.pendingRequests.delete(message.requestId);
        }
      }
    });
  }

  public request<TCommand extends string, TPayload, TResponseData>(
    command: TCommand,
    payload?: TPayload
  ): Promise<TResponseData> {
    return new Promise((resolve, reject) => {
      const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      this.pendingRequests.set(requestId, { resolve, reject });

      const req: WebviewRequest<TCommand, TPayload> = {
        command,
        payload,
        requestId,
      };

      if (this.api) {
        this.api.postMessage(req);
      } else {
        console.warn(`[VSCodeAPI] Sent mock request '${command}' (VS Code API not available)`);
        // We don't reject here so the UI doesn't crash in dev harness, 
        // but it will just hang forever without a mock response.
      }
    });
  }

  public postEvent<TType extends string, TPayload>(type: TType, payload?: TPayload): void {
    if (this.api) {
      this.api.postMessage({ type, payload });
    } else {
      console.warn(`[VSCodeAPI] Mock postEvent '${type}'`, payload);
    }
  }

  public getState() {
    return this.api ? this.api.getState() : undefined;
  }

  public setState(state: any) {
    if (this.api) {
      this.api.setState(state);
    }
  }
}

(window as any).vscodeAPI = new VSCodeAPIWrapper();
