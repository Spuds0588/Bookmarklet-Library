# QR reader

The hosted result window for **🔎 Scan QR from screen**. The bookmarklet freezes a screen region, posts the cropped PNG to this page with `postMessage`, and the page decodes it here.

It is opened from the bookmarklet, not used as a standalone page. Opened directly it says so and offers no capture button: the screen permission belongs to the page that ran the bookmarklet.

## What it does

- Accepts one image message from `window.opener`, and ignores messages from any other window.
- Decodes with [jsQR 1.4.0](https://github.com/cozmo/jsQR), bundled as `jsqr.js`. The page makes no network request.
- Tries the image as sent, then twice and three times larger with nearest-neighbour scaling. `inversionAttempts: "attemptBoth"` covers light-on-dark codes.
- Enables **Open in this page** and **Open in a new tab** only when the decoded text is an `http` or `https` URL. **Copy to clipboard** works for any text.
- Sends the open-in-this-page URL back to the bookmarklet, which validates the source, origin and scheme before navigating.

Nothing is uploaded. The image travels between two windows in the same browser, and this page has no server API. It is `noindex`.

## License

`jsqr.js` is jsQR 1.4.0 by Cosmo Wolfe, Apache-2.0. The full license is in [LICENSE-jsqr.txt](LICENSE-jsqr.txt). The only change is the attribution line at the top of the bundle.

## Tests

`tests/qr-reader.test.mjs` loads the bundle in Node and decodes matrices from the catalog's QR encoder: a URL, an inverted code, UTF-8 text, and a blank image. The headless capture run drives the bookmarklet's selection and crop, then asserts this page shows the sample URL and enabled actions.
