/**
 * Passively reads the JSON that X's own web client already downloads.
 * It never issues requests, never changes them, and never delays them.
 */

/** X's API traffic: GraphQL (/i/api/graphql/...) plus the older REST paths. */
const API_PATH = /\/i\/api\/(?:graphql|1\.1|2)\//;

export type JsonListener = (json: unknown, url: string) => void;

type TapWindow = {
  XMLHttpRequest: typeof XMLHttpRequest;
  fetch: typeof fetch;
};

export function isApiUrl(url: string): boolean {
  return API_PATH.test(url);
}

export function installNetworkTap(win: TapWindow, onJson: JsonListener): () => void {
  const restoreXhr = tapXhr(win.XMLHttpRequest, onJson);
  const restoreFetch = tapFetch(win, onJson);
  return () => {
    restoreXhr();
    restoreFetch();
  };
}

function tapXhr(Xhr: typeof XMLHttpRequest, onJson: JsonListener): () => void {
  const proto = Xhr.prototype;
  const originalOpen = proto.open;

  proto.open = function open(this: XMLHttpRequest, ...args: unknown[]) {
    const url = String(args[1] ?? "");
    if (isApiUrl(url)) {
      this.addEventListener("load", () => readXhr(this, url, onJson));
    }
    return Reflect.apply(originalOpen, this, args);
  } as typeof proto.open;

  return () => {
    proto.open = originalOpen;
  };
}

function readXhr(xhr: XMLHttpRequest, url: string, onJson: JsonListener): void {
  try {
    if (xhr.responseType === "json") {
      emit(onJson, xhr.response, url);
    } else if (xhr.responseType === "" || xhr.responseType === "text") {
      const text = xhr.responseText;
      if (text.startsWith("{") || text.startsWith("[")) {
        emit(onJson, JSON.parse(text), url);
      }
    }
  } catch {
    // Not JSON, or not ours to worry about.
  }
}

function tapFetch(win: TapWindow, onJson: JsonListener): () => void {
  const originalFetch = win.fetch;

  win.fetch = function fetchTap(this: unknown, ...args: Parameters<typeof fetch>) {
    const pending: Promise<Response> = Reflect.apply(originalFetch, this, args);
    const url = requestUrl(args[0]);
    if (isApiUrl(url)) {
      pending
        .then((response) => {
          const type = response.headers.get("content-type") ?? "";
          if (!type.includes("json")) {
            return;
          }
          return response
            .clone()
            .json()
            .then((json: unknown) => emit(onJson, json, url));
        })
        .catch(() => undefined);
    }
    return pending;
  } as typeof fetch;

  return () => {
    win.fetch = originalFetch;
  };
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  return input.url;
}

function emit(onJson: JsonListener, json: unknown, url: string): void {
  try {
    onJson(json, url);
  } catch {
    // A bug in our parser must never break X.
  }
}
