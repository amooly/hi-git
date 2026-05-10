/* ContextMenu — viewport-clamped right-click menu for commit rows. */

import { CONTEXT_MENU_ITEMS } from '../constants/contextMenuItems.js';

export function ContextMenu({ menu, onCopySha }) {
  // Clamp to viewport so the menu never overflows the window edge.
  const W = 240, H = CONTEXT_MENU_ITEMS.length * 30;
  const x = Math.min(menu.x, window.innerWidth - W - 8);
  const y = Math.min(menu.y, window.innerHeight - H - 8);

  return (
    <div className="gx-context" style={{ left: x, top: y }} onClick={e => e.stopPropagation()}>
      {CONTEXT_MENU_ITEMS.map((it, i) => it.divider
        ? <div key={i} className="gx-context-divider" />
        : (
          <div key={i} className="gx-context-item"
            onClick={it.copySha ? () => onCopySha(menu.sha) : undefined}>
            <span className="codicon">{it.icon}</span>
            <span>{it.label}</span>
            {it.shortcut && <span className="ctx-shortcut">{it.shortcut}</span>}
          </div>
        )
      )}
    </div>
  );
}
