import {
  salesCell,
  salesOptions,
  salesText,
  specificationFields,
  standardReasons,
  visibleYearChanges,
  printView,
} from "./presentation.js";
import { openReferenceDialog, closeReferenceDialog } from "./dialog.js";
import {
  manufacturers,
  offerTypes,
  activeOffers,
  dealershipDate,
  validateSpecials,
} from "./specials.js";
import {
  searchVehicles,
  equipmentFields,
  comparisonRows,
  eligibleOptions,
  resolveCell,
  evidenceReady,
  equipmentKey,
} from "./lib.js";

const standardEquipmentNotice =
  "This guide reflects factory-standard equipment by model and trim. Optional equipment and packages vary by vehicle. Refer to the vehicle's original window sticker to verify exact equipment.";
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
let catalog, features, directoryCatalog;
let selected = [];
let searchTimer;
let disposeSpecials = () => {};
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
        `<li><a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.title)} ${icon("external")}</a><span>${s.kind === "verified" ? ` ${s.delivery === "user-upload" ? `Supplied ${s.format === "xlsx" ? "XLSX" : "PDF"} reviewed` : "Reviewed"} ${date(s.checkedAt)}${s.delivery === "user-upload" ? " · Link opens manufacturer reference, not the attachment" : ""}` : "Research target · not reviewed"}</span></li>`,
    )
    .join("");

function nav(active) {
  const primary = [
    ["/", "Home"],
    ["/search", "Model Guides"],
    ["/compare", "Compare Models"],
    ["/specials", "Current Specials"],
  ];
  const link = ([path, label]) =>
    `<a href="#${path}" ${active === path ? 'aria-current="page"' : ""}>${escape(label)}</a>`;
  $("#navigation").innerHTML =
    `<div class="primary-links">${primary.map(link).join("")}</div><div class="manufacturer-links"><span class="eyebrow">BROWSE BY BRAND</span>${catalog.brands.map((b) => link([`/search?brand=${b.id}`, b.name])).join("")}<a class="glossary-link" href="#/features">Equipment glossary ↗</a></div>`;
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
  $("#main").innerHTML =
    `<section class="hero"><div class="hero-inner"><div class="hero-copy"><div class="eyebrow"><span class="red-line"></span> THE FOX AUTOMOTIVE KNOWLEDGE LIBRARY</div><h1>Know the vehicle.<br><span>Build the confidence.</span></h1><p>Your everyday reference for models, trims, and technology.<br class="desktop-break"> Three brands. One place to find the details that matter.</p><div class="hero-tags"><span>${icon("book")} Model &amp; trim guides</span><span>${icon("compare")} Side-by-side comparisons</span><span>${icon("print")} Desk-ready references</span></div></div><aside class="axel-card"><div><span class="eyebrow">A LITTLE KNOWLEDGE.<br>A LOT OF CONFIDENCE.</span><p>Ready for your next<br>customer conversation.</p><span class="axel-signature">The Fox way.</span></div></aside></div></section>
 <div class="content home-content"><section class="search-panel" aria-labelledby="search-title"><div class="section-inline"><h2 id="search-title">What are you looking for?</h2><span class="muted">2026 &amp; 2027 model-year library</span></div>${searchForm()}</section>
 <section class="section-block" aria-labelledby="brands-title"><div class="section-heading"><div><span class="eyebrow">START WITH A BRAND</span><h2 id="brands-title">Three brands. Your whole showroom.</h2></div><span class="muted">U.S. retail vehicles</span></div><div class="brand-grid">${catalog.brands.map((b) => `<a class="manufacturer-card ${b.id}" href="#/search?brand=${b.id}">${mark(b.id)}<div><h3>${b.name}</h3><p>Explore models &amp; trim guides</p></div><span class="circle-arrow">${icon("arrow")}</span></a>`).join("")}</div></section>
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
    `<div class="content page-content">${breadcrumbs([{ label: "Model Guides" }])}<div class="page-heading"><span class="eyebrow">FIND YOUR NEXT ANSWER</span><h1>Model Guides</h1><p>Search models, verified trim names, and confirmed equipment.</p></div><div class="search-panel">${searchForm(options)}</div><div id="search-results"></div></div>`;
  attachSearch();
  renderSearchResults(options);
}
function renderSearchResults(options) {
  const { vehicles, glossary } = searchVehicles(
    directoryCatalog,
    features,
    options,
  );
  $("#search-results").innerHTML =
    `<div class="results-heading"><h2 aria-live="polite">Model guides <span class="count">${vehicles.length}</span></h2><button class="button small secondary" id="clear-filters">Clear filters</button></div><p class="muted search-note">Feature and trim searches match verified data only. Unreviewed guides are searchable by manufacturer, model, and year.</p>${vehicles.length ? `<div class="vehicle-grid">${vehicles.map(vehicleCard).join("")}</div>` : `<div class="empty-state">${icon("search")}<h3>No matching guides yet</h3><p>Try a model name or remove a filter. ${options.year === "2027" ? escape(catalog.coverageNotes["2027"]) : "A feature search returning no results does not mean the feature is unavailable; it may not yet be verified."}</p><a href="#/search" class="text-link">Browse all available guides ${icon("arrow")}</a></div>`}${glossary.length && options.query ? `<section class="section-block"><h2>Equipment glossary <span class="count">${glossary.length}</span></h2><p class="muted">General explanations, not evidence of model-specific availability.</p>${featureCards(glossary)}</section>` : ""}`;
  applySalesLabels($("#search-results"));
  $("#clear-filters").onclick = () => {
    $("#vehicle-search").value = "";
    $("#brand-filter").value = "";
    $("#year-filter").value = "";
    updateSearch(false);
  };
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
function cellHTML(cell, { audit = false, vehicle = null } = {}) {
  const shown = audit ? cell : salesCell(cell);
  const labels = {
    standard: "Standard",
    optional: "Available (Optional)",
    unavailable: "Not Offered",
    "not-standard": "Not standard",
    "not-applicable": audit ? "Not Applicable" : "N/A",
    unverified: audit ? "Unverified" : "N/A",
  };
  const tooltip =
    !audit && ["unverified", "not-applicable"].includes(shown.status)
      ? ` title="${shown.status === "unverified" ? "N/A — information not yet verified" : "N/A — not applicable to this configuration"}"`
      : "";
  const owner =
    vehicle ||
    catalog.vehicles.find((v) =>
      shown.sourceIds?.some((id) =>
        v.sources.some((source) => source.id === id),
      ),
    );
  return `<span class="equipment-status ${shown.status === "not-standard" ? "unavailable" : shown.status}"${tooltip}>${labels[shown.status]}</span>${shown.value ? `<span class="cell-value">${escape(audit ? shown.value : salesText(shown.value))}</span>` : ""}${shown.conditions ? `<small>${escape(shown.conditions)}</small>` : ""}${
    shown.featureIds?.length
      ? `<span class="cell-features">${shown.featureIds
          .map((id) => features.find((f) => f.id === id))
          .filter(Boolean)
          .map(
            (f) =>
              `<a class="text-link" href="#/features?q=${encodeURIComponent(f.name)}">${escape(f.name)} ⓘ</a>`,
          )
          .join("")}</span>`
      : ""
  }${shown.sourceIds?.length ? `<small class="source-reference">${audit ? `Source: ${escape(citationText(shown.sourceIds, shown.sourcePages, shown.sourceCells, shown.sourceSections))}` : `<button class="text-link source-link" type="button" data-view-sources="${escape(owner?.id || "")}">Source: ${escape(citationText(shown.sourceIds, shown.sourcePages, shown.sourceCells, shown.sourceSections))}</button>`}</small>` : ""}`;
}
function rowsTable(vehicles, rows, kind = "equipment", baselineId = null) {
  return `<div class="table-scroll" tabindex="0" role="region" aria-label="${kind === "baseline" ? "Base Equipment" : kind === "packages" ? "Packages and listed options" : "Equipment comparison"}, scroll horizontally"><table class="equipment-table" data-comparison-table="${kind}"><thead><tr><th scope="col">${kind === "packages" ? "Package / option" : "Equipment"}</th>${vehicles.map(({ vehicle: v, trim: t }) => `<th scope="col"><span>${v.year} ${escape(v.model)}</span>${escape(t.name)}<button class="text-link source-link" type="button" data-view-sources="${escape(v.id)}" data-source-trim="${escape(t.id)}">View Sources</button>${t.configuration ? `<small>${escape(t.configuration)}</small>` : ""}${`${v.id}:${t.id}` === baselineId ? `<small class="baseline-column-label">Baseline</small>` : ""}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr><th scope="row"><small>${escape(row.group)}</small>${escape(row.label)}</th>${row.cells.map((c, i) => `<td>${cellHTML(c, { vehicle: vehicles[i].vehicle })}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
function comparisonViewControls(prefix) {
  return `<fieldset class="comparison-view-switch"><legend class="sr-only">Comparison view</legend><label><input type="radio" name="${prefix}-view" id="${prefix}-view-differences" value="differences" checked> Differences Only</label><label><input type="radio" name="${prefix}-view" id="${prefix}-view-all" value="all"> All Equipment</label></fieldset>`;
}
function comparisonView(options, differenceOnly = true, group = "") {
  if (options.length < 2)
    return '<div class="empty-state compact"><h2>Select at least two configurations</h2><p>Choose two to four trims to compare their standard equipment.</p></div>';
  const projected = salesOptions(options);
  const rows = comparisonRows(catalog, projected, { differenceOnly, group });
  const reasons = standardReasons(catalog, projected);
  const why = `<section class="comparison-upgrades" id="why-upgrade"><h3>Why Upgrade?</h3>${reasons.length ? reasons.map(({ from, to, gains }) => `<article><h4>${escape(from.trim.name)} → ${escape(to.trim.name)}</h4><p class="comparison-note">${from.vehicle.year} ${escape(from.vehicle.model)} · ${escape(from.trim.configuration || "Matched configurations")}</p><ul>${gains.map((g) => `<li><strong>${escape(g.label)}:</strong> ${cellHTML(g.cell, { vehicle: to.vehicle })}${g.before.status === "not-standard" ? `<small>Not standard on ${escape(from.trim.name)}.</small>` : `<small>${escape(from.trim.name)}: ${escape(g.before.value)}</small>`}</li>`).join("")}</ul></article>`).join("") : '<p class="muted">No additional verified standard-equipment gains are established for this selection. Compare different trims with matching drivetrains for upgrade context.</p>'}</section>`;
  return `<section class="${differenceOnly ? "what-changes" : "all-equipment-view"}"><h3>${differenceOnly ? "What Changes" : "All Equipment"}</h3><p class="comparison-note">Factory-standard equipment only. Essential common mechanical specifications remain visible for context. Not standard does not mean unavailable. N/A means not yet verified or not applicable; View Sources retains the original distinctions.</p>${rows.length ? rowsTable(projected, rows) : '<p class="muted">No verified standard-equipment differences in this category.</p>'}${new Set(options.map((o) => o.vehicle.id)).size === 1 ? why : ""}</section>`;
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
function citationText(ids = [], pages = {}, cells = {}, sections = {}) {
  return ids
    .map((id) => {
      const source = catalog.vehicles
        .flatMap((v) => v.sources)
        .find((s) => s.id === id);
      return `${source?.shortLabel || id}${pages[id] ? ` pp. ${pages[id]}` : ""}${cells[id]?.length ? ` · ${cells[id].join(", ")}` : ""}${sections[id] ? ` · ${sections[id]}` : ""}`;
    })
    .join(", ");
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
  const peers = vehicle.trims
    .filter(
      (peer) =>
        peer.name !== trim.name && evidenceReady(vehicle, peer.sourceIds),
    )
    .map((peer) => ({ vehicle, trim: peer }));
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
      return `<div><dt>${label}</dt><dd>${cell.status === "unverified" ? '<span class="equipment-status unverified" title="N/A — information not yet verified">N/A</span>' : escape(cell.value)}${cell.sourceIds?.length ? `<small>${escape(citationText(cell.sourceIds, cell.sourcePages))}</small>` : ""}</dd></div>`;
    })
    .join(
      "",
    )}</dl><h4>Equipment highlights</h4><ul class="trim-highlights">${highlights.length ? highlights.map((id) => `<li>${escape(resolveCell(vehicle, trim, id).value)}</li>`).join("") : "<li>Standard equipment details await verification.</li>"}</ul><div class="trim-card-actions"><button class="button primary" data-trim-action="equipment" data-option="${escape(option.id)}">View Equipment</button><button class="button secondary" data-trim-action="compare" data-option="${escape(option.id)}">Find Your Differences</button></div></div></article>`;
}
function trimExplorerHTML(vehicle, options) {
  if (!options.length) return "";
  const groups = trimGroups(options);
  return `<section id="trim-lineup" class="section-block trim-lineup"><div class="section-heading"><div><span class="eyebrow">LEARN THE LINEUP</span><h2>Find your trim. Know the difference.</h2><p class="muted">${groups.length} verified trim${groups.length === 1 ? "" : "s"} · ${options.length} configuration${options.length === 1 ? "" : "s"}. Choose a drivetrain to see its own specifications.</p></div></div><div class="trim-card-grid">${groups.map((group, i) => trimCardHTML(vehicle, group, i)).join("")}</div><p class="comparison-note">Highlights are selected from documented standard equipment; they are not claims that other trims lack those features. N/A values remain distinguished from confirmed absence.</p></section>`;
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
        (f) =>
          (convenience.has(f.id) ? "Convenience" : f.group) === category &&
          resolveCell(vehicle, trim, f.id).status === "standard",
      );
      if (!fields.length) return "";
      return `<details class="equipment-category" ${category === "Performance" ? "open" : ""}><summary><span>${category}</span><small>${fields.length} standard</small></summary><dl class="categorized-fields">${fields.map((f) => `<div><dt>${escape(f.label)}</dt><dd>${cellHTML(resolveCell(vehicle, trim, f.id), { vehicle })}</dd></div>`).join("")}</dl></details>`;
    })
    .join("");
  return (
    sections ||
    "<p>Factory-standard equipment is awaiting manufacturer verification.</p>"
  );
}
function modelYearChangesHTML(vehicle) {
  const review = vehicle.modelYearChanges;
  if (review?.basis === "manufacturer-highlights")
    return `<section id="model-year-changes" class="section-block detail-panel"><h2>What's New for ${vehicle.year}</h2><p>Changes documented by GM in the manufacturer Highlights worksheet.</p><ul>${visibleYearChanges(
      vehicle,
    )
      .filter((item) => evidenceReady(vehicle, item.sourceIds))
      .map(
        (item) =>
          `<li><p>${escape(item.text)}<br><small>Source: ${escape(citationText(item.sourceIds, item.sourcePages, item.sourceCells))}</small></p></li>`,
      )
      .join("")}</ul></section>`;
  const baseline = catalog.vehicles.find(
    (v) => v.id === review?.baselineVehicleId,
  );
  if (!baseline) return "";
  const items = visibleYearChanges(vehicle).filter(
    (item) =>
      evidenceReady(vehicle, item.sourceIds) &&
      evidenceReady(baseline, item.baselineSourceIds),
  );
  return `<section id="model-year-changes" class="section-block detail-panel"><h2>What's New for ${vehicle.year}</h2><p>Compared with the reviewed <a class="text-link" href="#/model/${escape(baseline.id)}">${baseline.year} ${escape(baseline.model)} guide</a>. These are documented changes; missing listings alone do not establish removal.</p><ul>${items.map((item) => `<li><p>${escape(item.text)}<br><small>Sources: ${baseline.year} ${escape(citationText(item.baselineSourceIds, item.baselineSourcePages))}; ${vehicle.year} ${escape(citationText(item.sourceIds, item.sourcePages))}</small></p></li>`).join("")}</ul></section>`;
}
function colorsPanelHTML(v) {
  if (!v.colors) return "";
  return `<section id="color-section" class="detail-panel color-reference"><h2>Exterior &amp; interior colors</h2><p class="muted">Manufacturer color references, not dealership inventory or standard-equipment claims. Color combinations vary by trim and interior.</p><h3>Exterior colors</h3><div class="table-scroll" tabindex="0" role="region" aria-label="Exterior color reference, scroll horizontally"><table class="equipment-table"><thead><tr><th scope="col">Color</th><th scope="col">Trim reference</th></tr></thead><tbody>${(v.colors?.exteriors || []).map((c) => `<tr><th scope="row">${escape(c.name)}${c.extraCost ? " (extra-cost paint)" : ""}</th><td>${c.trims.map(escape).join(", ")}<small>${escape(citationText(c.sourceIds, c.sourcePages, c.sourceCells))}</small></td></tr>`).join("")}</tbody></table></div>${v.colors.roofs?.length ? `<h3>Roof color references</h3>${v.colors.roofs.map((c) => `<details><summary>${escape(c.name)} — ${c.trims.map(escape).join(", ")}</summary>${c.combinations.map((combination) => `<p><strong>${escape(combination.trim)}:</strong> ${combination.exteriors.map(escape).join(", ")}</p>`).join("")}<small>${escape(citationText(c.sourceIds, c.sourcePages, c.sourceCells))}</small></details>`).join("")}` : ""}<h3>Interior colors &amp; materials</h3>${[
    ...new Set(v.trims.map((t) => t.name)),
  ]
    .map(
      (name) =>
        `<h4>${escape(name)}</h4><ul>${v.colors.interiors
          .filter((c) => c.trim === name)
          .map(
            (c) =>
              `<li>${escape(c.name)} — ${escape(c.material)}${c.standard ? " (standard interior)" : " (additional color/material reference)"}<br><small>${escape(citationText(c.sourceIds, c.sourcePages, c.sourceCells))}</small></li>`,
          )
          .join("")}</ul>`,
    )
    .join("")}</section>`;
}
function applySalesLabels(root = $("#main")) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode())
    walker.currentNode.textContent = salesText(walker.currentNode.textContent);
}
function guideContext(v, trim) {
  return `${v.year} ${brandName(v.brand)} ${v.model}${trim ? ` · ${trim.name} · ${trim.configuration || ""}` : ""}`;
}
function specificationsHTML(v, option) {
  const fields = equipmentFields(catalog, [v]).filter((f) =>
    specificationFields.has(f.id),
  );
  return `<p class="comparison-note">N/A may mean information has not yet been verified or does not apply. View Sources for the original verification state.</p><dl class="categorized-fields">${fields.map((f) => `<div><dt>${escape(f.label)}</dt><dd>${cellHTML(option ? resolveCell(v, option.trim, f.id) : { status: "unverified" }, { vehicle: v })}</dd></div>`).join("")}</dl>`;
}
function showSources(v, trimId, trigger = document.activeElement) {
  if (!v) return;
  const options = eligibleOptions(catalog).filter((o) => o.vehicle.id === v.id);
  const initial = options.find((o) => o.trim.id === trimId) || options[0];
  openReferenceDialog({
    title: "Sources & Verification",
    context: guideContext(v),
    trigger,
    content: `<p>Original manufacturer classifications and verification notes are retained here. N/A in the sales view does not establish absence.</p><ul class="source-list">${sourceLinks(v)}</ul>${v.sources.map((source) => `<p class="muted">${escape(source.shortLabel || source.id)}${source.fileName ? `: ${escape(source.fileName)}` : ""}${source.documentDate ? ` · Document date: ${date(source.documentDate)}` : ""}${source.dateBasis ? ` · ${escape(source.dateBasis)}` : ""}</p>`).join("")}<details><summary>Original guide notes</summary><p>${escape(v.summary)}</p>${v.notes.map((note) => `<p>${escape(note)}</p>`).join("")}${(v.sourcePageNotes || []).map((note) => `<p>${escape(citationText([note.sourceId], { [note.sourceId]: String(note.page) }))}: ${escape(note.text)}</p>`).join("")}${(v.modelYearChanges?.items || []).map((item) => `<p>${escape(item.text)}<br><small>${escape(citationText(item.sourceIds, item.sourcePages, item.sourceCells))}</small></p>`).join("")}${(v.modelYearChanges?.gaps || []).map((note) => `<p>${escape(note)}</p>`).join("")}</details>${initial ? `<label class="field-label" for="source-config">Verification for</label><select id="source-config" class="standalone-input">${options.map((o) => `<option value="${escape(o.trim.id)}" ${o.trim.id === initial.trim.id ? "selected" : ""}>${escape(o.trim.name)} · ${escape(o.trim.configuration || "")}</option>`).join("")}</select><div id="verification-audit"></div>` : "<p>No trim equipment has been source-verified.</p>"}`,
    onReady: (dialog) => {
      if (!initial) return;
      const render = () => {
        const option = options.find(
          (o) => o.trim.id === dialog.querySelector("#source-config").value,
        );
        dialog.querySelector("#verification-audit").innerHTML =
          `<details><summary>Equipment verification details</summary><dl class="categorized-fields">${equipmentFields(
            catalog,
            [v],
          )
            .map(
              (f) =>
                `<div><dt>${escape(f.label)}</dt><dd>${cellHTML(option.trim.equipment[f.id] || { status: "unverified", conditions: "No record in the reviewed manufacturer data." }, { audit: true, vehicle: v })}</dd></div>`,
            )
            .join("")}</dl></details>`;
      };
      dialog.querySelector("#source-config").onchange = render;
      render();
    },
  });
}
function modelPage(id) {
  const v = catalog.vehicles.find((v) => v.id === id);
  if (!v) return notFound();
  nav("/search");
  const options = eligibleOptions(catalog).filter((o) => o.vehicle.id === id),
    projected = salesOptions(options);
  const view = projected[0]?.vehicle || v;
  let activeId = options[0]?.id;
  let modelSelected = defaultModelSelection(options);
  const printed = printView(catalog, v, options);
  $("#main").innerHTML =
    `<div class="content page-content model-page">${breadcrumbs([{ label: "Model Guides", href: `#/search?brand=${v.brand}` }, { label: `${v.year} ${v.model}` }])}<div class="model-heading"><div><span class="eyebrow">${escape(brandName(v.brand))} · ${v.year} MODEL GUIDE</span><h1>${escape(v.model)}</h1><p>Factory-standard equipment, verified specifications and trim differences.</p><div class="model-meta">${statusBadge(v)}<span>Last verification: ${date(v.verifiedAt)}</span></div></div><div class="model-actions"><button class="button primary" id="print-reference">${icon("print")} Print Quick Reference</button><button class="text-link" id="view-sources">View Sources</button></div></div><div class="notice"><div><strong>STANDARD EQUIPMENT GUIDE</strong><p>${escape(standardEquipmentNotice)}</p><p>N/A means not yet verified or not applicable. It does not mean unavailable.</p></div></div><nav class="section-nav" aria-label="Model sections"><a href="#trim-section" data-scroll="trim-section">Find Your Differences</a><button type="button" id="view-equipment">View Equipment</button><a href="#equipment-explained" data-scroll="equipment-explained">Equipment Explained</a><a href="#specifications" data-scroll="specifications">Specifications</a>${v.colors ? '<a href="#color-section" data-scroll="color-section">Colors</a>' : ""}${v.modelYearChanges ? `<a href="#model-year-changes" data-scroll="model-year-changes">What's New for ${v.year}</a>` : ""}</nav>${trimExplorerHTML(view, projected)}<section id="trim-section" class="section-block"><div class="section-heading"><h2>Find Your Differences</h2></div><p class="comparison-note">Compare verified factory-standard equipment. Shared engine and transmission information stays visible.</p>${options.length ? `${modelTrimPicker(options, modelSelected)}<div class="table-controls">${comparisonViewControls("model")}<div class="category-control"><label for="model-group">Category</label><select id="model-group"><option value="">All categories</option>${[...new Set(catalog.fields.map((f) => f.group))].map((group) => `<option>${group}</option>`).join("")}</select></div></div><div id="model-equipment"></div>` : "<p>Trim structure and equipment are awaiting official manufacturer documentation. No specifications are carried over from another year.</p>"}</section><section id="specifications" class="section-block"><h2>Specifications</h2>${options.length ? `<label class="field-label" for="spec-config">Specifications for</label><select id="spec-config" class="standalone-input">${options.map((o) => `<option value="${escape(o.id)}">${escape(o.trim.name)} · ${escape(o.trim.configuration || "")}</option>`).join("")}</select>` : ""}<div id="specification-values"></div></section>${colorsPanelHTML(v)}${modelYearChangesHTML(v)}<section id="equipment-explained" class="section-block no-print"><h2>Equipment Explained</h2><p class="muted">Manufacturer terminology and system explanations. These explanations do not establish standard equipment on a particular trim.</p>${featureCards(features.filter((f) => f.brand === v.brand))}</section><p class="no-print"><button class="text-link" id="view-sources-bottom">View Sources</button></p><section class="print-reference" aria-label="Printable quick reference">${printSheet(printed.vehicle, printed.options)}</section></div>`;
  const active = () => options.find((o) => o.id === activeId) || options[0];
  const renderSpecs = () => {
    $("#specification-values").innerHTML = specificationsHTML(v, active());
    if ($("#spec-config")) $("#spec-config").value = activeId;
  };
  const setActive = (id) => {
    activeId = id;
    renderSpecs();
  };
  const showEquipment = (trigger) => {
    const chosen = active();
    openReferenceDialog({
      title: "Standard Equipment",
      context: guideContext(v, chosen?.trim),
      trigger,
      content: `${options.length ? `<label class="field-label" for="equipment-config">Equipment for</label><select id="equipment-config" class="standalone-input">${options.map((o) => `<option value="${escape(o.id)}" ${o.id === activeId ? "selected" : ""}>${escape(o.trim.name)} · ${escape(o.trim.configuration || "")}</option>`).join("")}</select>` : ""}<div id="categorized-equipment"></div>`,
      onReady: (dialog) => {
        const render = () => {
          const raw = active(),
            option = projected.find((o) => o.id === raw?.id);
          dialog.querySelector("#reference-context").textContent = guideContext(
            v,
            raw?.trim,
          );
          dialog.querySelector("#categorized-equipment").innerHTML = option
            ? categorizedEquipmentHTML(option.vehicle, option.trim)
            : "<p>Factory-standard equipment is awaiting manufacturer verification.</p>";
        };
        const select = dialog.querySelector("#equipment-config");
        if (select)
          select.onchange = () => {
            setActive(select.value);
            render();
          };
        render();
      },
    });
  };
  $("#view-equipment").onclick = (event) => showEquipment(event.currentTarget);
  for (const selector of ["#view-sources", "#view-sources-bottom"])
    $(selector).onclick = (event) =>
      showSources(v, active()?.trim.id, event.currentTarget);
  $("#print-reference").onclick = () => window.print();
  if ($("#spec-config"))
    $("#spec-config").onchange = (event) => setActive(event.target.value);
  renderSpecs();
  document.querySelectorAll("[data-scroll]").forEach(
    (link) =>
      (link.onclick = (event) => {
        event.preventDefault();
        const target = document.getElementById(link.dataset.scroll);
        target.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        });
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }),
  );
  if (!options.length) return;
  const update = () => {
    $("#model-selected-count").textContent = modelSelected.length;
    $("#model-equipment").innerHTML = comparisonView(
      options.filter((o) => modelSelected.includes(o.id)),
      !$("#model-view-all").checked,
      $("#model-group").value,
    );
  };
  $(".trim-card-grid").addEventListener(
    "error",
    (event) => {
      if (event.target.matches(".trim-card-visual img"))
        event.target.parentElement.remove();
    },
    true,
  );
  const groups = trimGroups(projected);
  $(".trim-card-grid").onchange = (event) => {
    if (!event.target.matches(".card-configuration")) return;
    const index = Number(
      event.target.closest("[data-grade-index]").dataset.gradeIndex,
    );
    const id = event.target.value;
    setActive(id);
    event.target.closest(".trim-training-card").outerHTML = trimCardHTML(
      view,
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
    setActive(button.dataset.option);
    if (button.dataset.trimAction === "equipment") showEquipment(button);
    else {
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
  update();
}
function standardOnlyPrintHTML(v, options, performance) {
  const specs = (v.quickReference.standardSpecFields || [])
    .map((id) => {
      const groups = new Map();
      for (const o of options) {
        const cell = resolveCell(v, o.trim, id);
        if (cell.status !== "standard") continue;
        if (!groups.has(cell.value)) groups.set(cell.value, []);
        groups.get(cell.value).push(o.trim);
      }
      const label =
        equipmentFields(catalog, [v]).find((f) => f.id === id)?.label || id;
      return groups.size
        ? `<p><strong>${escape(label)}:</strong> ${[...groups].map(([value, trims]) => `${groups.size > 1 ? [...new Set(trims.map((t) => t.configuration))].map(escape).join("/") + ": " : ""}${escape(value)}`).join("; ")}</p>`
        : "";
    })
    .join("");
  return `<h2>Powertrain / capability</h2>${performance}<h2>Specifications</h2>${specs}${v.colors?.exteriors?.length ? `<h2>Color references</h2><p>${v.colors.exteriors.map((c) => `${escape(c.name)} (${c.trims.map(escape).join("/")})`).join("; ")}.</p>` : ""}${v.modelYearChanges?.items?.length ? `<h2>What's New for ${v.year}</h2><p>${v.modelYearChanges.items.map((i) => escape(i.text)).join("; ")}.</p>` : ""}`;
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
                : `${{ standard: "S", "not-standard": "Not standard", "not-applicable": "N/A" }[c.status]}${c.value ? `: ${c.value}` : ""}`,
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
  return `<header><strong>FOX AUTOMOTIVE · QUICK REFERENCE</strong><span>${v.year} ${escape(brandName(v.brand))} ${escape(v.model)}${isHEV ? " Hybrid" : ""}</span></header><p class="print-status">Reviewed ${date(v.verifiedAt)} · ${isHEV ? `HEV only — ${new Set(options.map((o) => o.trim.name)).size} grades / ${options.length} configurations. PHEV has a separate guide.` : isGasoline ? `${new Set(options.map((o) => o.trim.name)).size} gasoline trims / ${options.length} configurations. Full equipment and source pages in the online guide.` : isElectric ? `${new Set(options.map((o) => o.trim.name)).size} battery-electric trims / ${options.length} configurations. Full equipment and source pages in the online guide.` : "PHEV only — release-supported facts; detailed specification review pending."} · S = Standard; N/A = not yet verified or not applicable.</p><div class="compact-print-grid"><div><h2>Important standard trim differences</h2><table class="print-grade-table"><thead><tr><th>Grade / configuration</th><th>Source-backed equipment</th></tr></thead><tbody>${refs.groups.map((g) => `<tr><th>${escape(g.label)}</th><td>${renderFields(g)}</td></tr>`).join("")}</tbody></table><h2>What customers gain</h2>${v.upgrades.map((u) => `<p><strong>${escape(u.from)} → ${escape(u.to)}:</strong> ${escape(u.gains[0].text)}</p>`).join("")}<h2>Common equipment</h2><p>${common.map(escape).join("; ")}.</p></div><div>${standardOnlyPrintHTML(v, options, performance)}<h2>Verification limits</h2>${refs.caveats.map((c) => `<p>${escape(c.text)}</p>`).join("")}</div></div><footer><strong>${escape(standardEquipmentNotice)}</strong><p>${sources.map((s) => `${escape(s.shortLabel || s.id)}: ${escape(s.title)} — ${escape(s.url)} (reviewed ${date(s.checkedAt)})`).join("<br>")}</p></footer>`;
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
      ? `<h1>${v.year} ${escape(v.model)}</h1><h2>Official equipment research is pending.</h2><p>Trim levels, powertrain and drivetrain options, standard equipment and upgrade reasons have not been verified. Do not use this page to make equipment claims.</p>`
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
          )}<section><h2>Reasons to upgrade</h2>${v.upgrades.map((u) => `<p><strong>${escape(u.from)} → ${escape(u.to)}</strong>: ${u.gains.map((g) => escape(g.text)).join("; ")}</p>`).join("") || "<p>Awaiting verification.</p>"}</section></div>`
  }<footer><strong>Verify the actual window sticker. Equipment depends on configuration and packages.</strong><p>${v.sources.map((s) => `${escape(s.title)} — ${escape(s.url)} ${s.checkedAt ? `(reviewed ${date(s.checkedAt)})` : "(not reviewed)"}`).join("<br>")}</p></footer>`;
}
function comparePage() {
  nav("/compare");
  const options = eligibleOptions(catalog);
  selected = selected.filter((id) => options.some((o) => o.id === id));
  $("#main").innerHTML =
    `<div class="content page-content">${breadcrumbs([{ label: "Compare Models" }])}<div class="page-heading"><span class="eyebrow">A CLEARER CONVERSATION</span><h1>Compare Models</h1><p>Compare two to four verified vehicle configurations, within a brand or across the showroom.</p></div><div class="notice">${icon("shield")} Only source-verified configurations can be selected. Different availability or verification states stay visible; an Unverified cell does not establish that equipment is unavailable.</div>${options.length ? `<div class="compare-picker"><label for="compare-select">Add a vehicle &amp; trim</label><div><select id="compare-select"><option value="">Choose a verified configuration</option>${options.map((o) => `<option value="${o.id}">${o.vehicle.year} ${escape(brandName(o.vehicle.brand))} ${escape(o.vehicle.model)} · ${escape(o.trim.name)}${o.trim.configuration ? ` · ${escape(o.trim.configuration)}` : ""}</option>`).join("")}</select><button id="add-compare" class="button primary">Add to comparison +</button></div><p class="muted">Up to four configurations. Model years, trims and drivetrains remain distinct.</p></div><div id="compare-selection"></div><div class="table-controls">${comparisonViewControls("compare")}</div><div id="comparison-results"></div>` : `<div class="empty-state comparison-empty"><span class="empty-emblem">${icon("compare")}</span><h2>The tool is ready. The evidence comes first.</h2><p>Comparisons will become available as model-year equipment and trims are verified. We won’t imply a difference using unconfirmed specifications.</p><div class="comparison-examples"><span>Equinox ↔ RAV4 ↔ Tiguan</span><span>Traverse ↔ Grand Highlander ↔ Atlas</span><span>Trax ↔ Corolla Cross ↔ Taos</span></div><small>Planned research groups · availability and equipment not verified</small><a class="button secondary" href="#/search">Browse model guides ${icon("arrow")}</a></div>`}</div>`;
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
function offerCard(o) {
  const money = (value) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  const number = (value) => value.toLocaleString("en-US");
  const row = (label, value) =>
    value === undefined
      ? ""
      : `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`;
  const amount = (value) => (value === undefined ? undefined : money(value));
  const details = [
    ["Stock number", o.stockNumber],
    ["VIN", o.vin],
    ["VIN (last 8)", o.vinLast8],
    ["MSRP", amount(o.msrp)],
    ["Selling price", amount(o.sellingPrice)],
    ["Lender", o.lender],
    ["Payment including tax", amount(o.paymentIncludingTax)],
    ["Down payment", amount(o.downPayment)],
    ["Qualifications / notes", o.notes],
  ].filter(([, value]) => value !== undefined);
  return `<article class="special-offer" data-offer-id="${escape(o.id)}"><span class="eyebrow">${escape(offerTypes[o.type])}</span><h3>${o.year} ${escape(manufacturers[o.manufacturer])} ${escape(o.model)} ${escape(o.trim)}</h3>${o.monthlyPayment !== undefined ? `<p class="special-payment">${money(o.monthlyPayment)}<span> / month</span></p>` : ""}<dl class="special-facts">${row("Purchase price", amount(o.purchasePrice))}${row("APR", o.apr === undefined ? undefined : `${o.apr}%`)}${row("Due at signing", amount(o.dueAtSigning))}${row(o.type === "lease" ? "Lease term" : "Term", o.termMonths === undefined ? undefined : `${o.termMonths} months`)}${row("Annual mileage", o.annualMileage === undefined ? undefined : `${number(o.annualMileage)} miles`)}${row("Expiration date", date(o.expiresOn))}</dl>${details.length ? `<details><summary>Full Offer Details</summary><dl class="special-facts special-details">${details.map(([label, value]) => row(label, value)).join("")}</dl></details>` : ""}</article>`;
}
async function specialsPage() {
  nav("/specials");
  document.title = "Current Specials · Fox Automotive";
  let disposed = false;
  let timer;
  const refresh = () => checkDate();
  disposeSpecials = () => {
    disposed = true;
    clearInterval(timer);
    document.removeEventListener("visibilitychange", refresh);
  };
  $("#main").innerHTML =
    `<div class="content page-content">${breadcrumbs([{ label: "Current Specials" }])}<div class="page-heading"><h1>Current Specials</h1><p>Internal reference for salespeople and managers.</p></div><p id="specials-loading" role="status">Loading current offers…</p><div id="specials-content"></div></div>`;
  let data, currentDay;
  function checkDate() {
    if (
      !disposed &&
      data &&
      currentDay !== dealershipDate(new Date(), data.timeZone)
    )
      render();
  }
  function render() {
    currentDay = dealershipDate(new Date(), data.timeZone);
    const manufacturer = $("#special-manufacturer").value;
    const type = $("#special-type").value;
    const offers = activeOffers(data, { manufacturer, type });
    const brands = manufacturer ? [manufacturer] : Object.keys(manufacturers);
    $("#special-results").innerHTML =
      `<p class="muted" role="status">${offers.length} active ${offers.length === 1 ? "offer" : "offers"}</p>` +
      brands
        .map((brand) => {
          const matches = offers.filter((o) => o.manufacturer === brand);
          return `<section class="special-brand" aria-labelledby="special-${brand}"><h2 id="special-${brand}">${manufacturers[brand]}</h2>${matches.length ? `<div class="special-grid">${matches.map(offerCard).join("")}</div>` : `<p class="notice">No current ${type ? offerTypes[type].toLowerCase() + " " : ""}offers are available for ${manufacturers[brand]}.</p>`}</section>`;
        })
        .join("");
  }
  try {
    const response = await fetch(
      new URL("./data/specials.json", import.meta.url),
      { cache: "no-cache" },
    );
    if (!response.ok) throw new Error("Offers could not be loaded.");
    data = await response.json();
    if (validateSpecials(data).length) throw new Error("Invalid offer data.");
    if (disposed) return;
    $("#specials-loading").remove();
    $("#specials-content").innerHTML =
      `<div class="special-filters"><div><label for="special-manufacturer">Manufacturer</label><select id="special-manufacturer"><option value="">All Brands</option>${Object.entries(
        manufacturers,
      )
        .map(([key, name]) => `<option value="${key}">${name}</option>`)
        .join(
          "",
        )}</select></div><div><label for="special-type">Offer Type</label><select id="special-type"><option value="">All Offers</option>${Object.entries(
        offerTypes,
      )
        .map(([key, name]) => `<option value="${key}">${name}</option>`)
        .join("")}</select></div></div><div id="special-results"></div>`;
    $("#special-manufacturer").onchange = render;
    $("#special-type").onchange = render;
    render();
    timer = setInterval(checkDate, 1000);
    document.addEventListener("visibilitychange", refresh);
  } catch {
    if (disposed) return;
    $("#specials-loading").innerHTML =
      `Current offers couldn’t load. <button class="button secondary" id="retry-specials">Try again</button>`;
    $("#retry-specials").onclick = () => {
      disposeSpecials();
      specialsPage();
    };
  }
}
function aboutPage() {
  nav("");
  $("#main").innerHTML =
    `<div class="content page-content narrow">${breadcrumbs([{ label: "Sources & content standards" }])}<div class="page-heading"><span class="eyebrow">CONFIDENCE STARTS WITH ACCURACY</span><h1>A reference you can check.</h1><p>Our standards for building the Fox Automotive knowledge library.</p></div><section class="prose-panel"><h2>Official sources. Specific model years.</h2><p>Vehicle claims must be supported by U.S. manufacturer specifications, brochures, equipment documents, or official model-year releases. A source link alone is not verification: it must be reviewed and tied to the precise model year and configuration.</p><h2>Equipment states</h2><dl class="status-definitions"><dt>Standard</dt><dd>Included with the specified trim and configuration.</dd><dt>Not standard</dt><dd>Not factory-standard on this configuration. This does not mean unavailable.</dd><dt>N/A</dt><dd>Information has not yet been verified or does not apply. View Sources retains the original status, including optional and not-offered classifications.</dd></dl><h2>Current library coverage</h2><p>${escape(catalog.coverageNotes["2026"])}</p><p>${escape(catalog.coverageNotes["2027"])}</p><p>Each claim has its own verification state and source. Sales views show factory-standard equipment; the original manufacturer classifications remain in View Sources. The PHEV guide is separate from the HEV brochure tables. Glossary review states are shown per entry and do not independently establish equipment availability.</p><h2>Confirm the actual vehicle</h2><p>Use the vehicle’s window sticker to confirm installed equipment. Packages, drivetrain, production changes, region, and service subscriptions can affect features. Driver-assistance systems do not replace an attentive driver.</p><h2>Maintaining the library</h2><p>Catalog records live in <code>data/catalog.json</code>; equipment explanations live in <code>data/features.json</code>. Maintainer documentation in the repository explains source records, evidence checks, configurations, upgrade guides, and publishing.</p><h2>Internal reference, public website</h2><p>This resource is intended for the Fox Automotive sales team. GitHub Pages is publicly accessible. Do not add customer information, private pricing, employee data, credentials, or confidential documents.</p></section></div>`;
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
  disposeSpecials();
  clearTimeout(searchTimer);
  closeReferenceDialog({ restoreFocus: false });
  let [path, query = ""] = (location.hash.slice(1) || "/").split("?");
  const params = new URLSearchParams(query);
  if (path.startsWith("/brand/")) {
    params.set("brand", path.split("/")[2]);
    path = "/search";
    history.replaceState(null, "", `#${path}?${params}`);
  }
  if (path === "/compare-vehicles") {
    path = "/compare";
    history.replaceState(null, "", "#/compare");
  }
  if (path === "/equipment-search") {
    path = "/search";
    history.replaceState(
      null,
      "",
      `#/search${params.size ? `?${params}` : ""}`,
    );
  }
  document.title = path.startsWith("/model/")
    ? `${catalog.vehicles.find((v) => v.id === path.split("/")[2])?.model || "Model guide"} · Fox Automotive`
    : "Fox Automotive · Sales Resource Center";
  if (path === "/") home();
  else if (path === "/search") searchPage(params);
  else if (path.startsWith("/model/")) modelPage(path.split("/")[2]);
  else if (path === "/compare") comparePage();
  else if (path === "/features") glossaryPage(params);
  else if (path === "/specials") specialsPage();
  else if (path === "/about") aboutPage();
  else notFound();
  applySalesLabels();
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
    const views = new Map(
      salesOptions(eligibleOptions(catalog)).map((o) => [
        o.vehicle.id,
        o.vehicle,
      ]),
    );
    directoryCatalog = {
      ...catalog,
      vehicles: catalog.vehicles.map((v) => views.get(v.id) || v),
    };
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
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-view-sources]");
  if (!button) return;
  const v = catalog?.vehicles.find((v) => v.id === button.dataset.viewSources);
  showSources(v, button.dataset.sourceTrim, button);
});
init();
