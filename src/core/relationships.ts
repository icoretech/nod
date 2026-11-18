/** How the signed-in viewer relates to another account. */
export type Relationship = {
  /** The account follows the viewer ("Follows you"). */
  followedBy: boolean;
  /** The viewer follows the account. */
  following: boolean;
};

export type RelationshipRecord = Relationship & {
  /** Lowercased screen name, without the leading "@". */
  handle: string;
  /** X's numeric user id, when the payload carries one. */
  id?: string;
};

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null;

export const normalizeHandle = (handle: string): string => handle.replace(/^@/, "").toLowerCase();

/**
 * Reads a relationship from a single object, if it looks like an X user.
 *
 * X has shipped three shapes over time, and the web client still mixes them:
 * - GraphQL (2025+): `core.screen_name` + `relationship_perspectives.followed_by`
 * - GraphQL legacy: `legacy.screen_name` + `legacy.followed_by`
 * - Flat (REST v1.1 and the React store): `screen_name` + `followed_by`
 */
export function relationshipFromUser(node: JsonObject): RelationshipRecord | null {
  const core = isObject(node.core) ? node.core : null;
  const perspectives = isObject(node.relationship_perspectives)
    ? node.relationship_perspectives
    : null;
  if (core && perspectives && typeof core.screen_name === "string") {
    return toRecord(core.screen_name, perspectives, node.rest_id);
  }

  const legacy = isObject(node.legacy) ? node.legacy : null;
  if (legacy && typeof legacy.screen_name === "string") {
    return toRecord(legacy.screen_name, legacy, node.rest_id ?? legacy.id_str);
  }

  if (typeof node.screen_name === "string") {
    return toRecord(node.screen_name, node, node.id_str);
  }

  return null;
}

function toRecord(screenName: string, source: JsonObject, id: unknown): RelationshipRecord | null {
  // Without an explicit boolean we know nothing, which is not the same as "doesn't follow you".
  if (typeof source.followed_by !== "boolean") {
    return null;
  }
  const record: RelationshipRecord = {
    handle: normalizeHandle(screenName),
    followedBy: source.followed_by,
    following: source.following === true,
  };
  if (typeof id === "string" && id !== "") {
    record.id = id;
  }
  return record;
}

/**
 * Walks any JSON value (an API response, a React prop) and collects every user
 * relationship found in it. Later occurrences of the same handle win.
 */
export function extractRelationships(root: unknown, maxDepth = 64): RelationshipRecord[] {
  const found = new Map<string, RelationshipRecord>();
  const seen = new WeakSet<object>();
  const stack: Array<{ value: unknown; depth: number }> = [{ value: root, depth: 0 }];

  while (stack.length > 0) {
    const item = stack.pop();
    if (!item || !isObject(item.value) || seen.has(item.value)) {
      continue;
    }
    const { value, depth } = item;
    seen.add(value);

    if (!Array.isArray(value)) {
      const record = relationshipFromUser(value);
      if (record) {
        found.set(record.handle, record);
      }
    }

    if (depth >= maxDepth) {
      continue;
    }
    // Push in reverse so the walk visits children in document order.
    const children = Array.isArray(value) ? value : Object.values(value);
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (isObject(child)) {
        stack.push({ value: child, depth: depth + 1 });
      }
    }
  }

  return [...found.values()];
}
