import {
  searchVehicles,
  equipmentFields,
  comparisonRows,
  eligibleOptions,
  resolveCell,
  evidenceReady,
  equipmentKey,
  trimComparisonSections,
  packageComparisonRows,
  verifiedUpgradePairs,
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
    ? `<span class="badge verified">${escape(vehicle.verificationLabel || "Source verified")}</span>`
    : '<span class="badge pending">Awaiting verification</span>';
const sourceLinks = (v) =>
  v.sources
    .map(
      (s) =>
        `<li><a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.title)} ${icon("external")}</a><span>${s.kind === "verified" ? ` ${s.delivery === "user-upload" ? "Supplied PDF reviewed" : "Reviewed"} ${date(s.checkedAt)}${s.delivery === "user-upload" ? " · Link opens manufacturer reference, not the attachment" : ""}` : "Research target · not reviewed"}</span></li>`,
    )
    .join("");

function nav(active) {
  const primary = [
    ["/", "Home"],
    ["/search", "Model Guides"],
    ["/compare", "Compare Trims"],
    ["/compare-vehicles", "Compare Vehicles"],
    ["/equipment-search", "Equipment Search"],
    ["/specials", "Manager’s Specials"],
  ];
  const link = ([path, label]) =>
    `<a href="#${path}" ${active === path ? 'aria-current="page"' : ""}>${escape(label)}${["/compare-vehicles", "/equipment-search"].includes(path) ? '<span class="soon-label">STAGE 2</span>' : path === "/specials" ? '<span class="soon-label">SOON</span>' : ""}</a>`;
  $("#navigation").innerHTML =
    `<div class="primary-links">${primary.map(link).join("")}</div><div class="manufacturer-links"><span class="eyebrow">BROWSE BY BRAND</span>${catalog.brands.map((b) => link([`/brand/${b.id}`, b.name])).join("")}<a class="glossary-link" href="#/features">Equipment glossary ↗</a></div>`;
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
  nav("/search");
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
  return `<div class="feature-grid">${items.map((f) => `<details class="feature-card" id="${f.id}"><summary><span><span class="eyebrow">${escape(brandName(f.brand))} · ${escape(f.category)}</span><strong>${escape(f.name)}</strong></span><span class="expand-icon" aria-hidden="true">+</span></summary><div class="feature-body"><p>${escape(f.summary)}</p><h4>How it works</h4><p>${escape(f.how)}</p><h4>Why a customer might value it</h4><p>${escape(f.value)}</p><h4>Know the limits</h4><p>${escape(f.limitations)}</p><div class="editorial-note">${f.verifiedAt ? `Reviewed ${date(f.verifiedAt)}` : "Editorial overview · source review pending"}. This explanation does not establish availability on any model or trim.${f.sourceNote ? ` <span>${escape(f.sourceNote)}</span>` : ""}</div><a class="text-link" href="${escape(f.sourceUrl)}" target="_blank" rel="noopener noreferrer">Manufacturer reference ${icon("external")}</a></div></details>`).join("")}</div>`;
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
    optional: "Available (Optional)",
    unavailable: "Not Offered",
    "not-applicable": "Not Applicable",
    unverified: "Unverified",
  };
  return `<span class="equipment-status ${cell.status}">${labels[cell.status]}</span>${cell.value ? `<span class="cell-value">${escape(cell.value)}</span>` : ""}${cell.conditions ? `<small>${escape(cell.conditions)}</small>` : ""}${cell.contentsText ? `<small class="package-contents">${escape(cell.contentsText)}</small>` : ""}${
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
  }${cell.sourceIds?.length ? `<small class="source-reference">Source: ${escape(citationText(cell.sourceIds, cell.sourcePages))}</small>` : ""}`;
}
function rowsTable(vehicles, rows, kind = "equipment", baselineId = null) {
  return `<div class="table-scroll" tabindex="0" role="region" aria-label="${kind === "baseline" ? "Base Equipment" : kind === "packages" ? "Packages and listed options" : "Equipment comparison"}, scroll horizontally"><table class="equipment-table" data-comparison-table="${kind}"><thead><tr><th scope="col">${kind === "packages" ? "Package / option" : "Equipment"}</th>${vehicles.map(({ vehicle: v, trim: t }) => `<th scope="col"><span>${v.year} ${escape(v.model)}</span>${escape(t.name)}${t.configuration ? `<small>${escape(t.configuration)}</small>` : ""}${`${v.id}:${t.id}` === baselineId ? `<small class="baseline-column-label">Baseline</small>` : ""}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr><th scope="row"><small>${escape(row.group)}</small>${escape(row.label)}</th>${row.cells.map((c) => `<td>${cellHTML(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
function equipmentTable(vehicles, differenceOnly = true, group = "") {
  const rows = comparisonRows(catalog, vehicles, { differenceOnly, group });
  return rows.length
    ? rowsTable(vehicles, rows)
    : '<div class="empty-state compact"><h3>No equipment differences in this view</h3><p>Identical rows are hidden. Choose All Equipment for the complete reference.</p></div>';
}
function comparisonViewControls(prefix) {
  return `<fieldset class="comparison-view-switch"><legend class="sr-only">Comparison view</legend><label><input type="radio" name="${prefix}-view" id="${prefix}-view-differences" value="differences" checked> Trim Differences</label><label><input type="radio" name="${prefix}-view" id="${prefix}-view-all" value="all"> All Equipment</label></fieldset>`;
}
function comparisonView(
  options,
  differenceOnly = true,
  group = "",
  showBaseEquipment = true,
) {
  if (options.length < 2)
    return '<div class="empty-state compact"><h2>Select at least two configurations</h2><p>Choose two to four trims to compare their equipment.</p></div>';
  const { baseline, baseRows, changeRows } = trimComparisonSections(
    catalog,
    options,
    { group },
  );
  const packages = packageComparisonRows(options, { differenceOnly });
  const upgrades = verifiedUpgradePairs(options);
  const extras = `<section class="comparison-packages"><h3>Optional packages &amp; listed options</h3><p class="comparison-note">Package contents and conditions remain visible when they differ. No verified listing means Unverified, not Unavailable. Category filters apply to equipment; this section retains package context.</p>${packages.length ? rowsTable(options, packages, "packages") : `<p class="muted">${differenceOnly ? "No package or listed-option differences are recorded. Choose All Equipment to see shared listings." : "No source-verified package or option listings are recorded."}</p>`}</section><section class="comparison-upgrades"><h3>Why Upgrade?</h3>${upgrades.length ? upgrades.map(({ from, to, gains }) => `<article><h4>${escape(from.trim.name)} → ${escape(to.trim.name)}</h4><p class="comparison-note">${from.vehicle.year} ${escape(from.vehicle.model)} · ${escape(from.trim.configuration || "Matched configurations")}</p><p>${escape(gains[0].text)}</p><small>Source: ${escape(citationText(gains[0].sourceIds, gains[0].sourcePages))}</small></article>`).join("") : '<p class="muted">No source-authored, configuration-matched adjacent-trim explanation is verified for this selection. Equipment differences alone are not used to invent an upgrade recommendation.</p>'}</section>`;
  if (!differenceOnly)
    return `<section class="all-equipment-view"><h3>All Equipment</h3><p class="comparison-note">All recorded equipment is shown, including shared and unknown fields. A known status versus Unverified does not prove equipment is absent.</p>${equipmentTable(options, false, group)}${extras}</section>`;
  const base = baseline.option;
  const identity = `${base.vehicle.year} ${brandName(base.vehicle.brand)} ${base.vehicle.model} · ${base.trim.name}${base.trim.configuration ? ` · ${base.trim.configuration}` : ""}`;
  const basis =
    baseline.method === "verified-upgrade-order"
      ? "Lowest selected grade established by this model’s recorded, verified upgrade relationships. Catalog order breaks configuration ties."
      : baseline.method === "cross-model-reference"
        ? "Reference baseline follows catalog order. Different models or model years do not have a shared trim ranking."
        : "Baseline follows this model’s existing catalog order; a price ranking or equipment inheritance is not inferred.";
  return `${showBaseEquipment ? `<section class="baseline-equipment"><h3>Base Equipment</h3><p class="baseline-identity"><strong>Baseline trim:</strong> ${escape(identity)}</p><p class="comparison-note">${basis} Verified standard equipment that does not change is shown below. Changed core specifications appear once under What Changes, with this baseline’s value marked. No equipment is assumed to carry over.</p>${baseRows.length ? rowsTable([base], baseRows, "baseline") : '<p class="muted">No unchanged, source-verified standard equipment is recorded for this baseline and category. Check What Changes or choose All Equipment.</p>'}</section>` : ""}<section class="what-changes"><h3>What Changes</h3><p class="comparison-note">Only equipment or availability that differs between the selected configurations is shown. Known versus Unverified indicates a verification difference, not proof of absence.</p>${changeRows.length ? rowsTable(options, changeRows, "equipment", base.id) : `<div class="empty-state compact"><h4>No equipment changes in this view</h4><p>${showBaseEquipment ? "Identical rows are shown under Base Equipment when standard. " : ""}All Equipment includes every recorded field.</p></div>`}${extras}</section>`;
}
function defaultModelSelection(options) {
  if (options.length < 2) return options.map((o) => o.id);
  const first = options[0];
  const second =
    options.find(
      (o) =>
        o.trim.name !== first.trim.name &&
        o.trim.configuration === first.trim.configuration,
    ) ||
    options.find((o) => o.trim.name !== first.trim.name) ||
    options[1];
  return [first.id, second.id];
}
function modelTrimPicker(options, ids) {
  return `<details class="model-trim-picker"><summary>Choose trims to compare · <span id="model-selected-count">${ids.length}</span> selected</summary><fieldset><legend>Select two to four configurations</legend><div class="trim-checkbox-grid">${options.map((o) => `<label><input type="checkbox" name="model-trim" value="${escape(o.id)}" ${ids.includes(o.id) ? "checked" : ""}><span>${escape(o.trim.name)}${o.trim.configuration ? `<small>${escape(o.trim.configuration)}</small>` : ""}</span></label>`).join("")}</div></fieldset></details>`;
}
function citationText(ids = [], pages = {}) {
  return ids
    .map((id) => {
      const source = catalog.vehicles
        .flatMap((v) => v.sources)
        .find((s) => s.id === id);
      return `${source?.shortLabel || id}${pages[id] ? ` pp. ${pages[id]}` : ""}`;
    })
    .join(", ");
}
function optionalEquipmentHTML(v) {
  const items = [
    ...(v.optionalEquipment || []),
    ...(v.listedOptions || []),
  ].filter((o) => o.status === "optional");
  if (!items.length) return "";
  return `<h3>Verified individual options</h3><p class="muted">These availability statements do not establish a named package’s full contents or installation on a particular vehicle.</p>${items.map((o) => `<details><summary>${escape(o.name)} <span class="equipment-status optional">Optional</span></summary><p>${escape(o.description)}</p><p>Listed grade(s): ${[...new Set(o.trimIds.map((id) => v.trims.find((t) => t.id === id)?.name || id))].map(escape).join(", ")}</p><p>${escape(o.conditions)}</p><small>Source: ${escape(citationText(o.sourceIds, o.sourcePages))}</small></details>`).join("")}`;
}
function trimGroups(options) {
  const groups = new Map();
  for (const option of options) {
    if (!groups.has(option.trim.name)) groups.set(option.trim.name, []);
    groups.get(option.trim.name).push(option);
  }
  return [...groups.values()];
}
// Optional future photos collapse completely when absent, unverified, or failed.
function verifiedTrimImage(vehicle, trim) {
  const image = trim.image;
  if (
    !image?.src ||
    !image.alt ||
    image.modelYear !== vehicle.year ||
    image.trimName !== trim.name ||
    !evidenceReady(vehicle, image.sourceIds)
  )
    return null;
  try {
    const base = new URL("assets/", import.meta.url);
    const url = new URL(image.src, import.meta.url);
    return url.origin === base.origin &&
      url.pathname.startsWith(base.pathname) &&
      !url.search &&
      !url.hash
      ? { ...image, url: url.href }
      : null;
  } catch {
    return null;
  }
}
function trimCardHTML(vehicle, group, index, selectedId = group[0].id) {
  const option = group.find((o) => o.id === selectedId) || group[0],
    trim = option.trim;
  const image = verifiedTrimImage(vehicle, trim);
  const priority = [
    "wheels",
    "upholstery",
    "heatedSeats",
    "ventilatedSeats",
    "roof",
    "audio",
    "heatedWheel",
    "liftgate",
    "infotainment",
    "assistance",
    "instruments",
    "phone",
  ];
  const peers = eligibleOptions(catalog).filter(
    (o) => o.vehicle.id === vehicle.id && o.trim.name !== trim.name,
  );
  const known = priority.filter(
    (id) => resolveCell(vehicle, trim, id).status === "standard",
  );
  const distinct = known.filter((id) =>
    peers.some((o) => {
      const cell = resolveCell(o.vehicle, o.trim, id);
      return (
        cell.status !== "unverified" &&
        equipmentKey(cell) !== equipmentKey(resolveCell(vehicle, trim, id))
      );
    }),
  );
  const highlights = [
    ...new Set([
      ...(trim.highlightFieldIds || []).filter(
        (id) => resolveCell(vehicle, trim, id).status === "standard",
      ),
      ...distinct,
      ...known,
    ]),
  ].slice(0, 5);
  return `<article class="trim-training-card" data-grade-index="${index}">${image ? `<div class="trim-card-visual"><img src="${escape(image.url)}" alt="${escape(image.alt)}" loading="lazy" decoding="async">${image.credit ? `<small class="trim-photo-credit">${escape(image.credit)}</small>` : ""}</div>` : ""}<div class="trim-card-content"><span class="eyebrow trim-card-context">${vehicle.year} · ${escape(brandName(vehicle.brand))} · ${escape(vehicle.model)}</span><h3>${escape(trim.name)}</h3>${evidenceReady(vehicle, trim.equipment.msrp?.sourceIds) ? `<p class="trim-msrp">${escape(trim.equipment.msrp.value)}<small>${escape(citationText(trim.equipment.msrp.sourceIds, trim.equipment.msrp.sourcePages))} · Reviewed ${escape(vehicle.verifiedAt)} · ${escape(trim.equipment.msrp.cardNote || "")}</small></p>` : trim.equipment.msrp ? `<p class="trim-msrp">MSRP: ${cellHTML(resolveCell(vehicle, trim, "msrp"))}</p>` : ""}${group.length > 1 ? `<label class="field-label" for="card-config-${index}">Configuration</label><select class="card-configuration" id="card-config-${index}">${group.map((o) => `<option value="${escape(o.id)}" ${o.id === option.id ? "selected" : ""}>${escape(o.trim.configuration || o.trim.name)}</option>`).join("")}</select>` : `<span class="field-label">Configuration</span><p class="single-configuration">${escape(trim.configuration || "Verified configuration")}</p>`}<dl class="trim-core-specs">${[
    ["engine", "Engine"],
    ["horsepower", "Horsepower"],
    ["drivetrain", "Drivetrain"],
    ["economy", "MPG"],
  ]
    .map(([id, label]) => {
      const cell = resolveCell(vehicle, trim, id);
      return `<div><dt>${label}</dt><dd>${cell.status === "unverified" ? '<span class="equipment-status unverified">Unverified</span>' : escape(cell.value)}${cell.sourceIds?.length ? `<small>${escape(citationText(cell.sourceIds, cell.sourcePages))}</small>` : ""}</dd></div>`;
    })
    .join(
      "",
    )}</dl><h4>Equipment highlights</h4><ul class="trim-highlights">${highlights.length ? highlights.map((id) => `<li>${escape(resolveCell(vehicle, trim, id).value)}</li>`).join("") : "<li>Standard equipment details await verification.</li>"}</ul><div class="trim-card-actions"><button class="button primary" data-trim-action="equipment" data-option="${escape(option.id)}">View Equipment</button><button class="button secondary" data-trim-action="compare" data-option="${escape(option.id)}">Compare Trims</button></div></div></article>`;
}
function trimExplorerHTML(vehicle, options) {
  if (!options.length) return "";
  const groups = trimGroups(options);
  return `<section id="trim-lineup" class="section-block trim-lineup"><div class="section-heading"><div><span class="eyebrow">LEARN THE LINEUP</span><h2>Find your trim. Know the difference.</h2><p class="muted">${groups.length} verified trim${groups.length === 1 ? "" : "s"} · ${options.length} configuration${options.length === 1 ? "" : "s"}. Choose a drivetrain to see its own specifications.</p></div></div><div class="trim-card-grid">${groups.map((group, i) => trimCardHTML(vehicle, group, i)).join("")}</div><p class="comparison-note">Highlights are selected from documented standard equipment; they are not claims that other trims lack those features. Unverified values stay labeled.</p></section><section id="equipment-detail" class="section-block training-equipment"><div class="section-heading"><div><span class="eyebrow">PRODUCT TRAINING · SALES REFERENCE</span><h2 tabindex="-1" id="equipment-detail-title">Equipment, organized.</h2><p class="muted">Start with the category you need. Expand for availability, conditions and sources.</p></div></div><label class="field-label" for="equipment-config">Equipment for</label><select id="equipment-config" class="standalone-input">${options.map((o) => `<option value="${escape(o.id)}">${escape(o.trim.name)} · ${escape(o.trim.configuration || "Verified configuration")}</option>`).join("")}</select><div id="categorized-equipment"></div></section>`;
}
function categorizedEquipmentHTML(vehicle, trim) {
  const convenience = new Set(["liftgate", "wirelessCharging", "cargoOutlet"]);
  const categories = [
    "Performance",
    "Comfort",
    "Technology",
    "Safety",
    "Convenience",
    "Exterior",
  ];
  const sections = categories
    .map((category) => {
      const fields = equipmentFields(catalog, [vehicle]).filter(
        (f) => (convenience.has(f.id) ? "Convenience" : f.group) === category,
      );
      if (!fields.length) return "";
      const cells = fields.map((f) => resolveCell(vehicle, trim, f.id));
      return `<details class="equipment-category" ${category === "Performance" ? "open" : ""}><summary><span>${category}</span><small>${cells.filter((c) => c.status === "standard").length} standard · ${cells.filter((c) => c.status === "optional").length} optional · ${cells.filter((c) => c.status === "unavailable").length} unavailable · ${cells.filter((c) => c.status === "not-applicable").length} not applicable · ${cells.filter((c) => c.status === "unverified").length} unverified</small></summary><dl class="categorized-fields">${fields.map((f, i) => `<div><dt>${escape(f.label)}</dt><dd>${cellHTML(cells[i])}</dd></div>`).join("")}</dl></details>`;
    })
    .join("");
  const packages = vehicle.packages.filter(
    (p) => p.trimIds.includes(trim.id) && evidenceReady(vehicle, p.sourceIds),
  );
  const options = [
    ...(vehicle.optionalEquipment || []),
    ...(vehicle.listedOptions || []),
  ].filter(
    (o) => o.trimIds.includes(trim.id) && evidenceReady(vehicle, o.sourceIds),
  );
  return `<p class="equipment-context"><strong>${escape(trim.name)}</strong> · ${escape(trim.configuration || "")} · Actual equipment must be confirmed on the window sticker.</p>${sections}<details class="equipment-category"><summary><span>Packages &amp; listed options</span><small>${packages.length} package listings · ${options.length} individual options</small></summary><div class="categorized-packages">${packages.length ? packages.map((p) => `<article><h3>${escape(p.name)}</h3>${cellHTML({ status: p.status || "optional" })}${p.contentsStatus === "unverified" ? '<p class="editorial-note">Package name verified · Contents Unverified</p>' : ""}<p>${escape(p.description)}</p><p>${escape(p.conditions)}</p><small>Source: ${escape(citationText(p.sourceIds, p.sourcePages))}</small></article>`).join("") : "<p>No source-verified package listing for this configuration. This does not mean packages are unavailable.</p>"}${options.map((o) => `<article><h3>${escape(o.name)}</h3>${cellHTML({ status: o.status || "optional" })}<p>${escape(o.description)}</p><p>${escape(o.conditions)}</p><small>Source: ${escape(citationText(o.sourceIds, o.sourcePages))}</small></article>`).join("")}</div></details>`;
}
function modelPage(id) {
  const v = catalog.vehicles.find((v) => v.id === id);
  if (!v) return notFound();
  nav(`/brand/${v.brand}`);
  const options = eligibleOptions(catalog).filter((o) => o.vehicle.id === id);
  let modelSelected = defaultModelSelection(options);
  $("#main").innerHTML =
    `<div class="content page-content model-page">${breadcrumbs([{ label: brandName(v.brand), href: `#/brand/${v.brand}` }, { label: `${v.year} ${v.model}` }])}<div class="model-heading"><div><span class="eyebrow">${escape(brandName(v.brand))} · ${v.year} MODEL GUIDE</span><h1>${escape(v.model)}</h1><p>${escape(v.summary)}</p><div class="model-meta">${statusBadge(v)}<span>Last verification: ${date(v.verifiedAt)}</span></div></div><div class="model-actions"><button class="button primary" id="print-reference">${icon("print")} Print Quick Reference</button>${options.length ? `<a class="button secondary" href="#trim-section" data-scroll="trim-section">${icon("compare")} Compare trims</a>` : ""}</div></div><div class="notice">${icon("shield")} Verify actual equipment against the vehicle’s window sticker. Availability may depend on drivetrain, packages, production date, and region.</div>${v.relatedGuides?.length ? `<p class="related-guide">${v.relatedGuides.map((g) => `<a class="text-link" href="#/model/${escape(g.id)}">${escape(g.label)} ${icon("arrow")}</a>`).join(" ")}</p>` : ""}<nav class="section-nav" aria-label="Model sections">${options.length ? '<a href="#trim-lineup" data-scroll="trim-lineup">Trim lineup</a><a href="#equipment-detail" data-scroll="equipment-detail">View Equipment</a>' : ""}<a href="#trim-section" data-scroll="trim-section">Compare Trims</a><a href="#upgrade-section" data-scroll="upgrade-section">Reasons to upgrade</a><a href="#package-section" data-scroll="package-section">Factory packages</a><a href="#source-section" data-scroll="source-section">Sources &amp; verification</a></nav>${trimExplorerHTML(v, options)}<section id="trim-section" class="section-block"><div class="section-heading"><div><span class="eyebrow">THE DETAILS THAT MATTER</span><h2>Trim &amp; equipment reference</h2></div></div><div class="legend">${["standard", "optional", "unavailable", "not-applicable", "unverified"].map((s) => `<span class="equipment-status ${s}">${{ optional: "Available (Optional)", unavailable: "Not Offered", "not-applicable": "Not Applicable" }[s] || s[0].toUpperCase() + s.slice(1)}</span>`).join("")}</div>${
      options.length
        ? `${modelTrimPicker(options, modelSelected)}<div class="table-controls">${comparisonViewControls("model")}<div class="category-control"><label for="model-group">Category</label><select id="model-group"><option value="">All categories</option>${[...new Set(catalog.fields.map((f) => f.group))].map((g) => `<option>${g}</option>`).join("")}</select></div></div><div id="model-equipment">${comparisonView(
            options.filter((o) => modelSelected.includes(o.id)),
            true,
          )}</div>`
        : `<div class="empty-state"><span class="empty-emblem">${icon("book")}</span><h3>Accuracy comes before a filled-in table.</h3><p>Trim structure and equipment are awaiting official ${v.year} ${escape(v.model)} documentation. No specifications have been carried over from another year.</p><a class="text-link" href="${escape(v.sources[0]?.url || catalog.brands.find((b) => b.id === v.brand).sourceUrl)}" target="_blank" rel="noopener noreferrer">Check the manufacturer’s model page ${icon("external")}</a></div>`
    }</section><div class="model-detail-grid"><section id="upgrade-section" class="detail-panel"><span class="panel-icon">${icon("arrow")}</span><h2>Reasons to upgrade</h2>${v.upgrades.length ? v.upgrades.map((u) => `<h3>${escape(u.from)} → ${escape(u.to)}</h3><ul>${u.gains.map((g) => `<li>${escape(g.text)} <small>Source: ${escape(citationText(g.sourceIds, g.sourcePages))}</small></li>`).join("")}</ul>`).join("") : "<p>Verified trim-to-trim gains will appear here after equipment research. There are no confirmed upgrade recommendations yet.</p>"}</section><section id="package-section" class="detail-panel"><span class="panel-icon">${icon("grid")}</span><h2>Factory packages</h2>${
      v.packages.length
        ? v.packages
            .filter(
              (p) => !["unavailable", "not-applicable"].includes(p.status),
            )
            .map(
              (p) =>
                `<details><summary>${escape(p.name)}</summary>${p.contentsStatus === "unverified" ? `<p class="editorial-note">Package name verified · Contents Unverified</p>` : ""}<p>${escape(p.description)}</p><p>${p.eligibilityScope === "grade" ? "Listed grades" : "Eligible configurations"}: ${[...new Set(p.trimIds.map((id) => v.trims.find((t) => t.id === id)?.name || id))].map(escape).join(", ")}</p><p>${escape(p.conditions)}</p><small>Source: ${escape(citationText(p.sourceIds, p.sourcePages))}</small></details>`,
            )
            .join("")
        : "<p>Package contents, eligible trims, and configuration dependencies are awaiting verification. An empty list does not mean no packages are offered.</p>"
    }${optionalEquipmentHTML(v)}</section></div><section class="section-block no-print"><h2>Equipment, explained</h2><p class="muted">General brand terminology. Inclusion here does not establish ${escape(v.model)} availability.</p>${featureCards(features.filter((f) => f.brand === v.brand))}</section><section id="source-section" class="source-panel"><div><span class="eyebrow">THE SOURCE OF TRUTH</span><h2>Sources &amp; verification</h2><p>Model year: <strong>${v.year}</strong> · Market: <strong>United States</strong> · Reviewed: <strong>${date(v.verifiedAt)}</strong></p></div><ul class="source-list">${sourceLinks(v)}</ul>${v.notes.map((n) => `<p class="muted">${escape(n)}</p>`).join("")}</section><section class="print-reference" aria-label="Printable quick reference">${printSheet(v, options)}</section></div>`;
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
      $("#model-selected-count").textContent = modelSelected.length;
      $("#model-equipment").innerHTML = comparisonView(
        options.filter((o) => modelSelected.includes(o.id)),
        !$("#model-view-all").checked,
        $("#model-group").value,
      );
    };
    const renderEquipment = () => {
      const selected = options.find(
        (o) => o.id === $("#equipment-config").value,
      );
      $("#categorized-equipment").innerHTML = categorizedEquipmentHTML(
        v,
        selected.trim,
      );
    };
    $("#equipment-config").onchange = renderEquipment;
    renderEquipment();
    // Capture errors for both initial cards and configuration replacements.
    $(".trim-card-grid").addEventListener(
      "error",
      (event) => {
        if (event.target.matches(".trim-card-visual img"))
          event.target.parentElement.remove();
      },
      true,
    );
    const groups = trimGroups(options);
    $(".trim-card-grid").onchange = (event) => {
      if (!event.target.matches(".card-configuration")) return;
      const index = Number(
          event.target.closest(".trim-training-card").dataset.gradeIndex,
        ),
        id = event.target.value;
      event.target.closest(".trim-training-card").outerHTML = trimCardHTML(
        v,
        groups[index],
        index,
        id,
      );
      document
        .querySelector(`[data-grade-index="${index}"] select`)
        .focus({ preventScroll: true });
    };
    $(".trim-card-grid").onclick = (event) => {
      const button = event.target.closest("[data-trim-action]");
      if (!button) return;
      if (button.dataset.trimAction === "equipment") {
        $("#equipment-config").value = button.dataset.option;
        renderEquipment();
        $("#equipment-detail").scrollIntoView();
        $("#equipment-detail-title").focus({ preventScroll: true });
      } else {
        if (!modelSelected.includes(button.dataset.option)) {
          modelSelected = [...modelSelected.slice(0, 3), button.dataset.option];
          document
            .querySelectorAll('input[name="model-trim"]')
            .forEach(
              (input) => (input.checked = modelSelected.includes(input.value)),
            );
          update();
        }
        $("#trim-section").scrollIntoView();
        $("#trim-section").tabIndex = -1;
        $("#trim-section").focus({ preventScroll: true });
      }
    };
    document
      .querySelectorAll('input[name="model-view"]')
      .forEach((input) => (input.onchange = update));
    $("#model-group").onchange = update;
    document.querySelectorAll('input[name="model-trim"]').forEach(
      (input) =>
        (input.onchange = () => {
          if (input.checked && modelSelected.length >= 4) {
            input.checked = false;
            return notify("Compare up to four configurations at a time.");
          }
          modelSelected = input.checked
            ? [...modelSelected, input.value]
            : modelSelected.filter((id) => id !== input.value);
          update();
        }),
    );
  }
}
function compactPrintSheet(v, options) {
  const refs = v.quickReference;
  const byId = new Map(options.map((o) => [o.trim.id, o]));
  const renderFields = (group) =>
    group.fieldIds
      .map((id) => {
        const cells = group.trimIds
          .map((tid) => byId.get(tid))
          .filter(Boolean)
          .map((o) => resolveCell(v, o.trim, id));
        const unique = [
          ...new Set(
            cells.map((c) =>
              c.status === "unverified"
                ? "Unverified"
                : `${{ standard: "S", optional: "O", unavailable: "Not Offered", "not-applicable": "N/A" }[c.status]}: ${c.value}`,
            ),
          ),
        ];
        return unique.map(escape).join(" / ");
      })
      .join("; ");
  const sources = v.sources.filter((s) => s.kind === "verified");
  const isHEV = refs.scope === "HEV";
  const isGasoline = refs.scope === "gasoline";
  const isElectric = refs.scope === "electric";
  const printOptions = (v.optionalEquipment || []).filter(
    (o) =>
      !refs.optionalEquipmentIds || refs.optionalEquipmentIds.includes(o.id),
  );
  const performance = refs.powertrainTrimIds
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((o) => {
      const hp = resolveCell(v, o.trim, "horsepower");
      const economy = resolveCell(v, o.trim, "economy");
      const range = resolveCell(v, o.trim, "electricRange");
      const charging = resolveCell(v, o.trim, "charging");
      return `<p><strong>${escape(o.trim.name)} ${escape(o.trim.configuration)}:</strong> ${escape(hp.value || "Output unverified")}; ${economy.status === "unverified" ? "MPG Unverified" : escape(economy.value)}${["standard", "optional"].includes(range.status) ? `; ${escape(range.value)}` : ""}${["standard", "optional"].includes(charging.status) ? `; ${escape(charging.value)}` : ""}.</p>`;
    })
    .join("");
  const towing = new Map();
  for (const o of options) {
    const cell = resolveCell(v, o.trim, "towing");
    const key = cell.status === "unverified" ? "Unverified" : cell.value;
    towing.set(key, [
      ...(towing.get(key) || []),
      `${o.trim.name} ${o.trim.configuration}`,
    ]);
  }
  const common = refs.commonFieldIds
    .map((id) => {
      const cells = options.map((o) => resolveCell(v, o.trim, id));
      return cells.every(
        (c) => c.status === "standard" && c.value === cells[0].value,
      )
        ? cells[0].value
        : "";
    })
    .filter(Boolean);
  return `<header><strong>FOX AUTOMOTIVE · QUICK REFERENCE</strong><span>${v.year} ${escape(brandName(v.brand))} ${escape(v.model)}${isHEV ? " Hybrid" : ""}</span></header><p class="print-status">Reviewed ${date(v.verifiedAt)} · ${isHEV ? `HEV only — ${new Set(options.map((o) => o.trim.name)).size} grades / ${options.length} configurations. PHEV has a separate guide.` : isGasoline ? `${new Set(options.map((o) => o.trim.name)).size} gasoline trims / ${options.length} configurations. Full equipment and source pages in the online guide.` : isElectric ? `${new Set(options.map((o) => o.trim.name)).size} battery-electric trims / ${options.length} configurations. Full equipment and source pages in the online guide.` : "PHEV only — release-supported facts; detailed specification review pending."} · S = Standard; O = Optional; U = Unverified; N/A = Not Applicable.</p><div class="compact-print-grid"><div><h2>Important standard trim differences</h2><table class="print-grade-table"><thead><tr><th>Grade / configuration</th><th>Source-backed equipment</th></tr></thead><tbody>${refs.groups.map((g) => `<tr><th>${escape(g.label)}</th><td>${renderFields(g)}</td></tr>`).join("")}</tbody></table><h2>What customers gain</h2>${v.upgrades.map((u) => `<p><strong>${escape(u.from)} → ${escape(u.to)}:</strong> ${escape(u.gains[0].text)}</p>`).join("")}<h2>Common equipment</h2><p>${common.map(escape).join("; ")}.</p></div><div><h2>Powertrain / capability</h2>${performance}<p>${[...towing].map(([value, names]) => `<strong>Towing ${escape(value)}:</strong> ${names.map(escape).join(", ")}.`).join(" ")} Proper equipment and loading required.</p><h2>Named factory packages</h2>${
    v.packages.length
      ? v.packages
          .filter((p) => !["unavailable", "not-applicable"].includes(p.status))
          .map(
            (p) =>
              `<p><strong>${escape(p.name.replace(" (HEV only)", ""))}:</strong> ${[...new Set(p.trimIds.map((id) => v.trims.find((t) => t.id === id)?.name || id))].map(escape).join(", ")}. ${p.contentsStatus === "unverified" ? "Contents U." : escape(p.description)}</p>`,
          )
          .join("")
      : "<p>Names, contents and eligibility Unverified.</p>"
  }<p><strong>Do not infer package contents from names.</strong> Region, drivetrain combinations, pricing and installed equipment require confirmation.</p><h2>Confirmed individual options</h2>${printOptions.map((o) => `<p><strong>O ${escape(o.name)}:</strong> ${[...new Set(o.trimIds.map((id) => v.trims.find((t) => t.id === id)?.name || id))].map(escape).join(", ")}.</p>`).join("") || (isGasoline || isElectric ? "<p>See the online guide for all itemized options and restrictions.</p>" : "<p>Unverified.</p>")}<h2>Verification limits</h2>${refs.caveats.map((c) => `<p>${escape(c.text)}</p>`).join("")}</div></div><footer><strong>Confirm the actual window sticker, package contents and owner’s manual. Driver-assistance and subscription limitations apply.</strong><p>${sources.map((s) => `${escape(s.shortLabel || s.id)}: ${escape(s.title)} — ${escape(s.url)} (reviewed ${date(s.checkedAt)})`).join("<br>")}</p></footer>`;
}
function printSheet(v, options) {
  if (v.quickReference) return compactPrintSheet(v, options);
  const rows = comparisonRows(catalog, options, {
    differenceOnly: false,
  }).filter((r) => r.cells.some((c) => c.status !== "unverified"));
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
    `<div class="content page-content">${breadcrumbs([{ label: "Compare Vehicles" }])}<div class="page-heading"><span class="eyebrow">A CLEARER CONVERSATION</span><h1>Find the meaningful differences.</h1><p>Compare two to four verified vehicle configurations, within a brand or across the showroom.</p></div><div class="notice">${icon("shield")} Only source-verified configurations can be selected. Different availability or verification states stay visible; an Unverified cell does not establish that equipment is unavailable.</div>${options.length ? `<div class="compare-picker"><label for="compare-select">Add a vehicle &amp; trim</label><div><select id="compare-select"><option value="">Choose a verified configuration</option>${options.map((o) => `<option value="${o.id}">${o.vehicle.year} ${escape(brandName(o.vehicle.brand))} ${escape(o.vehicle.model)} · ${escape(o.trim.name)}${o.trim.configuration ? ` · ${escape(o.trim.configuration)}` : ""}</option>`).join("")}</select><button id="add-compare" class="button primary">Add to comparison +</button></div><p class="muted">Up to four configurations. Drivetrain and package conditions remain visible in the table.</p></div><div id="compare-selection"></div><div class="table-controls">${comparisonViewControls("compare")}</div><div id="comparison-results"></div>` : `<div class="empty-state comparison-empty"><span class="empty-emblem">${icon("compare")}</span><h2>The tool is ready. The evidence comes first.</h2><p>Comparisons will become available as model-year equipment and trims are verified. We won’t imply a difference using unconfirmed specifications.</p><div class="comparison-examples"><span>Equinox ↔ RAV4 ↔ Tiguan</span><span>Traverse ↔ Grand Highlander ↔ Atlas</span><span>Trax ↔ Corolla Cross ↔ Taos</span></div><small>Planned research groups · availability and equipment not verified</small><a class="button secondary" href="#/search">Browse model guides ${icon("arrow")}</a></div>`}</div>`;
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
    document
      .querySelectorAll('input[name="compare-view"]')
      .forEach((input) => (input.onchange = () => renderComparison(options)));
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
  $("#comparison-results").innerHTML = comparisonView(
    selected.map((id) => options.find((o) => o.id === id)),
    !$("#compare-view-all").checked,
    "",
    false,
  );
}
function stageTwoPage(kind) {
  const isSearch = kind === "equipment-search";
  const title = isSearch ? "Equipment Search" : "Compare Vehicles";
  nav(isSearch ? "/equipment-search" : "/compare-vehicles");
  $("main").innerHTML =
    `<div class="content page-content">${breadcrumbs([{ label: title }])}<section class="stage-two-panel"><span class="badge pending">STAGE 2 · COMING NEXT</span><span class="tool-icon">${icon(isSearch ? "search" : "compare")}</span><h1>${title}</h1><p>${isSearch ? "A dedicated workspace for finding vehicles by verified equipment and feature combinations." : "A dedicated workspace for researching competing models and their verified specifications."}</p><p class="muted">This workspace is planned for Stage 2. For now, use the model guides, categorized equipment and existing trim comparison tools.</p><div class="stage-two-actions"><a class="button primary" href="#/search">Browse Model Guides ${icon("arrow")}</a><a class="button secondary" href="#/compare">Compare Trims</a><a class="text-link" href="#/features">Equipment glossary ${icon("arrow")}</a></div></section></div>`;
}
function specialsPage() {
  nav("/specials");
  $("#main").innerHTML =
    `<div class="content page-content">${breadcrumbs([{ label: "Manager’s Specials" }])}<section class="coming-soon"><span class="badge pending">COMING SOON</span><span class="specials-icon">${icon("car")}</span><span class="eyebrow">A NEW SPOT FOR SHOWROOM OPPORTUNITIES</span><h1>Manager’s Specials</h1><p>A dedicated home for featured vehicles and current offers.<br>We’re getting the details ready.</p><div class="coming-rule"></div><p class="muted">No offers or incentives are published here yet.<br>For current availability, speak with your sales manager.</p><a class="button secondary" href="#/">Back to the resource center ${icon("arrow")}</a></section></div>`;
}
function aboutPage() {
  nav("");
  $("#main").innerHTML =
    `<div class="content page-content narrow">${breadcrumbs([{ label: "Sources & content standards" }])}<div class="page-heading"><span class="eyebrow">CONFIDENCE STARTS WITH ACCURACY</span><h1>A reference you can check.</h1><p>Our standards for building the Fox Automotive knowledge library.</p></div><section class="prose-panel"><h2>Official sources. Specific model years.</h2><p>Vehicle claims must be supported by U.S. manufacturer specifications, brochures, equipment documents, or official model-year releases. A source link alone is not verification: it must be reviewed and tied to the precise model year and configuration.</p><h2>Equipment states</h2><dl class="status-definitions"><dt>Standard</dt><dd>Included with the specified trim and configuration.</dd><dt>Available (Optional)</dt><dd>Available separately or in a named package, subject to recorded conditions.</dd><dt>Not Offered</dt><dd>Official documentation confirms it is not offered on this configuration.</dd><dt>Not Applicable</dt><dd>The specification does not apply to this powertrain or configuration.</dd><dt>Unverified</dt><dd>No confirmed evidence. This never means “unavailable.”</dd></dl><h2>Current library coverage</h2><p>${escape(catalog.coverageNotes["2026"])}</p><p>${escape(catalog.coverageNotes["2027"])}</p><p>Each claim has its own verification state and source. Reviewed brochure facts are distinguished from unresolved package contents and specifications. The PHEV guide is separate from the HEV brochure tables. Glossary review states are shown per entry and do not independently establish equipment availability.</p><h2>Confirm the actual vehicle</h2><p>Use the vehicle’s window sticker to confirm installed equipment. Packages, drivetrain, production changes, region, and service subscriptions can affect features. Driver-assistance systems do not replace an attentive driver.</p><h2>Maintaining the library</h2><p>Catalog records live in <code>data/catalog.json</code>; equipment explanations live in <code>data/features.json</code>. Maintainer documentation in the repository explains source records, evidence checks, configurations, upgrade guides, and publishing.</p><h2>Internal reference, public website</h2><p>This resource is intended for the Fox Automotive sales team. GitHub Pages is publicly accessible. Do not add customer information, private pricing, employee data, credentials, or confidential documents.</p></section></div>`;
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
  else if (path === "/compare-vehicles") stageTwoPage("compare-vehicles");
  else if (path === "/equipment-search") stageTwoPage("equipment-search");
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
        const frame = document.createElement("span");
        frame.className = "fox-logo-frame";
        frame.append(logo);
        $(".fox-wordmark").replaceWith(frame);
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
