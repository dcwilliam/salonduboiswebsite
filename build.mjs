// Salon DuBois site builder. No dependencies: run `node build.mjs`.
// Reads site.json + src/, writes the finished static site to dist/.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, cpSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, "dist");
const site = JSON.parse(readFileSync(join(root, "site.json"), "utf8"));
const read = (p) => readFileSync(join(root, p), "utf8");

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const get = (obj, path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);

// ---------- helpers ----------
const fmt12 = (t) => {
  const [h, m] = t.split(":").map(Number);
  const hr = ((h + 11) % 12) + 1;
  return m ? `${hr}:${String(m).padStart(2, "0")}` : `${hr}`;
};
const ampm = (t) => (Number(t.split(":")[0]) < 12 ? "am" : "pm");
const range = (d) => `${fmt12(d.open)}${ampm(d.open) === ampm(d.close) ? "" : ampm(d.open)}–${fmt12(d.close)}${ampm(d.close)}`;
const addr = site.address;
const addrLine = `${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}`;

function hoursTable() {
  const order = [3, 4, 5, 6, 0, 1, 2]; // start the week on an open day (Wed)
  const rows = order.map((i) => {
    const d = site.hours[i];
    return `<tr data-day="${i}"><th scope="row">${d.day}</th><td>${d.open ? range(d) : "Closed"}</td></tr>`;
  }).join("");
  return `<table class="hours">${rows}</table>${site.hoursNote ? `<p class="hours-note">${esc(site.hoursNote)}</p>` : ""}`;
}

function hoursShort() {
  // groups consecutive days with identical hours, e.g. "Wed & Fri 9–6pm · Thu 9–8pm · Sat 9–3pm"
  const open = site.hours.map((d, i) => ({ ...d, i })).filter((d) => d.open);
  const byRange = new Map();
  for (const d of open) {
    const r = range(d);
    if (!byRange.has(r)) byRange.set(r, []);
    byRange.get(r).push(d.day.slice(0, 3));
  }
  return [...byRange].map(([r, days]) => `${days.join(" & ")} ${r}`).join(" · ");
}

function priceSection(sec) {
  const items = sec.items.map((it) => {
    const price = /^\d/.test(it.price) ? `${it.from ? '<span class="from">from</span> ' : ""}$${esc(it.price)}` : esc(it.price);
    return `<li class="price-item${it.sub ? " indent" : ""}"><span class="pi-name">${esc(it.name)}</span><span class="pi-dots" aria-hidden="true"></span><span class="pi-price">${price}</span>${it.note ? `<span class="pi-note">${esc(it.note)}</span>` : ""}</li>`;
  }).join("");
  return `<section class="price-group" id="${sec.id}"><h3>${esc(sec.title)}</h3><ul class="price-list">${items}</ul>${sec.footnote ? `<p class="price-foot">${esc(sec.footnote)}</p>` : ""}</section>`;
}
function prices(ids) {
  const secs = ids ? ids.split(",").map((id) => site.prices.find((s) => s.id === id.trim())).filter(Boolean) : site.prices;
  return `<div class="price-menu">${secs.map(priceSection).join("")}</div>`;
}

function review(i) {
  const r = site.reviews[i];
  if (!r) return "";
  return `<figure class="review"><blockquote>“${esc(r.text)}”</blockquote><figcaption>— ${esc(r.author)}</figcaption></figure>`;
}
function ratingBadge() {
  const r = site.rating;
  if (!r || !r.value) return "";
  const inner = `<span class="stars" aria-hidden="true">★★★★★</span> <strong>${esc(r.value)}</strong> on Google${r.count ? ` · ${esc(r.count)} reviews` : ""}`;
  return r.reviewsUrl ? `<a class="rating" href="${esc(r.reviewsUrl)}" rel="noopener" target="_blank">${inner}</a>` : `<p class="rating">${inner}</p>`;
}
function reviews() {
  return `<div class="reviews">${ratingBadge()}<div class="review-grid">${site.reviews.map((_, i) => review(i)).join("")}</div></div>`;
}

function bookButtons(extraClass = "") {
  const call = `<a class="btn btn-call ${extraClass}" href="tel:${site.phoneE164}" data-call><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>Call ${esc(site.phone)}</a>`;
  const book = site.bookingUrl ? `<a class="btn btn-ghost ${extraClass}" href="${esc(site.bookingUrl)}" rel="noopener" data-book>Book online</a>` : "";
  return call + book;
}
function bookCta(heading) {
  const offer = site.newClientOffer ? `<p class="offer">${esc(site.newClientOffer)}</p>` : "";
  return `<aside class="cta"><div class="cta-inner"><h2>${esc(heading || "New clients always welcome")}</h2>${offer}<p>Appointments by phone. ${esc(hoursShort())}.</p><div class="cta-buttons">${bookButtons()}</div></div></aside>`;
}

function socialLinks() {
  const s = site.social || {};
  const links = [];
  if (s.facebook) links.push(`<a href="${esc(s.facebook)}" rel="noopener" target="_blank" aria-label="Salon DuBois on Facebook"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H8v4h2v8h4v-8h3l1-4h-4V8z"/></svg></a>`);
  if (s.instagram) links.push(`<a href="${esc(s.instagram)}" rel="noopener" target="_blank" aria-label="Salon DuBois on Instagram"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zM12 2c-2.7 0-3 0-4.1.1C4.4 2.2 2.2 4.4 2.1 7.9 2 9 2 9.3 2 12s0 3 .1 4.1c.1 3.5 2.3 5.7 5.8 5.8 1.1.1 1.4.1 4.1.1s3 0 4.1-.1c3.5-.1 5.7-2.3 5.8-5.8.1-1.1.1-1.4.1-4.1s0-3-.1-4.1c-.1-3.5-2.3-5.7-5.8-5.8C15 2 14.7 2 12 2z"/></svg></a>`);
  return links.length ? `<div class="social">${links.join("")}</div>` : "";
}

function jsonLd() {
  const openingHoursSpecification = site.hours.filter((d) => d.open).map((d) => ({
    "@type": "OpeningHoursSpecification", dayOfWeek: d.day, opens: d.open, closes: d.close,
  }));
  const data = {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: site.name,
    url: site.siteUrl,
    telephone: site.phoneE164,
    image: `${site.siteUrl}/assets/img/og-image.jpg`,
    logo: `${site.siteUrl}/assets/img/logo-mark.png`,
    priceRange: "$$",
    address: { "@type": "PostalAddress", streetAddress: addr.street, addressLocality: addr.city, addressRegion: addr.state, postalCode: addr.zip, addressCountry: "US" },
    hasMap: site.mapsUrl,
    openingHoursSpecification,
    sameAs: Object.values(site.social || {}).filter(Boolean),
  };
  if (site.rating?.value && site.rating?.count) data.aggregateRating = { "@type": "AggregateRating", ratingValue: site.rating.value, reviewCount: site.rating.count };
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

function trackingHead() {
  const t = site.tracking || {};
  let s = "";
  if (t.googleAdsId) {
    s += `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(t.googleAdsId)}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${esc(t.googleAdsId)}');</script>`;
  }
  return s;
}
function trackingBody() {
  const t = site.tracking || {};
  let s = "";
  if (t.googleAdsId && t.googleAdsCallConversionLabel) {
    s += `<script>document.addEventListener('click',function(e){var a=e.target.closest('[data-call],[data-book]');if(a&&window.gtag){gtag('event','conversion',{send_to:'${esc(t.googleAdsId)}/${esc(t.googleAdsCallConversionLabel)}'});}});</script>`;
  }
  if (t.cloudflareAnalyticsToken) {
    s += `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${esc(t.cloudflareAnalyticsToken)}"}'></script>`;
  }
  return s;
}

// ---------- page assembly ----------
const nav = [
  { href: "/", label: "Home" },
  { label: "Services", children: [
    { href: "/womens-hair/", label: "Women's Hair" },
    { href: "/mens-hair/", label: "Men's Hair" },
    { href: "/color/", label: "Color & Highlights" },
    { href: "/perms-treatments/", label: "Perms & Treatments" },
    { href: "/skin-care/", label: "Skin Care" },
    { href: "/products/", label: "Products" },
  ] },
  { href: "/prices/", label: "Prices" },
  { href: "/about/", label: "About" },
  { href: "/contact/", label: "Contact" },
];
function navHtml(current) {
  const item = (n) => {
    if (n.children) {
      const active = n.children.some((c) => c.href === current);
      return `<li class="has-sub${active ? " active" : ""}"><button type="button" class="nav-link" aria-expanded="false">${n.label}<svg aria-hidden="true" viewBox="0 0 12 12" width="10" height="10"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button><ul class="sub">${n.children.map((c) => `<li><a href="${c.href}"${c.href === current ? ' aria-current="page"' : ""}>${c.label}</a></li>`).join("")}</ul></li>`;
    }
    return `<li${n.href === current ? ' class="active"' : ""}><a class="nav-link" href="${n.href}"${n.href === current ? ' aria-current="page"' : ""}>${n.label}</a></li>`;
  };
  return `<ul class="nav-list">${nav.map(item).join("")}</ul>`;
}

const tokens = {
  hours: hoursTable,
  hoursShort,
  prices,
  reviews,
  review: (i) => review(Number(i)),
  rating: ratingBadge,
  bookButtons: () => bookButtons(),
  bookCta: (h) => bookCta(h),
  social: socialLinks,
  addressLine: () => esc(addrLine),
  year: () => String(new Date().getFullYear()),
  credit: () => (site.credit?.text ? ` · ${site.credit.url ? `<a href="${esc(site.credit.url)}" rel="noopener">${esc(site.credit.text)}</a>` : esc(site.credit.text)}` : ""),
  mapEmbed: () => `<iframe class="map" title="Map to Salon DuBois" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${encodeURIComponent(site.mapsEmbedQuery)}&output=embed"></iframe>`,
};

function render(tpl, ctx) {
  // partials first, then tokens; repeat so partials can contain tokens
  for (let pass = 0; pass < 3; pass++) {
    tpl = tpl.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => read(`src/partials/${name}.html`));
  }
  return tpl.replace(/\{\{\s*([\w.]+)(?::([^}]*))?\s*\}\}/g, (m, key, arg) => {
    if (key.startsWith("site.")) return esc(get(site, key.slice(5)));
    if (key.startsWith("page.")) return get(ctx, key.slice(5)) ?? "";
    if (tokens[key]) return tokens[key](arg);
    throw new Error(`Unknown template token ${m} in ${ctx.src}`);
  });
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, "public"), out, { recursive: true });

const pages = [];
for (const file of readdirSync(join(root, "src/pages")).filter((f) => f.endsWith(".html"))) {
  let src = read(`src/pages/${file}`);
  const m = src.match(/^<!--meta\s+([\s\S]*?)-->\s*/);
  if (!m) throw new Error(`${file} is missing its <!--meta {...} --> header`);
  const meta = JSON.parse(m[1]);
  src = src.slice(m[0].length);
  const ctx = { ...meta, src: file, canonical: site.siteUrl + meta.path };
  const body = render(src, ctx);
  const html = render(read("src/partials/layout.html"), { ...ctx, body, nav: navHtml(meta.path), jsonLd: meta.path === "/" || meta.path === "/contact/" ? jsonLd() : "", trackingHead: trackingHead(), trackingBody: trackingBody() });
  const dest = meta.path === "/404" ? join(out, "404.html") : join(out, meta.path, "index.html");
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, html);
  if (!meta.noindex) pages.push(meta.path);
}

writeFileSync(join(out, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.sort().map((p) => `  <url><loc>${site.siteUrl}${p}</loc></url>`).join("\n")}
</urlset>
`);
writeFileSync(join(out, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${site.siteUrl}/sitemap.xml\n`);
console.log(`Built ${pages.length} pages → dist/`);
