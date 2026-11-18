import { afterEach, describe, expect, it } from "vitest";
import type { RelationshipRecord } from "../../src/core/relationships.js";
import {
  createViewerFilter,
  viewerHandleFromNav,
  viewerIdFromBootstrap,
} from "../../src/x/viewer.js";

/** Same layout as x.com's inline bootstrap script (Nov 2026), trimmed. */
const bootstrap = (session: object) =>
  `window.__INITIAL_STATE__=${JSON.stringify({
    entities: {
      users: {
        entities: { "42": { screen_name: "someone", description: 'a } brace, a { and "quotes"' } },
      },
    },
    session,
  })};window.__META_DATA__={"env":"prod"};`;

// Scripts set through innerHTML are never executed, in browsers or in jsdom.
const setBootstrap = (text: string) => {
  document.head.innerHTML = `<script type="text/javascript">${text}</script>`;
};
const setNav = (handle: string) => {
  document.body.innerHTML = `<nav><a data-testid="AppTabBar_Profile_Link" href="/${handle}">Profile</a></nav>`;
};

const record = (handle: string, id?: string): RelationshipRecord =>
  id
    ? { handle, id, followedBy: false, following: false }
    : { handle, followedBy: false, following: false };

afterEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
});

describe("viewerIdFromBootstrap", () => {
  it("reads session.user_id, past braces and quotes inside strings", () => {
    setBootstrap(bootstrap({ communitiesActions: { create: false }, user_id: "9007199254740993" }));
    expect(viewerIdFromBootstrap(document)).toBe("9007199254740993");
  });

  it("tells a missing script (undefined) from a signed-out page (null)", () => {
    expect(viewerIdFromBootstrap(document)).toBeUndefined();
    setBootstrap(bootstrap({ isLoaded: true }));
    expect(viewerIdFromBootstrap(document)).toBeNull();
    setBootstrap("window.__INITIAL_STATE__={broken");
    expect(viewerIdFromBootstrap(document)).toBeNull();
  });
});

describe("viewerHandleFromNav", () => {
  it("reads the handle from the side navigation's profile link", () => {
    expect(viewerHandleFromNav(document)).toBeNull();
    setNav("Example_Viewer");
    expect(viewerHandleFromNav(document)).toBe("example_viewer");
  });
});

describe("createViewerFilter", () => {
  it("drops the signed-in account by id and keeps everyone else", () => {
    setBootstrap(bootstrap({ user_id: "7" }));
    const withoutViewer = createViewerFilter(document);
    const kept = withoutViewer([
      record("me", "7"),
      record("sample_author", "8"),
      record("sample_brand"),
    ]);
    expect(kept.map((r) => r.handle)).toEqual(["sample_author", "sample_brand"]);
  });

  it("falls back to the profile link, which may render later", () => {
    const withoutViewer = createViewerFilter(document);
    expect(withoutViewer([record("me")])).toHaveLength(1);
    setNav("Me");
    expect(withoutViewer([record("me"), record("other")]).map((r) => r.handle)).toEqual(["other"]);
  });

  it("parses the bootstrap script only once", () => {
    setBootstrap(bootstrap({ user_id: "7" }));
    const withoutViewer = createViewerFilter(document);
    withoutViewer([record("someone", "1")]);
    setBootstrap(bootstrap({ user_id: "1" }));
    expect(withoutViewer([record("me", "7"), record("someone", "1")]).map((r) => r.handle)).toEqual(
      ["someone"],
    );
  });
});
