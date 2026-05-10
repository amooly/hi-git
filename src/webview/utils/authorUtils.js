/* Author display helpers — deterministic avatar colour and initials. */

/**
 * Maps an author name to a deterministic HSL colour for their avatar.
 * @param {string} name
 * @returns {string} CSS colour string
 */
export function authorAvatarColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  return `hsl(${hue}, 45%, 45%)`;
}

/**
 * Returns up to two uppercase initials from a display name.
 * @param {string} name
 * @returns {string}
 */
export function authorInitials(name) {
  return name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
}
