// Entry point. Runs in the page's MAIN world at document_start, so the network
// tap is in place before X's own scripts make their first API call.
import { extractRelationships } from "../core/relationships.js";
import { RelationshipStore } from "../core/store.js";
import { installNetworkTap } from "../x/network-tap.js";
import { relationshipsFromReact } from "../x/react-props.js";
import { createViewerFilter } from "../x/viewer.js";
import { installDecorator } from "./decorator.js";

const INSTALLED = Symbol.for("nod.installed");

if (typeof document !== "undefined" && !Reflect.get(globalThis, INSTALLED)) {
  Reflect.set(globalThis, INSTALLED, true);

  const store = new RelationshipStore();
  // Your own account looks like a stranger in X's data; keep it out of the store.
  const withoutViewer = createViewerFilter(document);
  installNetworkTap(window, (json) => {
    store.upsertMany(withoutViewer(extractRelationships(json)));
  });

  const start = (): void => {
    installDecorator({
      document,
      store,
      readReact: (article) => withoutViewer(relationshipsFromReact(article)),
    });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}
