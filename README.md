# Nod

![Nod wordmark beside overlapping blue and coral glass circles](assets/nod-banner.webp)

Nod shows who follows you on X. It adds a small label beside the author's name
on posts in your timeline, replies, search results, and profile feeds.

| Label | What it means |
| --- | --- |
| **Mutual** | You follow each other. |
| **Follows you** | The author follows you. You don't follow them. |
| **Doesn't follow you** | The author doesn't follow you. |

Hover over **Doesn't follow you** to see whether you follow the author.
Your own posts stay unlabeled, as do posts where X hasn't supplied a follow
status. Labels follow X's light, dim, and dark themes and use English or Italian
according to your X language setting.

## Download a release

Get the [latest release](https://github.com/icoretech/nod/releases/latest).
Each release includes standalone downloads:

- **[Chrome ZIP](https://github.com/icoretech/nod/releases/latest/download/nod-chrome.zip)**
  — extract the archive to a folder you will keep. In Chrome's extensions page,
  enable **Developer mode**, choose **Load unpacked**, and select that folder.
- **[Unsigned Firefox ZIP](https://github.com/icoretech/nod/releases/latest/download/nod-firefox-unsigned.zip)**
  — extract it, open `about:debugging#/runtime/this-firefox` in Firefox or
  LibreWolf, choose **Load Temporary Add-on**, and select `manifest.json`.
  For a persistent installation in standard Firefox, install `nod-firefox.xpi`
  from the release when the signed download is available.
- **[Reviewer source](https://github.com/icoretech/nod/releases/latest/download/nod-review-source.zip)**
  — rebuild the extension with the instructions below. To verify the downloads,
  put all three ZIPs and the release's `SHA256SUMS` in the same directory and
  run `shasum -a 256 -c SHA256SUMS`.

## Install from source

From the repository root, use Node.js 24 or newer and npm:

```sh
npm ci
npm run build
```

- **Chrome, Brave, Edge, or Arc:** open the browser's extensions page, enable
  **Developer mode**, choose **Load unpacked**, and select `dist/chrome/`.
- **Firefox or LibreWolf:** open `about:debugging#/runtime/this-firefox`,
  choose **Load Temporary Add-on**, and select `dist/firefox/manifest.json`.
  The temporary installation lasts until you restart the browser.

Open or reload an X tab while signed in to see the labels. For a persistent
Firefox installation, use a Mozilla-signed XPI. LibreWolf profiles already
configured to accept unsigned add-ons can also install the Firefox ZIP from
`npm run package` via **Install Add-on From File** in `about:addons`.

## How it works

X includes follow relationships in the data it sends to your browser. Nod reads
the `followed_by` and `following` fields from those responses, or from a
rendered post when the response was missed. It keeps the relationships in memory
for the current tab and updates the labels as you scroll.

The extension runs only on `https://x.com/*`. It makes no network requests of
its own and has no accounts, analytics, or persistent storage.
[Privacy policy](https://icorete.ch/nod/privacy/)

## Development

```sh
npm test
npm run biome:ci
npm run package
npm run web-ext:lint
```

`npm run biome:ci` checks formatting, lint, and TypeScript.
`npm run package` builds both browsers and writes their ZIPs to
`artifacts/chrome/` and `artifacts/firefox/`.

If X changes its markup or data format, start with the
[author selectors](src/x/selectors.ts),
[relationship parser](src/core/relationships.ts),
[network observer](src/x/network-tap.ts), or
[rendered-post fallback](src/x/react-props.ts).

## Releases

CI runs on pull requests and pushes to `main` using GitHub-hosted Linux runners.
Merging the release-please version PR creates a version tag and a draft
release. The release workflow checks out that tag, runs the tests, builds and
validates the packages, and publishes the draft with its downloads. To retry
an interrupted draft, run the **Release** workflow on `main` with its tag.
Mozilla signing and store submissions are separate steps.

After Mozilla approves a listed version, run **Attach signed Firefox XPI**
on `main` with the same tag. It verifies Mozilla's SHA-256 digest and compares
the extension contents with the published Firefox ZIP before attaching the XPI.

## Build for AMO reviewers

From the source archive root, run `npm ci` followed by `npm run build` with
Node.js 24 or newer. The lockfile pins the dependencies. Vite produces an
unminified `content.js`, and the build assembles the Firefox manifest, script,
stylesheet, and icons in `dist/firefox/`.

## License

[MIT](LICENSE). Nod is an independent project and is unaffiliated with X Corp.
