import { describe, expect, it, vi } from "vitest";

import { installNetworkTap, isApiUrl } from "../../src/x/network-tap.js";

const API_URL = "https://x.com/i/api/graphql/abc/HomeTimeline";

class FakeXhr extends EventTarget {
  responseType: XMLHttpRequestResponseType = "";
  responseText = "";
  response: unknown = null;
  openedWith: unknown[] = [];

  open(...args: unknown[]): void {
    this.openedWith = args;
  }

  respond(body: string): void {
    this.responseText = body;
    this.dispatchEvent(new Event("load"));
  }
}

const makeWindow = (fetchImpl: typeof fetch) => ({
  XMLHttpRequest: FakeXhr as unknown as typeof XMLHttpRequest,
  fetch: fetchImpl,
});

describe("isApiUrl", () => {
  it("matches X's API paths only", () => {
    expect(isApiUrl(API_URL)).toBe(true);
    expect(isApiUrl("https://x.com/i/api/1.1/friendships/show.json")).toBe(true);
    expect(isApiUrl("https://abs.twimg.com/responsive-web/client-web/main.js")).toBe(false);
  });
});

describe("installNetworkTap", () => {
  it("reads XHR JSON responses from API calls and keeps the original open()", () => {
    const seen: unknown[] = [];
    const win = makeWindow(vi.fn());
    const restore = installNetworkTap(win, (json) => seen.push(json));

    const xhr = new win.XMLHttpRequest() as unknown as FakeXhr;
    xhr.open("POST", API_URL, true);
    xhr.respond('{"data":{"ok":true}}');
    expect(xhr.openedWith).toEqual(["POST", API_URL, true]);
    expect(seen).toEqual([{ data: { ok: true } }]);

    const other = new win.XMLHttpRequest() as unknown as FakeXhr;
    other.open("GET", "https://x.com/home");
    other.respond('{"ignored":true}');
    expect(seen).toHaveLength(1);

    restore();
  });

  it("reads fetch JSON responses without consuming the body X gets", async () => {
    const seen: unknown[] = [];
    const original = vi.fn(
      async () =>
        new Response('{"data":{"n":1}}', { headers: { "content-type": "application/json" } }),
    );
    const win = makeWindow(original as unknown as typeof fetch);
    const restore = installNetworkTap(win, (json) => seen.push(json));

    const response = await win.fetch(API_URL, { method: "POST" });
    expect(await response.json()).toEqual({ data: { n: 1 } });
    await vi.waitFor(() => expect(seen).toEqual([{ data: { n: 1 } }]));
    expect(original).toHaveBeenCalledWith(API_URL, { method: "POST" });

    restore();
    expect(win.fetch).toBe(original);
  });

  it("never lets a listener error reach X", () => {
    const win = makeWindow(vi.fn());
    installNetworkTap(win, () => {
      throw new Error("boom");
    });
    const xhr = new win.XMLHttpRequest() as unknown as FakeXhr;
    xhr.open("GET", API_URL);
    expect(() => xhr.respond("{}")).not.toThrow();
  });
});
