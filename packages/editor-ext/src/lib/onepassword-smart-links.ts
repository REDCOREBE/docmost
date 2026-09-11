/**
 * Redcore — OnePassword Smart Links (source-native)
 * Runtime marker: REDCORE_ONEPASSWORD_SMART_LINKS_NATIVE
 *
 * Standard link mark only. No CDN / no fetch to 1Password.
 * Mutations ONLY via appendTransaction (V1.2 semantics).
 * Phase 2.1 — optional date metadata on link mark attrs.
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

export type OnePasswordDateAttrs = {
  onePasswordCreatedAt: string | null;
  onePasswordUpdatedAt: string | null;
};

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

/** UTC ISO 8601 with milliseconds, e.g. 2026-09-11T11:42:31.123Z */
export function nowUtcIso(date: Date = new Date()): string {
  return date.toISOString();
}

/** Stamp both dates for paste / slash create. */
export function onePasswordCreateDateAttrs(
  now: string = nowUtcIso(),
): OnePasswordDateAttrs {
  return {
    onePasswordCreatedAt: now,
    onePasswordUpdatedAt: now,
  };
}

/**
 * Href actually changed on an existing 1P link:
 * createdAt unchanged (including null); updatedAt = now.
 */
export function onePasswordHrefUpdateDateAttrs(
  existing: Partial<OnePasswordDateAttrs> | null | undefined,
  now: string = nowUtcIso(),
): OnePasswordDateAttrs {
  return {
    onePasswordCreatedAt: existing?.onePasswordCreatedAt ?? null,
    onePasswordUpdatedAt: now,
  };
}

/**
 * First raw-URL → label rewrite (paste create): stamp both if missing.
 * Legacy Accès / emoji title migration: leave dates untouched (pre-2.1 stay null).
 */
export function datesForTitleRewrite(opts: {
  text: string;
  href: string;
  createdAt: string | null | undefined;
  updatedAt: string | null | undefined;
  now?: string;
}): OnePasswordDateAttrs | null {
  const createdAt = opts.createdAt ?? null;
  const updatedAt = opts.updatedAt ?? null;
  if (!isRawUrlTitle(opts.text, opts.href)) {
    // Title-only migration (legacy label etc.) — do not touch dates
    return null;
  }
  if (createdAt || updatedAt) {
    // Already stamped — do not reset on any subsequent rewrite
    return null;
  }
  return onePasswordCreateDateAttrs(opts.now ?? nowUtcIso());
}

/** FR date line from ISO, using browser/local timezone (or explicit). */
export function formatOnePasswordDateFr(
  iso: string,
  timeZone?: string,
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const opts: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };
  if (timeZone) opts.timeZone = timeZone;
  const parts = new Intl.DateTimeFormat('fr-FR', opts).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  const day = get('day');
  const month = get('month');
  const year = get('year');
  const hour = get('hour');
  const minute = get('minute');
  return `${day}/${month}/${year} à ${hour}:${minute}`;
}

/**
 * Tooltip body for 1Password badge (Mantine Tooltip / title).
 * Prefer updatedAt; else createdAt; else generic label.
 */
export function onePasswordTooltipLabel(
  createdAt: string | null | undefined,
  updatedAt: string | null | undefined,
  timeZone?: string,
): string {
  if (updatedAt) {
    return `Lien 1Password\nMis à jour le ${formatOnePasswordDateFr(updatedAt, timeZone)}`;
  }
  if (createdAt) {
    return `Ajouté le ${formatOnePasswordDateFr(createdAt, timeZone)}`;
  }
  return 'Lien 1Password';
}
