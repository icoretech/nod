import { normalizeHandle, type RelationshipRecord } from "../core/relationships.js";

// X describes the signed-in account exactly like a stranger (followed_by and
// following both false), so without this your own posts would read
// "Doesn't follow you".

/** X boots every page with this inline script; its `session.user_id` is you. */
const BOOTSTRAP = "window.__INITIAL_STATE__=";
/** Desktop layouts link to your profile from the side navigation. */
const PROFILE_LINK = 'a[data-testid="AppTabBar_Profile_Link"]';

/**
 * The signed-in account's numeric id, read from X's inline bootstrap data.
 * `undefined` means the script is not in the page (yet); `null` means it is,
 * but names no account.
 */
export function viewerIdFromBootstrap(doc: Document): string | null | undefined {
  for (const script of doc.scripts) {
    const text = script.textContent ?? "";
    if (!text.startsWith(BOOTSTRAP)) {
      continue;
    }
    const json = objectAt(text, BOOTSTRAP.length);
    if (!json) {
      return null;
    }
    try {
      const state: unknown = JSON.parse(json);
      const session = isObject(state) && isObject(state.session) ? state.session : null;
      const id = session?.user_id;
      return typeof id === "string" && /^\d+$/.test(id) ? id : null;
    } catch {
      return null;
    }
  }
  return undefined;
}

/** The signed-in account's handle, from the profile link in X's side navigation. */
export function viewerHandleFromNav(doc: Document): string | null {
  const href = doc.querySelector(PROFILE_LINK)?.getAttribute("href") ?? "";
  const match = /^\/(\w{1,15})$/.exec(href);
  return match?.[1] ? normalizeHandle(match[1]) : null;
}

/**
 * Returns a filter that drops the signed-in account from a batch of records.
 * The bootstrap script and the side navigation appear after document_start, so
 * each is looked up again until it shows up; the script is parsed only once.
 */
export function createViewerFilter(
  doc: Document,
): (records: RelationshipRecord[]) => RelationshipRecord[] {
  let id: string | null | undefined;
  let handle: string | null = null;
  return (records) => {
    if (records.length === 0) {
      return records;
    }
    if (id === undefined) {
      id = viewerIdFromBootstrap(doc);
    }
    handle ??= viewerHandleFromNav(doc);
    return records.filter((record) => !(id && record.id === id) && record.handle !== handle);
  };
}

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The `{...}` that starts at `start`, matched by braces outside of strings. */
function objectAt(text: string, start: number): string | null {
  if (text[start] !== "{") {
    return null;
  }
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (char === "\\") {
        i++;
      } else if (char === '"') {
        inString = false;
      }
    } else if (char === '"') {
      inString = true;
    } else if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}
