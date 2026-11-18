import type { Relationship } from "../core/relationships.js";

export const BADGE_ATTR = "data-nod-badge";
export const BADGE_HANDLE_ATTR = "data-nod-handle";

/**
 * - mutual: you follow each other
 * - follows-you: they follow you, you don't follow them
 * - not-following-back: you follow them, they don't follow you
 * - not-following: neither of you follows the other
 *
 * The last two share the "Doesn't follow you" label and differ only in the tooltip.
 */
export type BadgeKind = "mutual" | "follows-you" | "not-following-back" | "not-following";

type Copy = { label: string; title: string };

/** Uses X's own wording where X has one ("Follows you" / "Ti segue"). */
const COPY: Record<string, Record<BadgeKind, Copy>> = {
  en: {
    mutual: { label: "Mutual", title: "You follow each other" },
    "follows-you": { label: "Follows you", title: "Follows you. You don't follow them" },
    "not-following-back": {
      label: "Doesn't follow you",
      title: "You follow them, but they don't follow you",
    },
    "not-following": {
      label: "Doesn't follow you",
      title: "Doesn't follow you, and you don't follow them",
    },
  },
  it: {
    mutual: { label: "Vi seguite", title: "Vi seguite a vicenda" },
    "follows-you": { label: "Ti segue", title: "Ti segue, ma tu non lo segui" },
    "not-following-back": { label: "Non ti segue", title: "Lo segui, ma non ti segue" },
    "not-following": { label: "Non ti segue", title: "Non ti segue, e tu non lo segui" },
  },
};

export function badgeKind(relationship: Relationship | undefined): BadgeKind | null {
  if (!relationship) {
    return null;
  }
  if (relationship.followedBy) {
    return relationship.following ? "mutual" : "follows-you";
  }
  return relationship.following ? "not-following-back" : "not-following";
}

export function badgeCopy(kind: BadgeKind, lang: string): Copy {
  const language = lang.toLowerCase().split("-")[0] ?? "en";
  return (COPY[language] ?? COPY.en)[kind];
}

const SVG_NS = "http://www.w3.org/2000/svg";

/** Two overlapping circles: the Nod mark, drawn in the pill's text color. */
function mutualMark(doc: Document): SVGSVGElement {
  const svg = doc.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 15 11");
  svg.setAttribute("aria-hidden", "true");
  for (const [cx, opacity] of [
    ["5.5", "0.55"],
    ["9.5", "0.9"],
  ] as const) {
    const circle = doc.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", cx);
    circle.setAttribute("cy", "5.5");
    circle.setAttribute("r", "4.5");
    circle.setAttribute("fill", "currentColor");
    circle.setAttribute("opacity", opacity);
    svg.append(circle);
  }
  return svg;
}

export function createBadge(
  doc: Document,
  kind: BadgeKind,
  handle: string,
  lang: string,
): HTMLElement {
  const { label, title } = badgeCopy(kind, lang);
  const badge = doc.createElement("span");
  badge.setAttribute(BADGE_ATTR, kind);
  badge.setAttribute(BADGE_HANDLE_ATTR, handle);
  badge.title = title;
  if (kind === "mutual") {
    badge.append(mutualMark(doc));
  }
  badge.append(label);
  return badge;
}
