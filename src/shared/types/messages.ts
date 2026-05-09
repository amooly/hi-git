export interface WebviewRequest<TCommand extends string = string, TPayload = any> {
  command: TCommand;
  payload?: TPayload;
  requestId: string;
}

export interface WebviewResponse<TData = any> {
  requestId: string;
  data?: TData;
  error?: string;
}

export interface WebviewEvent<TType extends string = string, TPayload = any> {
  type: TType;
  payload?: TPayload;
}
