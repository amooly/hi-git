import * as vscode from 'vscode';
import { gitDataService } from '../services/GitDataService.js';

export class GitBlobProvider implements vscode.TextDocumentContentProvider {
  static readonly scheme = 'hi-git-blob';

  provideTextDocumentContent(uri: vscode.Uri): string {
    const params = new URLSearchParams(uri.query);
    const sha = params.get('sha');
    if (!sha || sha === 'EMPTY') return '';
    const filePath = uri.path.replace(/^\//, '');
    return gitDataService.getFileAtRevision(sha, filePath);
  }
}
