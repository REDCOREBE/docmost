/**
 * Redcore — OnePassword Smart Links (source-native)
 * Runtime marker: REDCORE_ONEPASSWORD_SMART_LINKS_NATIVE
 *
 * Standard link mark only. No CDN / no fetch to 1Password.
 * Mutations ONLY via appendTransaction (V1.2 semantics).
 */

export const ONEPASSWORD_SMART_LINKS_MARKER =
  'REDCORE_ONEPASSWORD_SMART_LINKS_NATIVE';

/** Visible label — exact string, no emoji in the text node. */
export const ONEPASSWORD_LABEL = '1Password';

/** Pre-native / V1.x labels migrated to ONEPASSWORD_LABEL. */
export const ONEPASSWORD_LABEL_LEGACY = 'Accès 1Password';
export const ONEPASSWORD_LABEL_LEGACY_EMOJI = '🔐 Accès 1Password';

const LOGO_HINT = '/* redcore onepassword logo via CSS ::before */';

/** Harmless marker string kept in the module graph for smoke greps. */
export const ONEPASSWORD_NATIVE_BUILD_HINT = `${ONEPASSWORD_SMART_LINKS_MARKER} ${LOGO_HINT}`;

/**
 * Valid item open URL: https + host start.1password.com + pathname /open/i
 * (trailing slash ok). Does NOT use .includes("1password").
 */
export function isOnePasswordItemUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    if (u.hostname !== 'start.1password.com') return false;
    const p = u.pathname.replace(/\/+$/, '') || '/';
    return p === '/open/i';
  } catch {
    return false;
  }
}

/** True when visible text is the raw URL (or strict autolink equivalent). */
export function isRawUrlTitle(text: string, href: string): boolean {
  if (!text || !href) return false;
  if (text === href) return true;
  try {
    if (decodeURI(text) === href || text === decodeURI(href)) return true;
  } catch {
    /* ignore */
  }
  try {
    const a = new URL(text);
    const b = new URL(href);
    if (a.protocol !== b.protocol || a.hostname !== b.hostname) return false;
    if (a.search !== b.search || a.hash !== b.hash) return false;
    const ap = a.pathname.replace(/\/+$/, '') || '/';
    const bp = b.pathname.replace(/\/+$/, '') || '/';
    return ap === bp && ap === '/open/i';
  } catch {
    return false;
  }
}

function stripLeadEmoji(text: string): string {
  return text.replace(/^\p{Extended_Pictographic}\uFE0F?\s*/u, '');
}

/** Whether appendTransaction should rewrite this link's visible text. */
export function shouldRewriteOnePasswordTitle(
  text: string,
  href: string,
): boolean {
  if (!isOnePasswordItemUrl(href)) return false;
  if (text === ONEPASSWORD_LABEL) return false;
  if (isRawUrlTitle(text, href)) return true;
  if (
    text === ONEPASSWORD_LABEL_LEGACY ||
    text === ONEPASSWORD_LABEL_LEGACY_EMOJI
  ) {
    return true;
  }
  const stripped = stripLeadEmoji(text);
  if (stripped === ONEPASSWORD_LABEL_LEGACY || stripped === ONEPASSWORD_LABEL) {
    return true;
  }
  return false;
}

/**
 * Next visible text for an OP item link. Never mutates href.
 * Custom titles are returned unchanged.
 */
export function nextVisibleText(text: string, href: string): string {
  if (!shouldRewriteOnePasswordTitle(text, href)) return text;
  return ONEPASSWORD_LABEL;
}
