# Contributing to Devistic QR

Thanks for helping improve a small, private QR tool. The goal is a page that stays useful, accessible, and entirely in the browser.

## Local setup

```bash
npm install
npm run dev
```

The dev server uses the GitHub Pages base path, so open `http://localhost:5173/devistic-qr/`.

```bash
npm test
npm run lint
npm run build
```

## What to keep true

- No backend, analytics, trackers, or remote fonts. Data belongs in `localStorage` on the device.
- Payload builders, parsers, history, and import/export stay pure functions with unit tests. UI code calls them; it does not reimplement the formats.
- New QR content types should round-trip: build a payload, parse it, and restore the form.
- Meet WCAG 2.2 AA: visible focus, keyboard access, and text contrast. Use the Devistic tokens in `src/index.css` rather than one-off colors.
- Do not add a service that stores or redirects QR contents. Codes stay static.

## Pull requests

Describe what changed, how you tested it, and any accessibility or privacy effect. A screenshot helps for visual changes. `npm test`, `npm run lint`, and `npm run build` should pass.

## Reporting issues

Use the bug and feature templates. Security reports can be opened as a private advisory on the repository, or sent through the [GitHub profile](https://github.com/devistic-asim).
