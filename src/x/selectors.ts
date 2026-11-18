/**
 * Everything that depends on X's DOM lives here, so a markup change is a
 * one-file fix. Verified against x.com on 2026-11-18.
 */
export const SELECTORS = {
  tweet: 'article[data-testid="tweet"]',
  /** Author header of a tweet: display name row + "@handle · time" row. Also used in quotes. */
  userName: '[data-testid="User-Name"]',
} as const;

const HANDLE_TEXT = /^@([A-Za-z0-9_]{1,15})$/;
const PROFILE_PATH = /^\/([A-Za-z0-9_]{1,15})$/;

/** The "@handle" link inside a User-Name block. */
export function findHandleLink(userName: Element): HTMLAnchorElement | null {
  for (const link of userName.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    if (HANDLE_TEXT.test(link.textContent?.trim() ?? "")) {
      return link;
    }
  }
  return null;
}

/** Lowercased handle of the author shown in a User-Name block. */
export function handleOf(userName: Element): string | null {
  const link = findHandleLink(userName);
  const fromText = link ? HANDLE_TEXT.exec(link.textContent?.trim() ?? "") : null;
  if (fromText?.[1]) {
    return fromText[1].toLowerCase();
  }
  for (const anchor of userName.querySelectorAll("a[href]")) {
    const fromPath = PROFILE_PATH.exec(anchor.getAttribute("href") ?? "");
    if (fromPath?.[1]) {
      return fromPath[1].toLowerCase();
    }
  }
  return null;
}

/**
 * The flex row inside the display-name link that holds the name and X's own
 * badges (verified, affiliate). Absent when the name isn't a link, e.g. in quotes.
 */
export function nameRow(userName: Element): Element | null {
  const link = userName.firstElementChild?.querySelector("a[href]");
  const row = link?.firstElementChild ?? null;
  return row && link !== findHandleLink(userName) ? row : null;
}

/**
 * Where the badge goes: at the end of the name row, after the verified badge,
 * so it stays on the name line. Falls back to right after the "@handle" link,
 * then to the end of the User-Name block if the layout is unfamiliar.
 */
export function badgeSlot(userName: Element): { parent: Element; before: Node | null } {
  const row = nameRow(userName);
  if (row) {
    return { parent: row, before: null };
  }
  const wrapper = findHandleLink(userName)?.parentElement;
  if (wrapper?.parentElement && userName.contains(wrapper.parentElement)) {
    return { parent: wrapper.parentElement, before: wrapper.nextSibling };
  }
  return { parent: userName, before: null };
}
