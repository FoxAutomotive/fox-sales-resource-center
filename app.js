import {
  searchVehicles,
  comparisonRows,
  eligibleOptions,
  resolveCell,
} from "./lib.js";

const $ = (selector) => document.querySelector(selector);
const escape = (value = "") =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const icons = {
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  book: '<path d="M12 5v15M3 4c3-1 6-1 9 1 3-2 6-2 9-1v15c-3-1-6-1-9 1-3-2-6-2-9-1z"/>',
  compare:
    '<path d="M7 3v18M17 3v18M3 7h8M13 17h8"/><circle cx="7" cy="7" r="2"/><circle cx="17" cy="17" r="2"/>',
  print:
    '<path d="M6 8V3h12v5M6 17H3V8h18v9h-3M6 14h12v7H6z"/><path d="M17 11h1"/>',
  shield:
    '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  car: '<path d="m5 7 2-4h10l2 4 2 3v8H3v-8zM3 10h18M7 14h1m8 0h1M6 18v3m12-3v3"/>',
  external: '<path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
};
const icon = (name) =>
  `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.book}</svg>`;
const marks = {
  chevrolet:
    '<svg viewBox="0 0 90 32" aria-hidden="true"><path d="M28 6h29v7h27l-5 13H57v6H28v-6H2l5-13h21z" fill="#c7a55c" stroke="#655c49" stroke-width="1.5"/></svg>',
  toyota:
    '<svg viewBox="0 0 70 48" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><ellipse cx="35" cy="24" rx="31" ry="20"/><ellipse cx="35" cy="24" rx="12" ry="20"/><ellipse cx="35" cy="14" rx="24" ry="10"/></svg>',
  volkswagen:
    '<svg viewBox="0 0 52 52" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="26" cy="26" r="23"/><path d="m15 7 11 22L37 7M6 19l12 26 8-15 8 15 12-26"/></svg>',
};
let catalog, features;
let selected = [];
let searchTimer;
let focusAfterRoute = false;
const brandName = (id) => catalog.brands.find((b) => b.id === id)?.name || id;
const mark = (id) => `<span class="brand-mark ${id}">${marks[id] || ""}</span>`;
const date = (d) =>
  d
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(new Date(`${d}T12:00:00Z`))
    : "Not yet verified";
const statusBadge = (vehicle) =>
  vehicle.status === "verified"
    ? '<span class="badge verified">Source verified</span>'
    : '<span class="badge pending">Awaiting verification</span>';
const sourceLinks = (v) =>
  v.sources
    .map(
      (s) =>
        `<li><a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.title)} ${icon("external")}</a><span>${s.kind === "verified" ? `Reviewed ${date(s.checkedAt)}` : "Research target · not reviewed"}</span></li>`,
    )
    .join("");

function nav(active) {
  const links = [
    ["/", "Home"],
    ["/brand/chevrolet", "Chevrolet"],
    ["/brand/toyota", "Toyota"],
    ["/brand/volkswagen", "Volkswagen"],
    ["/compare", "Compare Vehicles"],
    ["/specials", "Manager’s Specials"],
  ];
  $("#navigation").innerHTML =
    links
      .map(
        ([path, label], i) =>
          `<a href="#${path}" ${active === path ? 'aria-current="page"' : ""}>${i === 0 ? icon("grid") : i === 4 ? icon("compare") : ""}${label}${i === 5 ? '<span class="soon-label">SOON</span>' : ""}</a>`,
      )
      .join("") +
    '<a class="nav-help" href="#/features">Equipment glossary ↗</a>';
}
function breadcrumbs(parts) {
  return `<div class="breadcrumbs"><a href="#/">Home</a>${parts.map((p) => `${icon("chevron")}${p.href ? `<a href="${p.href}">${escape(p.label)}</a>` : `<span>${escape(p.label)}</span>`}`).join("")}</div>`;
}
function searchForm({ brand = "", year = "", query = "" } = {}) {
  return `<form id="search-form" class="search-form" role="search"><div class="search-input-wrap">${icon("search")}<label class="sr-only" for="vehicle-search">Search models, trims, or equipment</label><input id="vehicle-search" type="search" value="${escape(query)}" placeholder="Try “RAV4”, “2026”, or “heated seats”" autocomplete="off"><kbd>/</kbd></div><div class="search-controls"><div><label for="brand-filter">Manufacturer</label><select id="brand-filter"><option value="">All manufacturers</option>${catalog.brands.map((b) => `<option value="${b.id}" ${brand === b.id ? "selected" : ""}>${b.name}</option>`).join("")}</select></div><div><label for="year-filter">Model year</label><select id="year-filter"><option value="">All model years</option>${catalog.years.map((y) => `<option ${String(year) === String(y) ? "selected" : ""}>${y}</option>`).join("")}</select></div><button class="button primary" type="submit">Search library ${icon("arrow")}</button></div></form>`;
}
function vehicleCard(v) {
  return `<article class="vehicle-card"><div class="vehicle-card-top"><span class="eyebrow">${v.year} · ${escape(brandName(v.brand))}</span>${mark(v.brand)}</div><h3><a href="#/model/${v.id}">${escape(v.model)} ${icon("arrow")}</a></h3><p>${escape(v.category)} <span>·</span> U.S. model guide</p><div class="card-line"></div><div class="vehicle-card-bottom">${statusBadge(v)}<a href="#/model/${v.id}" aria-label="Open ${v.year} ${escape(v.model)} guide">View guide ${icon("chevron")}</a></div></article>`;
}
function home() {
  nav("/");
  const verifiedCount = catalog.vehicles.filter(
    (v) => v.status === "verified",
  ).length;
  $("#main").innerHTML =
    `<section class="hero"><div class="hero-inner"><div class="hero-copy"><div class="eyebrow"><span class="red-line"></span> THE FOX AUTOMOTIVE KNOWLEDGE LIBRARY</div><h1>Know the vehicle.<br><span>Build the confidence.</span></h1><p>Your everyday reference for models, trims, and technology.<br class="desktop-break"> Three brands. One place to find the details that matter.</p><div class="hero-tags"><span>${icon("book")} Model &amp; trim guides</span><span>${icon("compare")} Side-by-side comparisons</span><span>${icon("print")} Desk-ready references</span></div></div><aside class="axel-card"><div><span class="eyebrow">A LITTLE KNOWLEDGE.<br>A LOT OF CONFIDENCE.</span><p>Ready for your next<br>customer conversation.</p><span class="axel-signature">The Fox way.</span></div></aside></div></section>
 <div class="content home-content"><section class="search-panel" aria-labelledby="search-title"><div class="section-inline"><h2 id="search-title">What are you looking for?</h2><span class="muted">2026 &amp; 2027 model-year library</span></div>${searchForm()}<div class="popular">QUICK FINDS <a href="#/model/2026-toyota-rav4">RAV4 ${icon("arrow")}</a><a href="#/model/2026-volkswagen-tiguan">Tiguan ${icon("arrow")}</a><a href="#/model/2026-chevrolet-equinox">Equinox ${icon("arrow")}</a><a href="#/features">Technology explained ${icon("arrow")}</a></div></section>
 <section class="section-block" aria-labelledby="brands-title"><div class="section-heading"><div><span class="eyebrow">START WITH A BRAND</span><h2 id="brands-title">Three brands. Your whole showroom.</h2></div><span class="muted">U.S. retail vehicles</span></div><div class="brand-grid">${catalog.brands.map((b) => `<a class="manufacturer-card ${b.id}" href="#/brand/${b.id}">${mark(b.id)}<div><h3>${b.name}</h3><p>Explore models &amp; trim guides</p></div><span class="circle-arrow">${icon("arrow")}</span></a>`).join("")}</div></section>
 <section class="section-block" aria-labelledby="guides-title"><div class="section-heading"><div><span class="eyebrow">THE PRODUCT DESK</span><h2 id="guides-title">Start with these model guides</h2></div><a class="text-link" href="#/search">Browse the library ${icon("arrow")}</a></div><div class="vehicle-grid">${catalog.vehicles.map(vehicleCard).join("")}</div><p class="coverage-note">${icon("shield")} Designed for source-backed information. ${verifiedCount ? `${verifiedCount} verified guides available.` : "Initial guides are open; equipment research is awaiting official source review."} <a href="#/about">Our accuracy standard</a></p></section>
 <section class="tools-grid" aria-label="Sales tools"><a href="#/compare" class="tool-card"><span class="tool-icon">${icon("compare")}</span><div><span class="eyebrow">SPOT THE DIFFERENCES</span><h3>Compare with confidence</h3><p>See meaningful equipment differences across verified vehicles and trims.</p><span class="text-link">Open comparison tool ${icon("arrow")}</span></div></a><a href="#/features" class="tool-card"><span class="tool-icon">${icon("book")}</span><div><span class="eyebrow">MAKE THE TECHNOLOGY SIMPLE</span><h3>Know what the feature does</h3><p>Plain-language explanations, customer benefits, and limitations.</p><span class="text-link">Explore the equipment glossary ${icon("arrow")}</span></div></a></section>
 <section class="library-status"><span class="status-symbol">${icon("clock")}</span><div><h3>A growing library. A consistent standard.</h3><p>We’re building the 2026 and 2027 reference library, one verified model at a time. Unconfirmed equipment is always clearly labeled.</p></div><a href="#/about">How we verify ${icon("arrow")}</a></section></div>`;
  attachSearch();
  loadArtwork();
}
function loadArtwork() {
  if (!catalog.branding?.axel) return;
  const asset = new Image();
  asset.alt = "Axel the Fox, Fox Automotive’s mascot";
  asset.className = "axel-image";
  asset.onload = () => {
    const aside = $(".axel-card");
    if (aside) {
      aside.classList.add("has-artwork");
      aside.prepend(asset);
      aside.querySelector(".axel-monogram")?.remove();
    }
  };
  asset.src = new URL(catalog.branding.axel, import.meta.url).href;
}
function attachSearch() {
  const form = $("#search-form");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    updateSearch(true);
  });
  if (location.hash.startsWith("#/search")) {
    $("#vehicle-search").addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => updateSearch(false), 120);
    });
    ["#brand-filter", "#year-filter"].forEach((s) =>
      $(s).addEventListener("change", () => updateSearch(false)),
    );
  }
}
function updateSearch(navigate) {
  const query = $("#vehicle-search").value.trim();
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if ($("#brand-filter").value) params.set("brand", $("#brand-filter").value);
  if ($("#year-filter").value) params.set("year", $("#year-filter").value);
  const hash = `#/search${params.size ? `?${params}` : ""}`;
  if (navigate && !location.hash.startsWith("#/search")) location.hash = hash;
  else {
    history.replaceState(null, "", hash);
    renderSearchResults({
      query,
      brand: $("#brand-filter").value,
      year: $("#year-filter").value,
    });
  }
}
function searchPage(params) {
  nav("");
  const options = {
    query: params.get("q") || "",
    brand: params.get("brand") || "",
    year: params.get("year") || "",
  };
  $("#main").innerHTML =
    `<div class="content page-content">${breadcrumbs([{ label: "Vehicle library" }])}<div class="page-heading"><span class="eyebrow">FIND YOUR NEXT ANSWER</span><h1>Vehicle library</h1><p>Search models, verified trim names, and confirmed equipment.</p></div><div class="search-panel">${searchForm(options)}</div><div id="search-results"></div></div>`;
  attachSearch();
  renderSearchResults(options);
}
function renderSearchResults(options) {
  const { vehicles, glossary } = searchVehicles(catalog, features, options);
  $("#search-results").innerHTML =
    `<div class="results-heading"><h2 aria-live="polite">Model guides <span class="count">${vehicles.length}</span></h2><button class="button small secondary" id="clear-filters">Clear filters</button></div><p class="muted search-note">Feature and trim searches match verified data only. Unreviewed guides are searchable by manufacturer, model, and year.</p>${vehicles.length ? `<div class="vehicle-grid">${vehicles.map(vehicleCard).join("")}</div>` : `<div class="empty-state">${icon("search")}<h3>No matching guides yet</h3><p>Try a model name or remove a filter. ${options.year === "2027" ? escape(catalog.coverageNotes["2027"]) : "A feature search returning no results does not mean the feature is unavailable; it may not yet be verified."}</p><a href="#/search" class="text-link">Browse all available guides ${icon("arrow")}</a></div>`}${glossary.length && options.query ? `<section class="section-block"><h2>Equipment glossary <span class="count">${glossary.length}</span></h2><p class="muted">General explanations, not evidence of model-specific availability.</p>${featureCards(glossary)}</section>` : ""}`;
  $("#clear-filters").onclick = () => {
    $("#vehicle-search").value = "";
    $("#brand-filter").value = "";
    $("#year-filter").value = "";
    updateSearch(false);
  };
}
function brandPage(id, params) {
  const b = catalog.brands.find((b) => b.id === id);
  if (!b) return notFound();
  nav(`/brand/${id}`);
  const year = params.get("year") || "2026";
  const vehicles = catalog.vehicles.filter(
    (v) => v.brand === id && String(v.year) === year,
  );
  $("#main").innerHTML =
    `<div class="content page-content">${breadcrumbs([{ label: b.name }])}<div class="brand-page-heading">${mark(id)}<div><span class="eyebrow">MANUFACTURER LIBRARY</span><h1>${b.name}</h1><p>Model guides, trim differences, and equipment details.</p></div></div><div class="year-tabs" aria-label="Model year">${catalog.years.map((y) => `<a href="#/brand/${id}?year=${y}" ${String(y) === year ? 'aria-current="page"' : ""}>${y} models</a>`).join("")}</div><div class="section-heading"><h2>${escape(year)} model guides</h2><span class="muted">${vehicles.length} ${vehicles.length === 1 ? "guide" : "guides"} in the library</span></div>${vehicles.length ? `<div class="vehicle-grid">${vehicles.map(vehicleCard).join("")}</div>` : `<div class="empty-state">${icon("book")}<h2>Model-year research in progress</h2><p>${escape(catalog.coverageNotes[year] || "No verified guides are available for this model year.")}</p><a href="${b.sourceUrl}" target="_blank" rel="noopener noreferrer" class="text-link">Official ${b.name} website ${icon("external")}</a></div>`}<div class="notice">${icon("shield")} ${escape(catalog.coverageNotes[year] || "")} Do not infer availability from a previous model year.</div><section class="section-block"><div class="section-heading"><h2>${b.name} technology</h2><a class="text-link" href="#/features">Full glossary ${icon("arrow")}</a></div>${featureCards(features.filter((f) => f.brand === id))}</section></div>`;
}
function featureCards(items) {
  return `<div class="feature-grid">${items.map((f) => `<details class="feature-card" id="${f.id}"><summary><span><span class="eyebrow">${escape(brandName(f.brand))} · ${escape(f.category)}</span><strong>${escape(f.name)}</strong></span><span class="expand-icon" aria-hidden="true">+</span></summary><div class="feature-body"><p>${escape(f.summary)}</p><h4>How it works</h4><p>${escape(f.how)}</p><h4>Why a customer might value it</h4><p>${escape(f.value)}</p><h4>Know the limits</h4><p>${escape(f.limitations)}</p><div class="editorial-note">${f.verifiedAt ? `Reviewed ${date(f.verifiedAt)}` : "Editorial overview · source review pending"}. This explanation does not establish availability on any model or trim.</div><a class="text-link" href="${escape(f.sourceUrl)}" target="_blank" rel="noopener noreferrer">Manufacturer reference ${icon("external")}</a></div></details>`).join("")}</div>`;
}
function glossaryPage(params) {
  nav("");
  const q = params.get("q") || "";
  $("#main").innerHTML =
    `<div class="content page-content">${breadcrumbs([{ label: "Equipment glossary" }])}<div class="page-heading"><span class="eyebrow">THE LANGUAGE OF THE SHOWROOM</span><h1>Technology, explained.</h1><p>What it does. Why it matters. Where its limits are.</p></div><div class="notice">These general editorial explanations are awaiting manufacturer-source review. Always check the exact model year, system version, owner’s manual, and vehicle equipment.</div><label for="feature-search" class="field-label">Find a technology</label><input class="standalone-input" type="search" id="feature-search" placeholder="Search Safety Sense, 4MOTION, Super Cruise…" value="${escape(q)}"><p id="feature-count" class="muted" role="status"></p><div id="feature-results"></div></div>`;
  const render = () => {
    const query = $("#feature-search").value.toLowerCase().trim();
    const items = features.filter((f) =>
      `${f.name} ${brandName(f.brand)} ${f.category} ${f.summary}`
        .toLowerCase()
        .includes(query),
    );
    $("#feature-results").innerHTML = items.length
      ? featureCards(items)
      : '<div class="empty-state"><h2>No matching technologies</h2><p>Try another name or manufacturer.</p></div>';
    $("#feature-count").textContent = `${items.length} explanations`;
    if (query && items.length === 1) $("#feature-results details").open = true;
  };
  $("#feature-search").addEventListener("input", render);
  render();
}
function cellHTML(cell) {
  const labels = {
    standard: "Standard",
    optional: "Optional",
    unavailable: "Unavailable",
    unverified: "Unverified",
  };
  return `<span class="equipment-status ${cell.status}">${labels[cell.status]}</span>${cell.value ? `<span class="cell-value">${escape(cell.value)}</span>` : ""}${cell.conditions ? `<small>${escape(cell.conditions)}</small>` : ""}${
    cell.featureIds?.length
      ? `<span class="cell-features">${cell.featureIds
          .map((id) => features.find((f) => f.id === id))
          .filter(Boolean)
          .map(
            (f) =>
              `<a class="text-link" href="#/features?q=${encodeURIComponent(f.name)}">${escape(f.name)} ⓘ</a>`,
          )
          .join("")}</span>`
      : ""
  }${cell.sourceIds?.length ? `<small class="source-reference">Source: ${cell.sourceIds.map(escape).join(", ")}</small>` : ""}`;
}
function equipmentTable(vehicles, differenceOnly = false, group = "") {
  const rows = comparisonRows(catalog, vehicles, { differenceOnly, group });
  if (!rows.length)
    return '<div class="empty-state compact"><h3>No verified differences in this view</h3><p>Shared and unverified fields are hidden. Show all equipment to see the full reference.</p></div>';
  return `<div class="table-scroll" tabindex="0" role="region" aria-label="Equipment comparison, scroll horizontally"><table class="equipment-table"><thead><tr><th scope="col">Equipment</th>${vehicles.map(({ vehicle: v, trim: t }) => `<th scope="col"><span>${v.year} ${escape(v.model)}</span>${escape(t.name)}${t.configuration ? `<small>${escape(t.configuration)}</small>` : ""}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr><th scope="row"><small>${escape(row.group)}</small>${escape(row.label)}${row.featureId && features.some((f) => f.id === row.featureId) ? `<a href="#/features?q=${encodeURIComponent(features.find((f) => f.id === row.featureId).name)}" class="feature-explain" aria-label="Explain ${escape(row.label)}">ⓘ</a>` : ""}</th>${row.cells.map((c) => `<td>${cellHTML(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
function modelPage(id) {
  const v = catalog.vehicles.find((v) => v.id === id);
  if (!v) return notFound();
  nav(`/brand/${v.brand}`);
  const options = eligibleOptions(catalog).filter((o) => o.vehicle.id === id);
  $("#main").innerHTML =
    `<div class="content page-content model-page">${breadcrumbs([{ label: brandName(v.brand), href: `#/brand/${v.brand}` }, { label: `${v.year} ${v.model}` }])}<div class="model-heading"><div><span class="eyebrow">${escape(brandName(v.brand))} · ${v.year} MODEL GUIDE</span><h1>${escape(v.model)}</h1><p>${escape(v.summary)}</p><div class="model-meta">${statusBadge(v)}<span>Last verification: ${date(v.verifiedAt)}</span></div></div><div class="model-actions"><button class="button primary" id="print-reference">${icon("print")} Print Quick Reference</button>${options.length ? `<a class="button secondary" href="#/compare">${icon("compare")} Compare trims</a>` : ""}</div></div><div class="notice">${icon("shield")} Verify actual equipment against the vehicle’s window sticker. Availability may depend on drivetrain, packages, production date, and region.</div><nav class="section-nav" aria-label="Model sections"><a href="#trim-section" data-scroll="trim-section">Trims &amp; equipment</a><a href="#upgrade-section" data-scroll="upgrade-section">Reasons to upgrade</a><a href="#package-section" data-scroll="package-section">Factory packages</a><a href="#source-section" data-scroll="source-section">Sources &amp; verification</a></nav><section id="trim-section" class="section-block"><div class="section-heading"><div><span class="eyebrow">THE DETAILS THAT MATTER</span><h2>Trim &amp; equipment reference</h2></div></div><div class="legend">${["standard", "optional", "unavailable", "unverified"].map((s) => `<span class="equipment-status ${s}">${s[0].toUpperCase() + s.slice(1)}</span>`).join("")}</div>${options.length ? `<div class="table-controls"><label><input type="checkbox" id="model-differences" checked> Show verified differences only</label><div class="category-control"><label for="model-group">Category</label><select id="model-group"><option value="">All categories</option>${[...new Set(catalog.fields.map((f) => f.group))].map((g) => `<option>${g}</option>`).join("")}</select></div></div><div id="model-equipment">${equipmentTable(options, true)}</div>` : `<div class="empty-state"><span class="empty-emblem">${icon("book")}</span><h3>Accuracy comes before a filled-in table.</h3><p>Trim structure and equipment are awaiting official ${v.year} ${escape(v.model)} documentation. No specifications have been carried over from another year.</p><a class="text-link" href="${escape(v.sources[0]?.url || catalog.brands.find((b) => b.id === v.brand).sourceUrl)}" target="_blank" rel="noopener noreferrer">Check the manufacturer’s model page ${icon("external")}</a></div>`}</section><div class="model-detail-grid"><section id="upgrade-section" class="detail-panel"><span class="panel-icon">${icon("arrow")}</span><h2>Reasons to upgrade</h2>${v.upgrades.length ? v.upgrades.map((u) => `<h3>${escape(u.from)} → ${escape(u.to)}</h3><ul>${u.gains.map((g) => `<li>${escape(g.text)} <small>Source: ${g.sourceIds.map(escape).join(", ")}</small></li>`).join("")}</ul>`).join("") : "<p>Verified trim-to-trim gains will appear here after equipment research. There are no confirmed upgrade recommendations yet.</p>"}</section><section id="package-section" class="detail-panel"><span class="panel-icon">${icon("grid")}</span><h2>Factory packages</h2>${v.packages.length ? v.packages.map((p) => `<details><summary>${escape(p.name)}</summary><p>${escape(p.description)}</p><p>Eligible configurations: ${p.trimIds.map((id) => escape(v.trims.find((t) => t.id === id)?.name || id)).join(", ")}</p><p>${escape(p.conditions)}</p><small>Source: ${p.sourceIds.map(escape).join(", ")}</small></details>`).join("") : "<p>Package contents, eligible trims, and configuration dependencies are awaiting verification. An empty list does not mean no packages are offered.</p>"}</section></div><section class="section-block no-print"><h2>Equipment, explained</h2><p class="muted">General brand terminology. Inclusion here does not establish ${escape(v.model)} availability.</p>${featureCards(features.filter((f) => f.brand === v.brand))}</section><section id="source-section" class="source-panel"><div><span class="eyebrow">THE SOURCE OF TRUTH</span><h2>Sources &amp; verification</h2><p>Model year: <strong>${v.year}</strong> · Market: <strong>United States</strong> · Reviewed: <strong>${date(v.verifiedAt)}</strong></p></div><ul class="source-list">${sourceLinks(v)}</ul>${v.notes.map((n) => `<p class="muted">${escape(n)}</p>`).join("")}</section><section class="print-reference" aria-label="Printable quick reference">${printSheet(v, options)}</section></div>`;
  $("#print-reference").onclick = () => window.print();
  document.querySelectorAll("[data-scroll]").forEach(
    (a) =>
      (a.onclick = (e) => {
        e.preventDefault();
        const target = document.getElementById(a.dataset.scroll);
        target.scrollIntoView({ behavior: "auto" });
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }),
  );
  if (options.length) {
    const update = () => {
      $("#model-equipment").innerHTML = equipmentTable(
        options,
        $("#model-differences").checked,
        $("#model-group").value,
      );
    };
    $("#model-differences").onchange = update;
    $("#model-group").onchange = update;
  }
}
function printSheet(v, options) {
  const rows = comparisonRows(catalog, options).filter((r) =>
    r.cells.some((c) => c.status !== "unverified"),
  );
  const sections = [
    ["Performance", "Powertrain & drivetrain"],
    ["Comfort", "Comfort"],
    ["Technology", "Technology"],
    ["Safety", "Safety"],
    ["Exterior", "Exterior"],
  ];
  return `<header><strong>FOX AUTOMOTIVE · QUICK REFERENCE</strong><span>${v.year} ${escape(brandName(v.brand))} ${escape(v.model)}</span></header><p class="print-status">${v.status === "verified" ? "Verified model guide" : "AWAITING VERIFICATION — NOT A SPECIFICATION SHEET"} · Last reviewed: ${date(v.verifiedAt)}</p>${
    !options.length
      ? `<h1>${v.year} ${escape(v.model)}</h1><h2>Official equipment research is pending.</h2><p>Trim levels, powertrain and drivetrain options, standard equipment, available packages, and upgrade reasons have not been verified. Do not use this page to make equipment claims.</p>`
      : `<p><strong>Verified trims/configurations:</strong> ${options.map((o) => `${escape(o.trim.name)}${o.trim.configuration ? ` (${escape(o.trim.configuration)})` : ""}`).join(" · ")}</p><div class="print-columns">${sections
          .map(
            ([group, title]) =>
              `<section><h2>${title}</h2>${
                rows
                  .filter((r) => r.group === group)
                  .map(
                    (r) =>
                      `<p><strong>${escape(r.label)}:</strong> ${options.map((o, i) => `${escape(o.trim.name)} — ${escape(r.cells[i].status)}${r.cells[i].value ? `: ${escape(r.cells[i].value)}` : ""}${r.cells[i].conditions ? ` (${escape(r.cells[i].conditions)})` : ""}`).join("; ")}</p>`,
                  )
                  .join("") || "<p>No verified differences recorded.</p>"
              }</section>`,
          )
          .join(
            "",
          )}<section><h2>Factory packages</h2>${v.packages.map((p) => `<p><strong>${escape(p.name)}</strong>: ${escape(p.description)} (${escape(p.conditions)})</p>`).join("") || "<p>Awaiting verification.</p>"}</section><section><h2>Reasons to upgrade</h2>${v.upgrades.map((u) => `<p><strong>${escape(u.from)} → ${escape(u.to)}</strong>: ${u.gains.map((g) => escape(g.text)).join("; ")}</p>`).join("") || "<p>Awaiting verification.</p>"}</section></div>`
  }<footer><strong>Verify the actual window sticker. Equipment depends on configuration and packages.</strong><p>${v.sources.map((s) => `${escape(s.title)} — ${escape(s.url)} ${s.checkedAt ? `(reviewed ${date(s.checkedAt)})` : "(not reviewed)"}`).join("<br>")}</p></footer>`;
}
function comparePage() {
  nav("/compare");
  const options = eligibleOptions(catalog);
  selected = selected.filter((id) => options.some((o) => o.id === id));
  $("#main").innerHTML =
    `<div class="content page-content">${breadcrumbs([{ label: "Compare Vehicles" }])}<div class="page-heading"><span class="eyebrow">A CLEARER CONVERSATION</span><h1>Find the meaningful differences.</h1><p>Compare two to four verified vehicle configurations, within a brand or across the showroom.</p></div><div class="notice">${icon("shield")} Only source-verified configurations can be selected. Unverified fields are labeled and never treated as equipment differences.</div>${options.length ? `<div class="compare-picker"><label for="compare-select">Add a vehicle &amp; trim</label><div><select id="compare-select"><option value="">Choose a verified configuration</option>${options.map((o) => `<option value="${o.id}">${o.vehicle.year} ${escape(brandName(o.vehicle.brand))} ${escape(o.vehicle.model)} · ${escape(o.trim.name)}${o.trim.configuration ? ` · ${escape(o.trim.configuration)}` : ""}</option>`).join("")}</select><button id="add-compare" class="button primary">Add to comparison +</button></div><p class="muted">Up to four configurations. Drivetrain and package conditions remain visible in the table.</p></div><div id="compare-selection"></div><div class="table-controls"><label><input type="checkbox" id="compare-differences" checked> Show verified differences only</label></div><div id="comparison-results"></div>` : `<div class="empty-state comparison-empty"><span class="empty-emblem">${icon("compare")}</span><h2>The tool is ready. The evidence comes first.</h2><p>Comparisons will become available as model-year equipment and trims are verified. We won’t imply a difference using unconfirmed specifications.</p><div class="comparison-examples"><span>Equinox ↔ RAV4 ↔ Tiguan</span><span>Traverse ↔ Grand Highlander ↔ Atlas</span><span>Trax ↔ Corolla Cross ↔ Taos</span></div><small>Planned research groups · availability and equipment not verified</small><a class="button secondary" href="#/search">Browse model guides ${icon("arrow")}</a></div>`}</div>`;
  if (options.length) {
    $("#add-compare").onclick = () => {
      const id = $("#compare-select").value;
      if (!id) return notify("Choose a configuration first.");
      if (selected.includes(id))
        return notify("That configuration is already selected.");
      if (selected.length >= 4)
        return notify("Remove a configuration before adding another.");
      selected.push(id);
      renderComparison(options);
    };
    $("#compare-differences").onchange = () => renderComparison(options);
    renderComparison(options);
  }
}
function renderComparison(options) {
  $("#compare-selection").innerHTML = selected
    .map((id) => {
      const o = options.find((o) => o.id === id);
      return `<span class="selection-chip">${o.vehicle.year} ${escape(o.vehicle.model)} · ${escape(o.trim.name)} <button data-remove="${escape(id)}" aria-label="Remove ${escape(o.vehicle.model)} ${escape(o.trim.name)}">×</button></span>`;
    })
    .join("");
  document.querySelectorAll("[data-remove]").forEach(
    (b) =>
      (b.onclick = () => {
        selected = selected.filter((id) => id !== b.dataset.remove);
        renderComparison(options);
      }),
  );
  $("#comparison-results").innerHTML =
    selected.length < 2
      ? '<div class="empty-state compact"><h2>Select at least two configurations</h2><p>Your comparison will appear here.</p></div>'
      : equipmentTable(
          selected.map((id) => options.find((o) => o.id === id)),
          $("#compare-differences").checked,
        );
}
function specialsPage() {
  nav("/specials");
  $("#main").innerHTML =
    `<div class="content page-content">${breadcrumbs([{ label: "Manager’s Specials" }])}<section class="coming-soon"><span class="badge pending">COMING SOON</span><span class="specials-icon">${icon("car")}</span><span class="eyebrow">A NEW SPOT FOR SHOWROOM OPPORTUNITIES</span><h1>Manager’s Specials</h1><p>A dedicated home for featured vehicles and current offers.<br>We’re getting the details ready.</p><div class="coming-rule"></div><p class="muted">No offers or incentives are published here yet.<br>For current availability, speak with your sales manager.</p><a class="button secondary" href="#/">Back to the resource center ${icon("arrow")}</a></section></div>`;
}
function aboutPage() {
  nav("");
  $("#main").innerHTML =
    `<div class="content page-content narrow">${breadcrumbs([{ label: "Sources & content standards" }])}<div class="page-heading"><span class="eyebrow">CONFIDENCE STARTS WITH ACCURACY</span><h1>A reference you can check.</h1><p>Our standards for building the Fox Automotive knowledge library.</p></div><section class="prose-panel"><h2>Official sources. Specific model years.</h2><p>Vehicle claims must be supported by U.S. manufacturer specifications, brochures, equipment documents, or official model-year releases. A source link alone is not verification: it must be reviewed and tied to the precise model year and configuration.</p><h2>Four equipment states</h2><dl class="status-definitions"><dt>Standard</dt><dd>Included with the specified trim and configuration.</dd><dt>Optional</dt><dd>Available separately or in a named package, subject to recorded conditions.</dd><dt>Unavailable</dt><dd>Official documentation confirms it is not offered on this configuration.</dd><dt>Unverified</dt><dd>No confirmed evidence. This never means “unavailable.”</dd></dl><h2>Current library coverage</h2><p>${escape(catalog.coverageNotes["2026"])}</p><p>${escape(catalog.coverageNotes["2027"])}</p><p>The initial records have no verified trim or equipment claims. Manufacturer links are research targets and have not been reviewed. General glossary entries are editorial overviews awaiting source review and do not establish vehicle availability.</p><h2>Confirm the actual vehicle</h2><p>Use the vehicle’s window sticker to confirm installed equipment. Packages, drivetrain, production changes, region, and service subscriptions can affect features. Driver-assistance systems do not replace an attentive driver.</p><h2>Maintaining the library</h2><p>Catalog records live in <code>data/catalog.json</code>; equipment explanations live in <code>data/features.json</code>. Maintainer documentation in the repository explains source records, evidence checks, configurations, upgrade guides, and publishing.</p><h2>Internal reference, public website</h2><p>This resource is intended for the Fox Automotive sales team. GitHub Pages is publicly accessible. Do not add customer information, private pricing, employee data, credentials, or confidential documents.</p></section></div>`;
}
function notFound() {
  nav("");
  $("#main").innerHTML =
    '<div class="content page-content"><div class="empty-state"><h1>That guide isn’t in the library.</h1><p>The link may be outdated or the model may still be in research.</p><a class="button primary" href="#/">Back to home</a></div></div>';
}
function notify(text) {
  $("#toast").textContent = text;
  $("#toast").classList.add("visible");
  setTimeout(() => $("#toast").classList.remove("visible"), 3000);
}
function route() {
  clearTimeout(searchTimer);
  const [path, query = ""] = (location.hash.slice(1) || "/").split("?");
  const params = new URLSearchParams(query);
  document.title = path.startsWith("/model/")
    ? `${catalog.vehicles.find((v) => v.id === path.split("/")[2])?.model || "Model guide"} · Fox Automotive`
    : "Fox Automotive · Sales Resource Center";
  if (path === "/") home();
  else if (path === "/search") searchPage(params);
  else if (path.startsWith("/brand/")) brandPage(path.split("/")[2], params);
  else if (path.startsWith("/model/")) modelPage(path.split("/")[2]);
  else if (path === "/compare") comparePage();
  else if (path === "/features") glossaryPage(params);
  else if (path === "/specials") specialsPage();
  else if (path === "/about") aboutPage();
  else notFound();
  window.scrollTo(0, 0);
  if (focusAfterRoute) $("#main").focus({ preventScroll: true });
  focusAfterRoute = true;
}
async function init() {
  try {
    const responses = await Promise.all([
      fetch(new URL("./data/catalog.json", import.meta.url)),
      fetch(new URL("./data/features.json", import.meta.url)),
    ]);
    if (responses.some((r) => !r.ok))
      throw new Error("Library data could not be loaded.");
    [catalog, features] = await Promise.all(responses.map((r) => r.json()));
    route();
    window.addEventListener("hashchange", route);
    if (catalog.branding?.logo) {
      const logo = new Image();
      logo.alt = "Fox Automotive of Rochester Hills";
      logo.onload = () => {
        $(".fox-wordmark").replaceWith(logo);
        logo.className = "fox-logo";
      };
      logo.src = new URL(catalog.branding.logo, import.meta.url).href;
    }
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          document.activeElement.tagName,
        )
      ) {
        const input = $("#vehicle-search") || $("#feature-search");
        if (input) {
          e.preventDefault();
          input.focus();
        }
      }
    });
  } catch (error) {
    $("#main").innerHTML =
      `<div class="content page-content"><div class="empty-state"><h1>The library couldn’t load.</h1><p>Check your connection and reload this page. If opening a downloaded copy, serve it over HTTP using the instructions in the README.</p><button class="button primary" id="retry">Try again</button></div></div>`;
    $("#retry").onclick = () => location.reload();
    console.error(error);
  }
}
init();
