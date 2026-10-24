# Salon DuBois website

The static website for Salon DuBois (Litchfield, CT), hosted on Cloudflare Pages. It replaces the old Wix site at salondubois.net.

## Everyday edits

Almost everything that changes lives in **`site.json`**: phone, address, hours, reviews, social links, the new-client offer, tracking IDs and the whole price list. Edit it, commit, and Cloudflare rebuilds the site in about a minute.

| To change… | Edit |
|---|---|
| Hours, phone, address | `site.json` → `hours`, `phone`, `address` |
| Prices | `site.json` → `prices` (set `"from": true` for "starting at" prices) |
| Reviews / Google star rating | `site.json` → `reviews`, `rating` |
| Facebook / Instagram icons | `site.json` → `social` (empty values are hidden) |
| Online booking button | `site.json` → `bookingUrl` (empty means call-only) |
| Page text | `src/pages/*.html` |
| Header / footer | `src/partials/header.html`, `footer.html` |
| Styles | `public/assets/css/site.css` |
| Photos | `public/assets/img/` |

Template tokens used in pages: `{{site.phone}}`, `{{hours}}`, `{{hoursShort}}`, `{{prices}}` or `{{prices:color,highlights}}`, `{{reviews}}`, `{{review:0}}`, `{{bookButtons}}`, `{{bookCta:Heading}}`, `{{mapEmbed}}`, `{{social}}`.

## Build and preview locally

```sh
node build.mjs            # writes dist/
npx http-server dist      # preview at http://localhost:8080
```

No npm dependencies are needed, just Node 18 or newer.

## Cloudflare Pages settings

- **Framework preset:** None
- **Build command:** `node build.mjs`
- **Build output directory:** `dist`
- **Environment variable:** `NODE_VERSION` = `20`

`public/_redirects` sends the old Wix URLs (`/blank-bs5hg`, `/blank-nyl51`, `/perm`) to the new pages with 301s, so existing Google results keep working.

## Tracking (fill in `site.json` → `tracking`)

- `cloudflareAnalyticsToken`: from Cloudflare → Web Analytics.
- `googleAdsId` (e.g. `AW-123456789`): adds the Google Ads tag to every page.
- `googleAdsCallConversionLabel`: counts taps on any "Call" or "Book online" button as a conversion.

## Pages

| URL | Purpose |
|---|---|
| `/` | Home |
| `/womens-hair/` | Women's cuts & styling (ad landing page) |
| `/mens-hair/` | Men's cuts, beard, gray blending (ad landing page) |
| `/color/` | Color & highlights (ad landing page) |
| `/perms-treatments/` | Perms, waves & treatments |
| `/skin-care/` | Skin care |
| `/products/` | Retail products |
| `/prices/` | Full price list |
| `/about/` | About Alan & the salon |
| `/contact/` | Phone, hours, map |
