import { extractRelationships, type RelationshipRecord } from "../core/relationships.js";

/** How far up the React fiber tree to look for the `tweet` prop (seen at ~13 in Nov 2026). */
const MAX_FIBER_HOPS = 40;
/** A tweet prop holds the author, plus quoted/retweeted tweets and their authors. */
const MAX_PROP_DEPTH = 4;

type Fiber = { memoizedProps?: unknown; return?: Fiber | null };

/**
 * Fallback source: reads the relationship straight from the React props X
 * attached to a rendered tweet. Covers tweets whose API response we missed.
 */
export function relationshipsFromReact(article: Element): RelationshipRecord[] {
  let fiber = fiberOf(article);
  for (let hops = 0; fiber && hops < MAX_FIBER_HOPS; hops++) {
    const props = fiber.memoizedProps;
    if (typeof props === "object" && props !== null && "tweet" in props) {
      const { tweet } = props as { tweet: unknown };
      if (typeof tweet === "object" && tweet !== null) {
        return extractRelationships(tweet, MAX_PROP_DEPTH);
      }
    }
    fiber = fiber.return ?? null;
  }
  return [];
}

function fiberOf(element: Element): Fiber | null {
  const key = Object.keys(element).find((name) => name.startsWith("__reactFiber$"));
  if (!key) {
    return null;
  }
  const fiber = (element as unknown as Record<string, unknown>)[key];
  return typeof fiber === "object" && fiber !== null ? (fiber as Fiber) : null;
}
