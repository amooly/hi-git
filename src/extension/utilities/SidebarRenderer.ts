import type { BranchSummaryEntry, TagSummaryEntry } from '@shared/types/index.js';
import { PIN_SVG } from '../constants/icons.js';

export class SidebarRenderer {
  static branchItems(branches: BranchSummaryEntry[]): string {
    return branches.map(b => `
                <li class="branch-item${b.current ? ' current' : ''}"
                    data-branch="${b.name}"
                    data-current="${b.current ? 'true' : 'false'}">
                    <span class="branch-dot" style="background: ${b.color};"></span>
                    ${b.name}
                    ${b.meta ? `<span class="branch-meta">${b.meta}</span>` : ''}
                </li>`).join('');
  }

  static tagItems(tags: TagSummaryEntry[]): string {
    return tags.map(t => `
                <li class="tag-item" data-tag="${t.name}">
                    <span class="tag-icon">🏷</span>
                    <span class="tag-name">${t.name}</span>
                    <button class="pin-btn" title="Reveal in graph" data-tag="${t.name}">${PIN_SVG}</button>
                </li>`).join('');
  }
}
