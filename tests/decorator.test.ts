import { afterEach, describe, expect, it } from "vitest";
import { type Decorator, installDecorator, THEME_ATTR } from "../src/content/decorator.js";
import { RelationshipStore } from "../src/core/store.js";
import { badgeKind } from "../src/ui/badge.js";
import { themeOf } from "../src/ui/theme.js";
import { relationshipsFromReact } from "../src/x/react-props.js";
import { handleOf } from "../src/x/selectors.js";

/** Same nesting as a timeline tweet header on x.com (Nov 2026). */
const tweetHtml = (handle: string) => `
  <article data-testid="tweet">
    <div data-testid="User-Name">
      <div><div><a href="/${handle}"><div class="name-row"><div class="name"><span>Display Name</span></div><div class="verified"><svg></svg></div></div></a></div></div>
      <div><div class="row">
        <div class="handle"><a href="/${handle}"><div><span>@${handle}</span></div></a></div>
        <div class="dot"><span>·</span></div>
        <div><a href="/${handle}/status/1"><time>1h</time></a></div>
      </div></div>
    </div>
  </article>`;

/** A quoted tweet: the name is plain text, not a link. */
const quoteHtml = (handle: string) => `
  <article data-testid="tweet">
    <div data-testid="User-Name">
      <div><div><div><span>Quoted Name</span></div></div></div>
      <div><div class="row">
        <div class="handle"><a href="/${handle}"><div><span>@${handle}</span></div></a></div>
        <div class="dot"><span>·</span></div>
      </div></div>
    </div>
  </article>`;

let decorator: Decorator | undefined;

afterEach(() => {
  decorator?.teardown();
  decorator = undefined;
  document.body.innerHTML = "";
  document.body.style.backgroundColor = "";
  document.documentElement.lang = "";
});

const badges = () => [...document.querySelectorAll<HTMLElement>("[data-nod-badge]")];
const summary = () => badges().map((b) => [b.dataset.nodBadge, b.textContent]);

const decorate = (records: Parameters<RelationshipStore["upsertMany"]>[0]) => {
  const store = new RelationshipStore();
  store.upsertMany(records);
  decorator = installDecorator({ document, store });
  decorator.scan();
  return store;
};

describe("selectors", () => {
  it("reads the author handle from the header", () => {
    document.body.innerHTML = tweetHtml("ExampleAuthor42");
    const userName = document.querySelector('[data-testid="User-Name"]');
    expect(userName && handleOf(userName)).toBe("exampleauthor42");
  });
});

describe("badgeKind", () => {
  it("maps the four relationships, and nothing when we know nothing", () => {
    expect(badgeKind({ followedBy: true, following: true })).toBe("mutual");
    expect(badgeKind({ followedBy: true, following: false })).toBe("follows-you");
    expect(badgeKind({ followedBy: false, following: true })).toBe("not-following-back");
    expect(badgeKind({ followedBy: false, following: false })).toBe("not-following");
    expect(badgeKind(undefined)).toBeNull();
  });
});

describe("themeOf", () => {
  it("tells X's light, dim and lights-out backgrounds apart", () => {
    expect(themeOf("rgb(255, 255, 255)")).toBe("light");
    expect(themeOf("rgb(21, 32, 43)")).toBe("dark");
    expect(themeOf("rgb(0, 0, 0)")).toBe("dark");
    expect(themeOf("rgba(0, 0, 0, 0)")).toBe("light");
    expect(themeOf("")).toBe("light");
  });
});

describe("installDecorator", () => {
  it("puts the pill right after the name and X's verified badge", () => {
    document.body.innerHTML = tweetHtml("ExampleAuthor42");
    decorate([{ handle: "exampleauthor42", followedBy: true, following: false }]);

    const [badge] = badges();
    expect(badge?.textContent).toBe("Follows you");
    expect(badge?.parentElement?.className).toBe("name-row");
    expect(badge?.previousElementSibling?.className).toBe("verified");
    expect(badge?.nextElementSibling).toBeNull();
  });

  it("labels every relationship, with the mark only on mutuals", () => {
    document.body.innerHTML =
      tweetHtml("both") + tweetHtml("fan") + tweetHtml("idol") + tweetHtml("stranger");
    decorate([
      { handle: "both", followedBy: true, following: true },
      { handle: "fan", followedBy: true, following: false },
      { handle: "idol", followedBy: false, following: true },
      { handle: "stranger", followedBy: false, following: false },
    ]);

    expect(summary()).toEqual([
      ["mutual", "Mutual"],
      ["follows-you", "Follows you"],
      ["not-following-back", "Doesn't follow you"],
      ["not-following", "Doesn't follow you"],
    ]);
    expect(badges().map((b) => b.querySelector("svg") !== null)).toEqual([
      true,
      false,
      false,
      false,
    ]);
    expect(badges()[2]?.title).toBe("You follow them, but they don't follow you");
    expect(badges()[3]?.title).toBe("Doesn't follow you, and you don't follow them");
  });

  it("speaks Italian when X does", () => {
    document.documentElement.lang = "it";
    document.body.innerHTML =
      tweetHtml("friend") + tweetHtml("fan") + tweetHtml("idol") + tweetHtml("stranger");
    decorate([
      { handle: "friend", followedBy: true, following: true },
      { handle: "fan", followedBy: true, following: false },
      { handle: "idol", followedBy: false, following: true },
      { handle: "stranger", followedBy: false, following: false },
    ]);

    expect(summary()).toEqual([
      ["mutual", "Vi seguite"],
      ["follows-you", "Ti segue"],
      ["not-following-back", "Non ti segue"],
      ["not-following", "Non ti segue"],
    ]);
  });

  it("adds nothing for accounts we know nothing about", () => {
    document.body.innerHTML = tweetHtml("unknown");
    decorate([]);

    expect(badges()).toHaveLength(0);
  });

  it("falls back to after the handle when the name is not a link (quoted tweets)", () => {
    document.body.innerHTML = quoteHtml("quoted");
    decorate([{ handle: "quoted", followedBy: true, following: true }]);

    const [badge] = badges();
    expect(badge?.previousElementSibling?.className).toBe("handle");
    expect(badge?.nextElementSibling?.className).toBe("dot");
  });

  it("marks <html> with X's theme so the palette can switch", () => {
    document.body.innerHTML = tweetHtml("friend");
    document.body.style.backgroundColor = "rgb(21, 32, 43)";
    decorate([{ handle: "friend", followedBy: true, following: true }]);

    expect(document.documentElement.getAttribute(THEME_ATTR)).toBe("dark");
    decorator?.teardown();
    decorator = undefined;
    expect(document.documentElement.hasAttribute(THEME_ATTR)).toBe(false);
  });

  it("is idempotent and follows relationship changes", () => {
    document.body.innerHTML = tweetHtml("friend");
    const store = decorate([{ handle: "friend", followedBy: true, following: false }]);
    const first = badges()[0];
    decorator?.scan();
    expect(badges()).toEqual([first]);

    store.upsertMany([{ handle: "friend", followedBy: true, following: true }]);
    decorator?.scan();
    expect(summary()).toEqual([["mutual", "Mutual"]]);

    store.upsertMany([{ handle: "friend", followedBy: false, following: false }]);
    decorator?.scan();
    expect(summary()).toEqual([["not-following", "Doesn't follow you"]]);
  });

  it("moves the badge when X reuses a header for another author", () => {
    document.body.innerHTML = tweetHtml("friend");
    // "other" is unknown: the stale badge must go, not stay on the wrong author.
    decorate([{ handle: "friend", followedBy: true, following: false }]);
    expect(badges()).toHaveLength(1);

    for (const link of document.querySelectorAll("a")) {
      link.setAttribute("href", "/other");
    }
    const handleSpan = document.querySelector(".handle span");
    if (handleSpan) {
      handleSpan.textContent = "@other";
    }
    decorator?.scan();
    expect(badges()).toHaveLength(0);
  });

  it("falls back to the React props of the rendered tweet", () => {
    document.body.innerHTML = tweetHtml("exampleauthor42");
    const article = document.querySelector("article");
    Object.assign(article ?? {}, {
      __reactFiber$test: {
        memoizedProps: { children: [] },
        return: {
          memoizedProps: {
            tweet: { user: { screen_name: "ExampleAuthor42", followed_by: true, following: true } },
          },
        },
      },
    });

    const store = new RelationshipStore();
    decorator = installDecorator({ document, store, readReact: relationshipsFromReact });
    decorator.scan();

    expect(badges().map((b) => b.dataset.nodBadge)).toEqual(["mutual"]);
  });
});
