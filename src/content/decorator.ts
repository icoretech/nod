import type { RelationshipRecord } from "../core/relationships.js";
import type { RelationshipStore } from "../core/store.js";
import { BADGE_ATTR, BADGE_HANDLE_ATTR, badgeKind, createBadge } from "../ui/badge.js";
import { themeOf } from "../ui/theme.js";
import { badgeSlot, handleOf, SELECTORS } from "../x/selectors.js";

/** Set on <html> so content.css can switch the badge palette for X's dark themes. */
export const THEME_ATTR = "data-nod-theme";

export type DecoratorOptions = {
  document: Document;
  store: RelationshipStore;
  /** Optional fallback that reads relationships from a rendered tweet. */
  readReact?: (article: Element) => RelationshipRecord[];
};

export type Decorator = {
  /** Synchronously badges everything currently on the page. */
  scan(): void;
  teardown(): void;
};

/**
 * Keeps a relationship badge (mutual / follows you / doesn't follow you) next to
 * every tweet author's name. Idempotent:
 * re-scanning an already correct page touches nothing, so our own insertions
 * cannot feed the MutationObserver in a loop.
 */
export function installDecorator({ document: doc, store, readReact }: DecoratorOptions): Decorator {
  const win = doc.defaultView;
  // Remember which author we already asked React about, per header element.
  const reactTried = new WeakMap<Element, string>();
  let pending = false;

  const syncTheme = (): void => {
    const background = doc.body && win ? win.getComputedStyle(doc.body).backgroundColor : "";
    const theme = themeOf(background);
    if (doc.documentElement.getAttribute(THEME_ATTR) !== theme) {
      doc.documentElement.setAttribute(THEME_ATTR, theme);
    }
  };

  const scan = (): void => {
    syncTheme();
    for (const userName of doc.querySelectorAll(SELECTORS.userName)) {
      decorate(userName);
    }
  };

  const schedule = (): void => {
    if (pending) {
      return;
    }
    pending = true;
    const run = (): void => {
      pending = false;
      scan();
    };
    if (win?.requestAnimationFrame) {
      win.requestAnimationFrame(run);
    } else {
      setTimeout(run, 16);
    }
  };

  const decorate = (userName: Element): void => {
    const handle = handleOf(userName);
    const existing = userName.querySelector<HTMLElement>(`[${BADGE_ATTR}]`);
    let relationship = handle ? store.get(handle) : undefined;

    if (handle && !relationship && readReact && reactTried.get(userName) !== handle) {
      reactTried.set(userName, handle);
      const article = userName.closest(SELECTORS.tweet);
      if (article) {
        store.upsertMany(readReact(article));
        relationship = store.get(handle);
      }
    }

    const kind = badgeKind(relationship);
    if (
      existing &&
      existing.getAttribute(BADGE_ATTR) === kind &&
      existing.getAttribute(BADGE_HANDLE_ATTR) === handle
    ) {
      return;
    }
    existing?.remove();
    if (!kind || !handle) {
      return;
    }

    const badge = createBadge(doc, kind, handle, doc.documentElement.lang || "en");
    const { parent, before } = badgeSlot(userName);
    parent.insertBefore(badge, before);
  };

  const observer = new MutationObserver(schedule);
  observer.observe(doc.documentElement, { childList: true, subtree: true });
  const unsubscribe = store.subscribe(schedule);
  schedule();

  return {
    scan,
    teardown() {
      observer.disconnect();
      unsubscribe();
      for (const badge of doc.querySelectorAll(`[${BADGE_ATTR}]`)) {
        badge.remove();
      }
      doc.documentElement.removeAttribute(THEME_ATTR);
    },
  };
}
