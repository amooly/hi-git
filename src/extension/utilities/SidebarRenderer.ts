import type { BranchSummaryEntry, TagSummaryEntry } from '@shared/types/index.js';

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
                <li class="tag-item">
                    <span class="tag-icon">🏷</span>
                    ${t.name}
                </li>`).join('');
  }
}
