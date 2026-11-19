import { describe, expect, it } from "vitest";

import { extractRelationships } from "../src/core/relationships.js";
import { RelationshipStore } from "../src/core/store.js";

/** Trimmed copy of the HomeTimeline shape observed on x.com in Nov 2026. */
const homeTimeline = {
  data: {
    home: {
      home_timeline_urt: {
        instructions: [
          {
            entries: [
              {
                content: {
                  itemContent: {
                    tweet_results: {
                      result: {
                        __typename: "Tweet",
                        core: {
                          user_results: {
                            result: {
                              __typename: "User",
                              rest_id: "101",
                              core: { name: "Example Author", screen_name: "ExampleAuthor42" },
                              relationship_perspectives: { followed_by: true, following: true },
                            },
                          },
                        },
                        legacy: {
                          full_text: "hi @example_mention",
                          entities: {
                            user_mentions: [
                              { screen_name: "example_mention", name: "Example Mention" },
                            ],
                          },
                        },
                        quoted_status_result: {
                          result: {
                            core: {
                              user_results: {
                                result: {
                                  core: { screen_name: "Quoted" },
                                  relationship_perspectives: {
                                    followed_by: true,
                                    following: false,
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              {
                content: {
                  itemContent: {
                    tweet_results: {
                      result: {
                        core: {
                          user_results: {
                            result: {
                              core: { screen_name: "sample_reader" },
                              relationship_perspectives: { followed_by: false, following: false },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        ],
      },
    },
  },
};

describe("extractRelationships", () => {
  it("reads the 2025+ GraphQL shape, including quoted authors", () => {
    expect(extractRelationships(homeTimeline)).toEqual([
      { handle: "exampleauthor42", followedBy: true, following: true, id: "101" },
      { handle: "quoted", followedBy: true, following: false },
      { handle: "sample_reader", followedBy: false, following: false },
    ]);
  });

  it("ignores mentions and other objects without an explicit followed_by", () => {
    const handles = extractRelationships(homeTimeline).map((r) => r.handle);
    expect(handles).not.toContain("example_mention");
  });

  it("reads the legacy GraphQL shape", () => {
    const user = {
      legacy: { screen_name: "Old", id_str: "102", followed_by: true, following: false },
    };
    expect(extractRelationships({ user })).toEqual([
      { handle: "old", followedBy: true, following: false, id: "102" },
    ]);
  });

  it("reads the flat shape used by REST and React props", () => {
    const tweet = {
      user: { screen_name: "Flat", id_str: "103", followed_by: false, following: true },
    };
    expect(extractRelationships(tweet)).toEqual([
      { handle: "flat", followedBy: false, following: true, id: "103" },
    ]);
  });

  it("lets the latest occurrence of a handle win", () => {
    const payload = [
      { screen_name: "same", followed_by: false },
      { screen_name: "SAME", followed_by: true },
    ];
    expect(extractRelationships(payload)).toEqual([
      { handle: "same", followedBy: true, following: false },
    ]);
  });

  it("survives cycles and respects the depth limit", () => {
    const node: Record<string, unknown> = { screen_name: "loop", followed_by: true };
    node.self = node;
    expect(extractRelationships(node)).toHaveLength(1);
    const deep = { a: { b: { c: { screen_name: "deep", followed_by: true } } } };
    expect(extractRelationships(deep, 2)).toEqual([]);
  });
});

describe("RelationshipStore", () => {
  it("notifies only when a relationship actually changes", () => {
    const store = new RelationshipStore();
    let calls = 0;
    store.subscribe(() => calls++);

    store.upsertMany([{ handle: "a", followedBy: true, following: false }]);
    store.upsertMany([{ handle: "a", followedBy: true, following: false }]);
    expect(calls).toBe(1);

    store.upsertMany([{ handle: "a", followedBy: false, following: false }]);
    expect(calls).toBe(2);
    expect(store.get("a")).toEqual({ followedBy: false, following: false });
  });
});
