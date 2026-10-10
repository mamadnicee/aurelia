# STRIDE — bilingual shoe store

A responsive, Farsi/English static storefront with a dark editorial identity, oversized product sections, CSS-built 3D shoe artwork, scroll reveals, product filtering, and a browser-local demo bag. The pages are plain HTML/CSS/JavaScript and need no build step.

## Project files

- `index.html` — landing page and collections
- `shop.html` — filterable product listing
- `product.html` — product detail and size/color selectors
- `404.html` — branded not-found page (Cloudflare Pages serves this automatically)
- `css/` and `js/` — styles, motion, and interactions
- `_headers` and `_redirects` — Cloudflare Pages configuration

## Run locally

Open `index.html` in a browser, or serve this directory with any static HTTP server. For example, with Python installed:

```sh
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploy with GitHub + Cloudflare Pages

1. Create a GitHub repository and add the **contents** of this project directory at the repository root (so `index.html`, `_headers`, and `_redirects` are at the root).
2. Push the files to the repository's default branch.
3. In Cloudflare, open **Workers & Pages → Create application → Pages → Connect to Git** and authorize/select the repository.
4. Configure the deployment: choose **None** (no framework preset), leave the build command empty, and set the build output directory to `/` (the repository root, sometimes entered as `.` depending on the dashboard UI).
5. Save and deploy. Cloudflare Pages will publish the static files, apply `_headers`/`_redirects`, and use `404.html` for missing routes. Subsequent pushes to the production branch deploy automatically; other branches can be preview deployments.
6. Optionally attach a custom domain under the Pages project's **Custom domains** settings.

### Direct upload alternative

Create a Pages project using **Direct Upload** and upload the project directory (or the provided ZIP contents). Upload the extracted files so the HTML pages and Cloudflare configuration files are at the published root; do not publish a ZIP nested inside another directory.

## Notes

- This is a front-end/demo storefront. The bag is stored in that browser's `localStorage`; checkout, inventory, payments, and order handling are not connected to a backend.
- The newsletter form currently shows a demo confirmation and does not submit/store email addresses.
- Fonts are loaded from Google Fonts when a visitor has network access; system sans-serif fallbacks are provided. The shoe artwork and animations are CSS/JavaScript; no GSAP or Three.js dependency/build is required by the supplied pages.
- The `/shop`, `/product`, and `/home` clean paths redirect to the existing `.html` pages. The normal root page is `index.html`.
