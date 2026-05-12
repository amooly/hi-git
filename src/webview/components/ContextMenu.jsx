/* ContextMenu — viewport-clamped right-click menu for commit rows. */

import { CONTEXT_MENU_ITEMS } from '../constants/contextMenuItems.js';

export function ContextMenu({ menu, onCopySha, onCopyInfo, onCompareWithLocal }) {
  const W = 240, H = CONTEXT_MENU_ITEMS.length * 30;
  const x = Math.min(menu.x, window.innerWidth - W - 8);
  const y = Math.min(menu.y, window.innerHeight - H - 8);

  function getClickHandler(it) {
    if (it.disabled)          return undefined;
    if (it.copySha)           return () => onCopySha(menu.sha);
    if (it.copyInfo)          return () => onCopyInfo(menu.sha);
    if (it.compareWithLocal)  return () => onCompareWithLocal(menu.sha);
    return undefined;
  }

  return (
    <div className="gx-context" style={{ left: x, top: y }} onClick={e => e.stopPropagation()}>
      {CONTEXT_MENU_ITEMS.map((it, i) => it.divider
        ? <div key={i} className="gx-context-divider" />
        : (
          <div
            key={i}
            className={`gx-context-item${it.disabled ? ' gx-context-item--disabled' : ''}`}
            onClick={getClickHandler(it)}
          >
            <span className="codicon">{it.icon}</span>
            <span>{it.label}</span>
            {it.shortcut && <span className="ctx-shortcut">{it.shortcut}</span>}
          </div>
        )
      )}
    </div>
  );
}
