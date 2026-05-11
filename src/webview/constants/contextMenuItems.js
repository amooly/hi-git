/* Static context menu item definitions.
 * Only items with `copySha: true` have a live closure at render time;
 * all others are stubs for future command wiring.
 */

export const CONTEXT_MENU_ITEMS = [
  { icon: 'content_copy', label: 'Copy commit ID', shortcut: '⌘C', copySha: true },
  { icon: 'sell', label: 'Copy commit message', shortcut: null },
  { divider: true },
  { icon: 'difference', label: 'Compare with local', shortcut: '⌘D', compareWithPrev: true },
  { icon: 'compare_arrows', label: 'Compare with previous', shortcut: null, compareWithPrev: true },
  { divider: true },
  { icon: 'download_for_offline', label: 'Checkout commit', shortcut: null },
  { icon: 'call_split', label: 'Create branch from here', shortcut: null },
  { icon: 'sell', label: 'Create tag at commit', shortcut: null },
  { divider: true },
  { icon: 'undo', label: 'Revert commit', shortcut: null },
  { icon: 'restart_alt', label: 'Reset current branch to here', shortcut: null },
  { divider: true },
  { icon: 'open_in_new', label: 'Open in remote', shortcut: null },
];
