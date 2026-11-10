import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fixtureVehicle } from "./fixtures.mjs";
import { equipmentFields, evidenceReady } from "../lib.js";
const catalog = JSON.parse(
  await readFile(new URL("../data/catalog.json", import.meta.url), "utf8"),
);
async function useFixtures(page) {
  await page.route("**/data/catalog.json", (route) =>
    route.fulfill({
      json: {
        ...catalog,
        vehicles: [
          fixtureVehicle(),
          fixtureVehicle({
            id: "fixture-b",
            brand: "chevrolet",
            model: "Fixture B",
          }),
        ],
      },
    }),
  );
}

test("global search, filters, empty states, and clear filters", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("searchbox").fill("RAV4");
  await page.getByRole("button", { name: "Search library" }).click();
  await expect(page.locator(".vehicle-card")).toHaveCount(2);
  await expect(page.locator(".vehicle-card h3").first()).toContainText("RAV4");
  await page.getByLabel("Model year", { exact: true }).selectOption("2027");
  await expect(
    page.getByRole("heading", { name: "No matching guides yet" }),
  ).toBeVisible();
  await expect(page.locator(".vehicle-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".vehicle-card")).toHaveCount(
    catalog.vehicles.length,
  );
  await page.getByRole("searchbox").fill("Super Cruise");
  await expect(page.locator(".vehicle-card")).toHaveCount(0);
  await expect(page.locator(".feature-card")).toHaveCount(1);
  await page.getByRole("searchbox").fill("<img src=x onerror=alert(1)>");
  await expect(page.locator(".vehicle-card")).toHaveCount(0);
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
});
test("glossary expands and can be searched with the keyboard shortcut", async ({
  page,
}) => {
  await page.goto("./#/features");
  await expect(page.locator(".feature-card")).toHaveCount(13);
  await page.keyboard.press("/");
  await expect(page.getByRole("searchbox")).toBeFocused();
  await page.getByRole("searchbox").fill("4MOTION");
  await expect(page.locator(".feature-card")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Know the limits" }),
  ).toBeVisible();
  await page.locator(".feature-card summary").click();
  await expect(page.locator(".feature-body")).toBeHidden();
  await page.locator(".feature-card summary").click();
  await expect(
    page.getByRole("heading", { name: "Know the limits" }),
  ).toBeVisible();
});
test("mobile layouts do not overflow the viewport", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    "",
    "/search",
    "/brand/volkswagen",
    "/model/2026-chevrolet-equinox",
    "/model/2026-toyota-rav4",
    "/model/2026-toyota-rav4-plug-in-hybrid",
    "/features",
    "/compare",
    "/specials",
  ]) {
    await page.goto(`./#${path || "/"}`);
    await expect(page.locator(".loading")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      path,
    ).toBe(true);
  }
  await page.goto("./");
  await expect(page.locator(".manufacturer-card")).toHaveCount(3);
  await page.screenshot({
    path: testInfo.outputPath("mobile-home.png"),
    fullPage: true,
  });
});
test("desktop homepage has no console or HTTP errors and unknown routes recover", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("./");
  await expect(page.locator(".manufacturer-card")).toHaveCount(3);
  await page.screenshot({
    path: testInfo.outputPath("desktop-home.png"),
    fullPage: true,
  });
  await page.goto("./#/missing");
  await expect(
    page.getByRole("heading", { name: "That guide isn’t in the library." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to home" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Know the vehicle. Build the confidence.",
    }),
  ).toBeVisible();
});

test("key routes meet automated WCAG A/AA accessibility checks", async ({
  page,
}) => {
  test.setTimeout(90000);
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  const violations = [];
  for (const route of [
    "/",
    "/search",
    "/brand/toyota",
    "/model/2026-toyota-rav4",
    "/model/2026-volkswagen-tiguan",
    "/model/2027-volkswagen-atlas",
    "/model/2027-volkswagen-taos",
    "/features",
    "/compare",
    "/specials",
    "/compare-vehicles",
    "/equipment-search",
    "/about",
  ]) {
    await page.goto(`./#${route}`);
    await expect(page.locator(".loading")).toHaveCount(0);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    violations.push(
      ...result.violations.map((v) => ({
        route,
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    );
  }
  expect(violations).toEqual([]);
});
test("tablet and narrow-mobile pages fit without document overflow", async ({
  page,
}) => {
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./");
    await expect(page.locator(".manufacturer-card")).toHaveCount(3);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `viewport ${width}`,
    ).toBe(true);
  }
});
test("a library loading failure gives a usable retry screen", async ({
  page,
}) => {
  await page.route("**/data/catalog.json", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "The library couldn’t load." }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("real RAV4 HEV/PHEV configurations are searchable and comparable", async ({
  page,
}) => {
  await page.goto("./#/search?q=heated%20steering&brand=toyota");
  await expect(page.locator(".vehicle-card")).toHaveCount(5);
  await page.goto("./#/compare");
  await page
    .locator("#compare-select")
    .selectOption("2026-toyota-rav4:se-hev-awd");
  await page.getByRole("button", { name: "Add to comparison" }).click();
  await page
    .locator("#compare-select")
    .selectOption("2026-toyota-rav4:xse-hev-awd");
  await page.getByRole("button", { name: "Add to comparison" }).click();
  await expect(
    page.locator('[data-comparison-table="equipment"]'),
  ).toContainText("10.5-inch");
  await expect(
    page.locator('[data-comparison-table="equipment"]'),
  ).toContainText("12.9-inch");
});
test("trim imagery requires source evidence and renders only the verified record", async ({
  page,
}) => {
  const vehicle = fixtureVehicle();
  vehicle.trims[0].image = {
    src: "assets/favicon.svg",
    alt: "Synthetic verified image fixture",
    modelYear: vehicle.year,
    trimName: vehicle.trims[0].name,
    sourceIds: ["test-source"],
  };
  vehicle.trims[1].image = {
    src: "assets/not-real.png",
    alt: "Unverified image fixture",
    modelYear: vehicle.year,
    trimName: vehicle.trims[1].name,
    sourceIds: ["missing-source"],
  };
  await page.route("**/data/catalog.json", (route) =>
    route.fulfill({ json: { ...catalog, vehicles: [vehicle] } }),
  );
  await page.goto("./#/model/fixture-a");
  await expect(page.locator(".trim-card-visual img")).toHaveCount(1);
  const image = page.getByAltText("Synthetic verified image fixture");
  await expect(image).toBeVisible();
  expect(
    await image.evaluate((img) => img.complete && img.naturalWidth > 0),
  ).toBe(true);
  await expect(page.locator(".trim-image-placeholder")).toHaveCount(0);
  await expect(page.locator(".trim-card-visual")).toHaveCount(1);
});

test("optional trim images reject a different grade/year or external hotlink and failed files collapse", async ({
  page,
}) => {
  let imageCase = "missing";
  await page.route("**/data/catalog.json", (route) => {
    const vehicle = fixtureVehicle();
    vehicle.trims[0].image = {
      src:
        imageCase === "external"
          ? "https://www.toyota.com/not-a-local-image.jpg"
          : "assets/not-real-photo.webp",
      alt: "Synthetic missing photograph",
      modelYear: imageCase === "year" ? 2025 : vehicle.year,
      trimName: imageCase === "grade" ? "Another trim" : vehicle.trims[0].name,
      sourceIds: ["test-source"],
      credit: "Synthetic image credit",
    };
    return route.fulfill({ json: { ...catalog, vehicles: [vehicle] } });
  });
  for (const kind of ["missing", "year", "grade", "external"]) {
    imageCase = kind;
    await page.goto(`./?image-case=${kind}#/model/fixture-a`);
    await expect(page.locator(".trim-image-placeholder")).toHaveCount(0);
    await expect(page.locator(".trim-card-visual")).toHaveCount(0);
    await expect(page.locator(".trim-card-visual img")).toHaveCount(0);
    await expect(page.locator(".trim-photo-credit")).toHaveCount(0);
    await expect(page.locator(".trim-card-actions").first()).toBeVisible();
  }
});

test("text-first trim cards have complete context and no reserved image space", async ({
  page,
}) => {
  for (const route of ["2026-toyota-rav4", "2026-toyota-rav4-plug-in-hybrid"]) {
    await page.goto(`./#/model/${route}`);
    const cards = page.locator(".trim-training-card");
    await expect(cards.first()).toBeVisible();
    await expect(
      page.locator(
        ".trim-card-visual, .trim-image-placeholder, .trim-year-label",
      ),
    ).toHaveCount(0);
    for (const card of await cards.all()) {
      await expect(card.locator(".trim-card-context")).toContainText(
        "2026 · Toyota · RAV4",
      );
      await expect(card.getByRole("heading", { level: 3 })).toBeVisible();
      await expect(card.locator(".trim-core-specs > div")).toHaveCount(4);
      await expect(card.locator(".trim-card-actions button")).toHaveCount(1);
      const spacing = await card.evaluate(
        (node) =>
          node.querySelector(".trim-card-context").getBoundingClientRect().top -
          node.getBoundingClientRect().top,
      );
      expect(spacing).toBeGreaterThan(0);
      expect(spacing).toBeLessThan(35);
    }
  }
});

test("current specials filters, spreadsheet details and responsive cards", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-11-05T12:00:00Z") });
  await page.goto("./#/specials");
  await expect(page.locator(".special-offer")).toHaveCount(16);
  await expect(
    page.getByRole("heading", { name: "Chevrolet", exact: true }),
  ).toBeVisible();
  const corolla = page.locator(".special-offer").first();
  await expect(corolla).toContainText("2027 Toyota Corolla LE");
  await expect(corolla).toContainText("$199");
  await corolla.getByText("Full Offer Details", { exact: true }).click();
  await expect(corolla.getByText("VP521000")).toBeVisible();
  await expect(corolla.getByText("T270028")).toBeVisible();
  await expect(corolla.getByText("$211")).toBeVisible();
  await expect(corolla.getByText("$2,287")).toBeVisible();
  await corolla.getByText("Full Offer Details", { exact: true }).click();
  await expect(corolla.getByText("VP521000")).not.toBeVisible();
  await page
    .getByLabel("Manufacturer", { exact: true })
    .selectOption("volkswagen");
  await expect(page.locator(".special-offer")).toHaveCount(5);
  await expect(page.locator(".special-brand")).toHaveCount(1);
  await page.getByLabel("Manufacturer", { exact: true }).selectOption("toyota");
  await page.getByLabel("Offer Type", { exact: true }).selectOption("finance");
  await expect(
    page.getByText("No current finance offers are available for Toyota."),
  ).toBeVisible();
  await page.getByLabel("Offer Type", { exact: true }).selectOption("purchase");
  await expect(page.locator(".special-offer")).toHaveCount(0);
  await page.getByLabel("Offer Type", { exact: true }).selectOption("lease");
  await expect(page.locator(".special-offer")).toHaveCount(4);
  const cards = page.locator(".special-offer");
  const first = await cards.nth(0).boundingBox(),
    second = await cards.nth(1).boundingBox();
  expect(first.y).toEqual(second.y);
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileFirst = await cards.nth(0).boundingBox(),
    mobileSecond = await cards.nth(1).boundingBox();
  expect(mobileSecond.y).toBeGreaterThan(mobileFirst.y + mobileFirst.height);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Model Guides", exact: true })
    .click();
  await expect(page.getByRole("searchbox")).toBeVisible();
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Current Specials", exact: true })
    .click();
  await expect(cards).toHaveCount(16);
});

test("specials expire on an open page at dealership midnight", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-12-01T04:59:59Z") });
  await page.goto("./#/specials");
  await expect(page.locator(".special-offer")).toHaveCount(14);
  await page.clock.fastForward(2000);
  await expect(page.locator(".special-offer")).toHaveCount(0);
  await expect(
    page.getByText("No current offers are available for Toyota."),
  ).toBeVisible();
});

test("specials data additions need no layout changes and omit missing fields", async ({
  page,
}) => {
  const data = JSON.parse(
    await readFile(new URL("../data/specials.json", import.meta.url), "utf8"),
  );
  const source = data.offers[0].source;
  data.offers = [
    {
      id: "finance",
      manufacturer: "volkswagen",
      year: 2027,
      model: "Test",
      trim: "SE",
      type: "finance",
      apr: 0,
      termMonths: 60,
      expiresOn: "2026-11-30",
      source,
    },
    {
      id: "purchase",
      manufacturer: "chevrolet",
      year: 2026,
      model: "Test",
      trim: "LT",
      type: "purchase",
      purchasePrice: 30000,
      expiresOn: "2026-11-30",
      source,
    },
  ];
  await page.route("**/data/specials.json", (route) =>
    route.fulfill({ json: data }),
  );
  await page.clock.install({ time: new Date("2026-11-05T12:00:00Z") });
  await page.goto("./#/specials");
  await expect(page.locator(".special-offer")).toHaveCount(2);
  await expect(page.getByText("0%", { exact: true })).toBeVisible();
  await expect(page.getByText("$30,000", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Full Offer Details", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("Annual mileage", { exact: true })).toHaveCount(
    0,
  );
  await page.getByLabel("Offer Type", { exact: true }).selectOption("purchase");
  await expect(page.locator(".special-offer")).toHaveCount(1);
});

test("specials loading failure is isolated from model guides", async ({
  page,
}) => {
  await page.route("**/data/specials.json", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto("./#/specials");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await page.unroute("**/data/specials.json");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByLabel("Offer Type", { exact: true })).toBeVisible();
  await page.goto("./#/search");
  await expect(page.getByRole("searchbox")).toBeVisible();
});

const guides = catalog.vehicles;
const verified = guides.filter((v) => v.status === "verified");
const modelPath = (v) => `./#/model/${typeof v === "string" ? v : v.id}`;
async function openEquipment(page) {
  await page.locator("#view-equipment").click();
  return page.getByRole("dialog", { name: "Standard Equipment", exact: true });
}
async function addComparisons(page, ids) {
  for (const id of ids) {
    await page.locator("#compare-select").selectOption(id);
    await page.locator("#add-compare").click();
  }
}
const equipmentTable = (page, parent = "#model-equipment") =>
  page.locator(`${parent} [data-comparison-table="equipment"]`);
const equipmentRow = (table, label) =>
  table.locator("tbody tr").filter({
    has: table.page().getByRole("rowheader", { name: label, exact: true }),
  });

test("homepage retains branding, Axel and three manufacturer links without vehicle listings", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator(".manufacturer-card")).toHaveCount(3);
  await expect(page.locator(".vehicle-card, .quick-links")).toHaveCount(0);
  await expect(page.getByRole("img", { name: /Axel the Fox/ })).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Fox Automotive of Rochester Hills/ }),
  ).toBeVisible();
  for (const brand of catalog.brands) {
    await page.locator(`.manufacturer-card.${brand.id}`).click();
    await expect(page).toHaveURL(new RegExp(`#/search\\?brand=${brand.id}$`));
    await expect(
      page.getByRole("heading", { name: "Model Guides", exact: true }),
    ).toBeVisible();
    await expect(page.locator("#brand-filter")).toHaveValue(brand.id);
    await expect(page.locator(".vehicle-card")).toHaveCount(
      guides.filter((v) => v.brand === brand.id).length,
    );
    await page.goBack();
    await expect(page.locator(".manufacturer-card")).toHaveCount(3);
  }
});

test("central directory filters all brands and years and restores URL filters with back and forward", async ({
  page,
}) => {
  await page.goto("./#/search");
  await expect(page.locator(".vehicle-card")).toHaveCount(guides.length);
  await page.locator("#brand-filter").selectOption("volkswagen");
  await page.locator("#year-filter").selectOption("2027");
  await expect(page.locator(".vehicle-card")).toHaveCount(8);
  await page.getByRole("searchbox").fill("Golf");
  await expect(page.locator(".vehicle-card")).toHaveCount(2);
  await page
    .getByRole("link", { name: "Open 2027 Golf R guide", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Golf R", exact: true, level: 1 }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.locator("#brand-filter")).toHaveValue("volkswagen");
  await expect(page.locator("#year-filter")).toHaveValue("2027");
  await expect(page.getByRole("searchbox")).toHaveValue("Golf");
  await page.goForward();
  await expect(
    page.getByRole("heading", { name: "Golf R", exact: true, level: 1 }),
  ).toBeVisible();
  await page.goBack();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".vehicle-card")).toHaveCount(guides.length);
});

test("legacy links resolve to working destinations with no duplicate comparison navigation", async ({
  page,
}) => {
  for (const [from, to] of [
    ["/brand/toyota?year=2027", "/search?year=2027&brand=toyota"],
    ["/compare-vehicles", "/compare"],
    ["/equipment-search?q=RAV4", "/search?q=RAV4"],
  ]) {
    await page.goto(`./#${from}`);
    await expect.poll(() => page.evaluate(() => location.hash)).toBe(`#${to}`);
    await expect(page.locator("body")).not.toContainText(/Stage (?:Two|2)/i);
  }
  const nav = page.getByRole("navigation", { name: "Primary navigation" });
  await expect(
    nav.getByRole("link", { name: "Compare Models", exact: true }),
  ).toHaveCount(1);
  await expect(
    nav.getByRole("link", { name: /Compare Trims|Compare Vehicles/ }),
  ).toHaveCount(0);
  await nav.getByRole("link", { name: "Compare Models", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Compare Models", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#compare-select option")).toHaveCount(
    1 + verified.reduce((n, v) => n + v.trims.length, 0),
  );
  await expect(page.locator("#compare-select")).not.toContainText(
    "2026 Chevrolet Equinox",
  );
});

test("all model guides retain cards, automatic upgrades, equipment explanations and sources", async ({
  page,
}) => {
  test.setTimeout(90000);
  for (const v of guides) {
    await page.goto(modelPath(v));
    await expect(
      page.getByRole("heading", { name: v.model, exact: true, level: 1 }),
    ).toBeVisible();
    await expect(page.locator(".trim-training-card")).toHaveCount(
      new Set(v.trims.map((t) => t.name)).size,
    );
    await expect(
      page.locator("#view-specifications, #equipment-explained"),
    ).toHaveCount(2);
    await expect(
      page.locator(
        ".equipment-detail, #package-section, #source-section, .upgrade-grid, #categorized-equipment, #compare-select",
      ),
    ).toHaveCount(0);
    await expect(page.locator(".model-page")).not.toContainText("Unverified");
    await expect(
      page.locator(
        "#trim-section, #model-equipment, #specifications, .model-trim-picker, .model-page .table-controls, .model-page .equipment-table[data-comparison-table], [data-trim-action=compare]",
      ),
    ).toHaveCount(0);
    await expect(page.locator(".model-page")).not.toContainText(
      /Find Your Differences|Choose trims to compare|What Changes|Differences Only/,
    );
    await page.locator("#view-equipment").click();
    await expect(page.getByRole("dialog")).toContainText(
      `${v.year} ${catalog.brands.find((b) => b.id === v.brand).name} ${v.model}`,
    );
    if (v.trims.length) {
      await expect(page.locator("#equipment-config option")).toHaveCount(
        v.trims.length,
      );
      await page
        .locator("#equipment-config")
        .selectOption(`${v.id}:${v.trims.at(-1).id}`);
      await expect(page.locator("#reference-context")).toContainText(
        v.trims.at(-1).name,
      );
      await expect(
        page.locator("#categorized-equipment .equipment-status:not(.standard)"),
      ).toHaveCount(0);
      await expect(page.locator("#categorized-equipment")).not.toContainText(
        "Available (Optional)",
      );
    }
    await page.keyboard.press("Escape");
    await page.locator("#view-sources").click();
    for (const source of v.sources)
      await expect(
        page
          .getByRole("dialog")
          .getByRole("link", { name: source.title, exact: false }),
      ).toBeVisible();
    for (const item of v.modelYearChanges?.items || [])
      await expect(page.getByRole("dialog")).toContainText(item.text);
    await page.getByRole("button", { name: "Close dialog" }).click();
  }
});

test("equipment modal matches the trim card and active drivetrain, traps focus and restores scroll", async ({
  page,
}) => {
  await page.goto(modelPath("2026-volkswagen-tiguan"));
  const card = page
    .locator(".trim-training-card")
    .filter({ has: page.getByRole("heading", { name: "SE", exact: true }) });
  await card
    .locator("select")
    .selectOption("2026-volkswagen-tiguan:se-4motion");
  const trigger = card.getByRole("button", {
    name: "View Equipment",
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole("dialog", {
    name: "Standard Equipment",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(page.locator("#equipment-config")).toHaveValue(
    "2026-volkswagen-tiguan:se-4motion",
  );
  await expect(dialog).toContainText("4MOTION");
  await expect(dialog).toContainText("201 hp");
  const scroll = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 1200);
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((d) => d.contains(document.activeElement)),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
  await page.locator("#view-equipment").click();
  await expect(page.locator("#equipment-config")).toHaveValue(
    "2026-volkswagen-tiguan:se-4motion",
  );
  await page.mouse.click(1, 1);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("#view-equipment")).toBeFocused();
  await expect(page.locator("body")).not.toHaveClass(/reference-open/);
});

test("sources modal preserves original optional and unknown classifications and source references", async ({
  page,
}) => {
  await useFixtures(page);
  await page.goto(modelPath("fixture-a"));
  await page.goto("./#/compare");
  await addComparisons(page, ["fixture-a:base", "fixture-a:plus"]);
  await page.locator("#compare-view-all").check();
  await expect(equipmentTable(page, "#comparison-results")).toContainText(
    "Not standard",
  );
  await expect(equipmentTable(page, "#comparison-results")).not.toContainText(
    "Requires synthetic package",
  );
  await page.goto(modelPath("fixture-a"));
  await page.locator("#view-specifications").click();
  await expect(page.getByRole("dialog")).toContainText("N/A");
  await page.keyboard.press("Escape");
  await page.locator("#view-sources").click();
  const dialog = page.getByRole("dialog", {
    name: "Sources & Verification",
    exact: true,
  });
  await dialog
    .getByText("Equipment verification details", { exact: true })
    .click();
  await expect(dialog).toContainText("Available (Optional)");
  await expect(dialog).toContainText("Requires synthetic package");
  await expect(dialog).toContainText("Unverified");
  await expect(
    dialog.getByRole("link", { name: /Synthetic evidence fixture/ }),
  ).toHaveAttribute("href", "https://www.toyota.com/test-fixture");
  await dialog.locator("#source-config").selectOption("plus");
  await dialog
    .getByText("Equipment verification details", { exact: true })
    .click();
  await expect(dialog).toContainText("Not Offered");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.locator("#view-sources")).toBeFocused();
});

test("equipment source citations use the same dialog and return focus to the original opener", async ({
  page,
}) => {
  await page.goto(modelPath("2026-toyota-rav4"));
  const equipment = await openEquipment(page);
  await equipment.locator(".source-link").first().click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(page.getByRole("dialog")).toHaveAccessibleName(
    "Sources & Verification",
  );
  await expect(page.getByRole("dialog")).toContainText("B1");
  await page.keyboard.press("Escape");
  await expect(page.locator("#view-equipment")).toBeFocused();
});

test("Why Upgrade automatically shows standard gains without individual comparison controls", async ({
  page,
}) => {
  await useFixtures(page);
  await page.goto(modelPath("fixture-a"));
  await expect(page.locator("#why-upgrade")).toHaveCount(1);
  await expect(page.locator("#why-upgrade")).toContainText(
    "Fixture Base → Fixture Plus",
  );
  await expect(page.locator("#why-upgrade")).toContainText(
    "Synthetic heated seats",
  );
  await expect(page.locator("#why-upgrade")).toContainText("Becomes standard");
  await expect(page.locator("#why-upgrade")).not.toContainText(
    /package|Available|Unverified/,
  );
  await expect(
    page.locator(
      "#model-equipment, #trim-section, .model-trim-picker, input[name=model-view], input[name=model-trim], #model-group",
    ),
  ).toHaveCount(0);
  await page.locator("#why-upgrade > details > summary").first().click();
  await expect(page.locator("#why-upgrade article").first()).toBeVisible();
});

test("cross-brand and cross-year comparisons preserve verified values, N/A, standard and not-standard", async ({
  page,
}) => {
  await page.goto("./#/compare");
  await addComparisons(page, [
    "2026-toyota-rav4:le-hev-fwd",
    "2026-volkswagen-tiguan:se-fwd",
    "2027-chevrolet-equinox:lt-fwd",
    "2027-volkswagen-tiguan:rm14qj",
  ]);
  await page.locator("#compare-view-all").check();
  const table = equipmentTable(page, "#comparison-results");
  await expect(table.locator("thead th")).toHaveCount(5);
  const heated = equipmentRow(table, "Comfort Heated front seats");
  await expect(heated.locator("td").nth(0)).toContainText("N/A");
  await expect(heated.locator("td").nth(1)).toContainText("Standard");
  const wheel = equipmentRow(table, "Comfort Heated steering wheel");
  await expect(wheel.locator("td").nth(0)).toContainText("N/A");
  await expect(wheel.locator("td").nth(1)).toContainText("Not standard");
  const cruise = equipmentRow(table, "Safety Adaptive cruise control");
  await expect(cruise).toContainText("Dynamic Radar Cruise Control");
  await expect(cruise).toContainText("Stop & Go");
  await expect(table).not.toContainText(/Available \(Optional\)|Unverified/);
  await expect(
    page.locator(".comparison-packages, .baseline-equipment, #why-upgrade"),
  ).toHaveCount(0);
  await page.locator("#compare-view-differences").check();
  await expect(table).toContainText("1.5L Turbo");
  await page
    .getByRole("button", { name: "Remove Equinox LT", exact: true })
    .click();
  await expect(table.locator("thead th")).toHaveCount(4);
});

test("standard camera systems keep manufacturer terminology while optional roofs become Not standard", async ({
  page,
}) => {
  await page.goto("./#/compare");
  await addComparisons(page, [
    "2026-toyota-rav4:xse-hev-awd",
    "2026-volkswagen-tiguan:sel-r-line-turbo-4motion",
  ]);
  await page.locator("#compare-view-all").check();
  const table = equipmentTable(page, "#comparison-results");
  const camera = equipmentRow(
    table,
    "Safety Surround-view / 360-degree camera",
  );
  await expect(camera).toContainText("Panoramic View Monitor");
  await expect(camera).toContainText("Area View");
  await expect(camera.locator(".equipment-status.standard")).toHaveCount(2);
  const roof = equipmentRow(table, "Exterior Panoramic sunroof / moonroof");
  await expect(roof.locator("td").nth(0)).toContainText("Not standard");
  await expect(roof.locator("td").nth(1)).toContainText("Standard");
});

test("compact shortcuts focus visible headings and keep Chevrolet explanations, colors and What's New", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(modelPath("2027-chevrolet-equinox"));
  for (const [name, target] of [
    ["Equipment Explained", "equipment-explained"],
  ]) {
    await page
      .locator(".section-nav")
      .getByRole("link", { name, exact: true })
      .click();
    await expect(page.locator(`#${target}`)).toBeFocused();
    const rect = await page.locator(`#${target}`).boundingBox();
    expect(rect.y).toBeGreaterThan(80);
  }
  await expect(page.locator("#equipment-explained .feature-card")).toHaveCount(
    1,
  );
  await expect(page.locator("#color-section")).toContainText(
    "Autumn Harvest Metallic",
  );
  await expect(page.locator("#color-section")).toContainText("Artemis Gray");
  await expect(page.locator("#model-year-changes")).toContainText(
    "Eight Speed Transmission New for FWD",
  );
  await expect(page.locator("#model-year-changes")).not.toContainText(
    "Connected Cameras",
  );
});

test("specifications follow the selected Equinox drivetrain and retain important numerical facts", async ({
  page,
}) => {
  await page.goto(modelPath("2027-chevrolet-equinox"));
  await page.locator("#view-specifications").click();
  await page
    .locator("#spec-config")
    .selectOption("2027-chevrolet-equinox:lt-fwd");
  await expect(page.locator("#specification-values")).toContainText(
    "14.8 U.S. gal",
  );
  await expect(page.locator("#specification-values")).toContainText(
    "8-speed automatic",
  );
  await page.keyboard.press("Escape");
  const dialog = await openEquipment(page);
  await page
    .locator("#equipment-config")
    .selectOption("2027-chevrolet-equinox:lt-awd");
  await expect(dialog).toContainText("15.6 U.S. gal");
  await expect(dialog).toContainText("3583 lb");
  await page.keyboard.press("Escape");
  await page.locator("#view-specifications").click();
  await expect(page.locator("#spec-config")).toHaveValue(
    "2027-chevrolet-equinox:lt-awd",
  );
  await expect(page.locator("#specification-values")).toContainText(
    "8-speed automatic",
  );
  await expect(page.locator("#specification-values")).toContainText(
    "63.5 cu ft",
  );
});

test("all guides and shared modals fit desktop, tablet and narrow mobile", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  for (const v of guides) {
    await page.goto(modelPath(v));
    await expect(
      page.getByRole("heading", { name: v.model, exact: true, level: 1 }),
    ).toBeVisible();
    for (const width of [1280, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 850 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${v.id} ${width}`,
      ).toBe(true);
    }
    for (const trigger of [
      "#view-equipment",
      "#view-specifications",
      "#view-sources",
    ]) {
      await page.locator(trigger).click();
      const dialog = page.getByRole("dialog");
      const rect = await dialog.boundingBox();
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(320);
      expect(rect.y + rect.height).toBeLessThanOrEqual(850);
      const body = dialog.locator(".reference-body");
      expect(await body.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(
        true,
      );
      await page.keyboard.press("Escape");
    }
    await page.setViewportSize({ width: 1280, height: 900 });
  }
  await page.goto(modelPath("2027-chevrolet-equinox"));
  await page.screenshot({ path: testInfo.outputPath("equinox-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#view-equipment").click();
  await page.screenshot({ path: testInfo.outputPath("equipment-mobile.png") });
});

test("all three shared dialogs pass accessible naming and automated WCAG checks", async ({
  page,
}) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.goto(modelPath("2027-chevrolet-equinox"));
  for (const trigger of [
    "#view-equipment",
    "#view-specifications",
    "#view-sources",
  ]) {
    await page.locator(trigger).click();
    await expect(page.getByRole("dialog")).toHaveAttribute(
      "aria-labelledby",
      "reference-title",
    );
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
    await page.keyboard.press("Escape");
  }
});

test("every printable guide remains one landscape Letter page with standard data and no open-modal dependency", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  for (const v of guides) {
    await page.goto(modelPath(v));
    await expect(
      page.getByRole("heading", { name: v.model, exact: true, level: 1 }),
    ).toBeVisible();
    const print = page.locator(".print-reference");
    const text = await print.textContent();
    expect(text).not.toMatch(
      /Named factory packages|Confirmed individual options|Unverified|Contents U\./,
    );
    if (v.quickReference)
      await expect(print.locator(".print-grade-table tbody tr")).toHaveCount(
        v.quickReference.groups.length,
      );
    await page.evaluate(() => {
      window.print = () => {
        window.__printed = true;
      };
    });
    await page.locator("#print-reference").click();
    expect(await page.evaluate(() => window.__printed)).toBe(true);
    await page.locator("#view-equipment").click();
    await page.emulateMedia({ media: "print" });
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(print).toBeVisible();
    await expect(page.locator(".site-header")).toBeHidden();
    expect(await print.textContent()).toBe(text);
    const pdf = await page.pdf({
      path: testInfo.outputPath(`${v.id}.pdf`),
      preferCSSPageSize: true,
    });
    expect(
      pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length,
      v.id,
    ).toBe(1);
    await page.emulateMedia({ media: "screen" });
    await page.keyboard.press("Escape");
  }
});

test("model selections and Sources dialog do not change the full print reference", async ({
  page,
}) => {
  await page.goto(modelPath("2027-chevrolet-equinox"));
  const print = page.locator(".print-reference");
  const text = await print.textContent();
  for (const value of [
    "175 hp",
    "203 lb-ft",
    "14.8 U.S. gal",
    "15.6 U.S. gal",
    "63.5 cu ft",
  ])
    expect(text).toContain(value);
  await page.locator("#view-specifications").click();
  await page
    .locator("#spec-config")
    .selectOption("2027-chevrolet-equinox:rs-awd");
  await page.keyboard.press("Escape");
  await page.locator("#view-sources").click();
  await page.emulateMedia({ media: "print" });
  await expect(print).toBeVisible();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(await print.textContent()).toBe(text);
});

test("comparison selections reject duplicates, limit to four, survive navigation and support removal", async ({
  page,
}) => {
  await page.goto("./#/compare");
  const ids = verified
    .flatMap((v) => v.trims.map((t) => `${v.id}:${t.id}`))
    .slice(0, 5);
  await addComparisons(page, [ids[0], ids[0]]);
  await expect(page.locator(".selection-chip")).toHaveCount(1);
  await expect(page.locator("#toast")).toContainText("already selected");
  await addComparisons(page, ids.slice(1));
  await expect(page.locator(".selection-chip")).toHaveCount(4);
  await expect(page.locator("#toast")).toContainText("Remove a configuration");
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Model Guides", exact: true })
    .click();
  await page.goBack();
  await expect(page.locator(".selection-chip")).toHaveCount(4);
  await page.locator(".selection-chip button").first().click();
  await expect(page.locator(".selection-chip")).toHaveCount(3);
  await expect(
    equipmentTable(page, "#comparison-results").locator("thead th"),
  ).toHaveCount(4);
});

test("production exceptions and genuine not-applicable states retain their original evidence", async ({
  page,
}) => {
  await page.goto(modelPath("2027-volkswagen-tiguan"));
  const dialog = await openEquipment(page);
  await page
    .locator("#equipment-config")
    .selectOption("2027-volkswagen-tiguan:rm1vpj");
  await expect(dialog).toContainText("Production exception 2PD");
  await page.keyboard.press("Escape");
  await expect(page.locator("#model-year-changes")).toContainText(
    "production credit 2PD",
  );
  await page.goto(modelPath("2026-toyota-rav4"));
  await page.locator("#view-specifications").click();
  await expect(
    page.locator(
      '#specification-values [title="N/A — not applicable to this configuration"]',
    ),
  ).not.toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.locator("#view-sources").click();
  await page
    .getByText("Equipment verification details", { exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Not Applicable");
  await expect(page.getByRole("dialog")).toContainText("Unverified");
});

for (const width of [1280, 390]) {
  test(`Model Guide cleanup preserves every standard trim equipment list at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: 850 });
    for (const id of [
      "2026-toyota-rav4",
      "2026-toyota-tacoma",
      "2026-toyota-sienna",
      "2026-toyota-grand-highlander",
      "2026-volkswagen-tiguan",
      "2027-chevrolet-equinox",
    ]) {
      const vehicle = catalog.vehicles.find((v) => v.id === id);
      await page.goto(modelPath(vehicle));
      await expect(page.locator("h1")).toHaveText(vehicle.model);
      const unchanged = [
        "#navigation",
        "#why-upgrade",
        "#equipment-explained",
        "#color-section",
        "#model-year-changes",
        ".print-reference",
      ];
      const before = await Promise.all(
        unchanged.map((selector) =>
          page
            .locator(selector)
            .count()
            .then((count) =>
              count ? page.locator(selector).innerHTML() : null,
            ),
        ),
      );
      for (const trim of vehicle.trims) {
        const card = page.locator(".trim-training-card").filter({
          has: page.getByRole("heading", {
            level: 3,
            name: trim.name,
            exact: true,
          }),
        });
        const config = card.locator("select.card-configuration");
        if (await config.count()) await config.selectOption(`${id}:${trim.id}`);
        const opener = card.getByRole("button", {
          name: "View Equipment",
          exact: true,
        });
        await opener.scrollIntoViewIfNeeded();
        const position = await page.evaluate(() => scrollY);
        await opener.click();
        const dialog = page.getByRole("dialog", {
          name: "Standard Equipment",
          exact: true,
        });
        await expect(dialog).toBeVisible();
        await expect(dialog.locator("#reference-context")).toContainText(
          `${vehicle.year} ${catalog.brands.find((brand) => brand.id === vehicle.brand).name} ${vehicle.model}`,
        );
        await expect(dialog.locator("#reference-context")).toContainText(
          trim.name,
        );
        await expect(dialog.locator("#equipment-config")).toHaveValue(
          `${id}:${trim.id}`,
        );
        // Compare the complete visible field inventory with source-backed standard
        // records, so a missing category or omitted standard package feature fails.
        const expected = equipmentFields(catalog, [vehicle])
          .filter((field) => {
            const cell = trim.equipment[field.id];
            return (
              cell?.status === "standard" &&
              evidenceReady(vehicle, cell.sourceIds)
            );
          })
          .map((field) => field.label)
          .sort();
        const actual = await dialog
          .locator(".categorized-fields dt")
          .allTextContents();
        expect(actual.sort(), `${id}:${trim.id}`).toEqual(expected);
        const output = trim.equipment.horsepower;
        if (
          output?.status === "standard" &&
          evidenceReady(vehicle, output.sourceIds)
        )
          await expect(dialog).toContainText(output.value);
        const list = dialog.locator(".reference-body");
        expect(
          await list.evaluate((element) => {
            element.scrollTop = 100;
            return element.scrollTop;
          }),
        ).toBeGreaterThan(0);
        await expect(
          dialog.locator(".equipment-status:not(.standard)"),
        ).toHaveCount(0);
        await expect(dialog.locator(".equipment-category")).not.toHaveCount(0);
        for (const category of await dialog
          .locator(".equipment-category")
          .all())
          await expect(
            category.locator(".categorized-fields dt"),
          ).not.toHaveCount(0);
        expect(await page.evaluate(() => scrollY)).toBe(position);
        const bounds = await dialog.boundingBox();
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(850);
        // Exercise both supported closing paths on every brand and viewport.
        if (vehicle.trims.indexOf(trim) % 2)
          await dialog.getByRole("button", { name: "Close dialog" }).click();
        else await page.keyboard.press("Escape");
        await expect(dialog).toHaveCount(0);
        await expect(opener).toBeFocused();
        expect(await page.evaluate(() => scrollY)).toBe(position);
        await expect(
          page.locator(
            "#categorized-equipment, .equipment-detail, #equipment-detail",
          ),
        ).toHaveCount(0);
        await expect(
          page.getByRole("heading", { name: "Compare Trims", exact: true }),
        ).toHaveCount(0);
        await expect(page.locator("#view-specifications")).toBeVisible();
        await expect(
          page.locator("#model-equipment, #specifications, #trim-section"),
        ).toHaveCount(0);
      }
      const after = await Promise.all(
        unchanged.map((selector) =>
          page
            .locator(selector)
            .count()
            .then((count) =>
              count ? page.locator(selector).innerHTML() : null,
            ),
        ),
      );
      expect(after, `${id}: protected sections`).toEqual(before);
      await expect(
        page.locator(
          "input[name=model-view], input[name=model-trim], #model-group",
        ),
      ).toHaveCount(0);
      await page.emulateMedia({ media: "print" });
      await expect(page.locator(".print-reference")).toBeVisible();
      const pdf = await page.pdf({ preferCSSPageSize: true });
      expect(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length).toBe(
        1,
      );
      await page.emulateMedia({ media: "screen" });
    }
  });
}

for (const width of [1280, 390]) {
  test(`Specifications modal follows every imported Toyota, Tiguan and Equinox configuration at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: 850 });
    for (const id of [
      "2026-toyota-rav4",
      "2026-toyota-tacoma",
      "2026-toyota-sienna",
      "2026-toyota-grand-highlander",
      "2026-volkswagen-tiguan",
      "2027-chevrolet-equinox",
    ]) {
      const vehicle = catalog.vehicles.find((v) => v.id === id);
      await page.goto(modelPath(vehicle));
      const opener = page.getByRole("button", {
        name: "View Specifications",
        exact: true,
      });
      await expect(
        page.locator(
          "#specifications, #specification-values, #model-equipment, #trim-section, .model-trim-picker, [data-trim-action=compare]",
        ),
      ).toHaveCount(0);
      await expect(page.locator(".model-page")).not.toContainText(
        /Find Your Differences|Choose Trims to Compare|What Changes|Differences Only|All Equipment/,
      );
      const upgrades = page.locator("#why-upgrade");
      await expect(upgrades).toBeVisible();
      await expect(upgrades.locator("details")).not.toHaveCount(0);
      if (id === "2027-chevrolet-equinox") {
        for (const path of ["LT → RS", "LT → ACTIV", "RS → ACTIV"])
          await expect(upgrades).toContainText(path);
        const fromLT = upgrades
          .locator("details")
          .filter({ has: page.locator("summary", { hasText: "From LT" }) });
        await expect(fromLT.locator("article")).toHaveCount(1);
        await upgrades
          .locator("details > summary")
          .filter({ hasText: "From RS" })
          .click();
        await expect(
          upgrades.getByRole("heading", { name: "RS → ACTIV", exact: true }),
        ).toBeVisible();
        const link = upgrades
          .getByRole("heading", { name: "RS → ACTIV", exact: true })
          .locator("..")
          .getByRole("button", { name: "View Sources", exact: true })
          .first();
        await link.click();
        await expect(page.locator("#source-config")).toHaveValue("activ-fwd");
        await page.keyboard.press("Escape");
        await expect(link).toBeFocused();
      }
      await opener.scrollIntoViewIfNeeded();
      const position = await page.evaluate(() => scrollY);
      const printBefore = await page.locator(".print-reference").textContent();
      await opener.click();
      const dialog = page.getByRole("dialog", {
        name: "Specifications",
        exact: true,
      });
      await expect(dialog).toBeVisible();
      await expect(dialog.locator("#spec-config option")).toHaveCount(
        vehicle.trims.length,
      );
      for (const trim of vehicle.trims) {
        await dialog.locator("#spec-config").selectOption(`${id}:${trim.id}`);
        await expect(dialog.locator("#reference-context")).toContainText(
          trim.name,
        );
        await expect(dialog.locator("#reference-context")).toContainText(
          trim.configuration,
        );
        for (const field of [
          "engine",
          "horsepower",
          "torque",
          "transmission",
          "drivetrain",
          "economy",
          "dimensions",
          "cargo",
          "fuel",
          "towing",
        ]) {
          const cell = trim.equipment[field];
          if (
            cell?.status === "standard" &&
            evidenceReady(vehicle, cell.sourceIds)
          )
            await expect(dialog.locator("#specification-values")).toContainText(
              cell.value,
            );
        }
      }
      expect(await page.evaluate(() => scrollY)).toBe(position);
      await dialog.locator(".reference-body").evaluate((node) => {
        node.scrollTop = 200;
      });
      expect(await page.evaluate(() => scrollY)).toBe(position);
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press("Tab");
        expect(
          await dialog.evaluate((node) =>
            node.contains(document.activeElement),
          ),
        ).toBe(true);
      }
      await page.keyboard.press("Escape");
      await expect(opener).toBeFocused();
      expect(await page.evaluate(() => scrollY)).toBe(position);
      await opener.click();
      await page.emulateMedia({ media: "print" });
      await expect(dialog).toBeHidden();
      await expect(page.locator(".print-reference")).toBeVisible();
      expect(await page.locator(".print-reference").textContent()).toBe(
        printBefore,
      );
      const pdf = await page.pdf({ preferCSSPageSize: true });
      expect(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length).toBe(
        1,
      );
      await page.emulateMedia({ media: "screen" });
      await page.keyboard.press("Escape");
      await expect(opener).toBeFocused();
      await expect(page.locator("body")).not.toHaveClass(/reference-open/);
      await opener.click();
      await dialog.getByRole("button", { name: "Close dialog" }).click();
      await expect(opener).toBeFocused();
    }
  });
}

test("November Volkswagen lease cards preserve approved cents, totals, rebates and qualifications", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-11-06T12:00:00Z") });
  await page.goto("./#/specials");
  await page
    .getByLabel("Manufacturer", { exact: true })
    .selectOption("volkswagen");
  await page.getByLabel("Offer Type", { exact: true }).selectOption("lease");
  const cards = page.locator(".special-offer");
  await expect(cards).toHaveCount(5);
  const rows = [
    [
      "2027 Volkswagen Jetta Sport",
      "$373.25",
      "$500",
      false,
      "2027-volkswagen-jetta",
    ],
    [
      "2027 Volkswagen Taos S",
      "$405.00",
      "$500",
      false,
      "2027-volkswagen-taos",
    ],
    [
      "2026 Volkswagen Tiguan S",
      "$409.83",
      "$1,950",
      true,
      "2026-volkswagen-tiguan",
    ],
    [
      "2026 Volkswagen Atlas Cross Sport SE",
      "$560.40",
      "$4,750",
      true,
      "2026-volkswagen-atlas-cross-sport",
    ],
    [
      "2026 Volkswagen Atlas SE",
      "$572.60",
      "$1,250",
      true,
      "2026-volkswagen-atlas",
    ],
  ];
  for (const [name, payment, rebate, costco, guide] of rows) {
    const card = cards.filter({
      has: page.getByRole("heading", { name, exact: true }),
    });
    await expect(card.locator(".special-payment")).toHaveText(
      `${payment} / month`,
    );
    await expect(card).toContainText(
      "Total out of pocket (due at signing)$2,000",
    );
    await expect(card).toContainText(`Rebate included in payment${rebate}`);
    await expect(card).toContainText("36 months");
    await expect(card).toContainText("10,000 miles");
    await expect(card).toContainText("Nov 30, 2026");
    await expect(card.locator("p > strong")).toHaveText(
      costco ? "Costco Executive Membership Required" : "Everyone Qualifies",
    );
    await expect(card).toContainText(
      "Lease payments subject to approved credit through the applicable leasing company. Not all customers will qualify.",
    );
    await card.getByText("Full Offer Details", { exact: true }).click();
    for (const label of [
      "Stock number",
      "VIN",
      "MSRP",
      "Selling price",
      "Leasing company",
      "Payment including tax",
      "Down payment",
      "Lienholder",
      "Residual value",
      "Residual percentage",
      "Money factor",
      "Acquisition fee",
      "Disposition fee",
      "Security deposit",
      "Credit tier",
    ])
      await expect(
        card
          .locator(".special-details > div")
          .filter({
            has: page.locator("dt", { hasText: new RegExp(`^${label}$`) }),
          })
          .locator("dd"),
      ).toHaveText("TBD");
    await expect(card).not.toContainText("Volkswagen Credit");
    await expect(card).toContainText(
      "Rebates are already reflected in the monthly payment",
    );
    await expect(
      card.getByRole("link", { name: /Product Guide/ }),
    ).toHaveAttribute("href", `#/model/${guide}`);
  }
  const first = await cards.nth(0).boundingBox(),
    second = await cards.nth(1).boundingBox();
  expect(first.y).toBe(second.y);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const a = await cards.nth(0).boundingBox(),
      b = await cards.nth(1).boundingBox();
    expect(b.y).toBeGreaterThan(a.y + a.height);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await cards
    .first()
    .getByRole("link", { name: /Product Guide/ })
    .click();
  await expect(page.locator("h1")).toHaveText("Jetta 1.5T");
});

test("lease details keep zero, N/A and TBD distinct without inventing membership or guide matches", async ({
  page,
}) => {
  const data = JSON.parse(
    await readFile(new URL("../data/specials.json", import.meta.url), "utf8"),
  );
  const offer = structuredClone(
    data.offers.find((o) => o.manufacturer === "volkswagen"),
  );
  delete offer.qualification;
  offer.vehicleId = "2026-volkswagen-jetta"; // A different year must never receive the link.
  offer.leaseDetails = {
    securityDeposit: 0,
    dispositionFee: "N/A",
    creditTier: null,
  };
  await page.route("**/data/specials.json", (route) =>
    route.fulfill({ json: { ...data, offers: [offer] } }),
  );
  await page.clock.install({ time: new Date("2026-11-06T12:00:00Z") });
  await page.goto("./#/specials");
  const card = page.locator(".special-offer");
  await card.getByText("Full Offer Details", { exact: true }).click();
  for (const [label, value] of [
    ["Security deposit", "$0"],
    ["Disposition fee", "N/A"],
    ["Credit tier", "TBD"],
  ])
    await expect(
      card
        .locator(".special-details > div")
        .filter({
          has: page.locator("dt", { hasText: new RegExp(`^${label}$`) }),
        })
        .locator("dd"),
    ).toHaveText(value);
  await expect(card).not.toContainText("Costco");
  await expect(card.getByRole("link", { name: /Product Guide/ })).toHaveCount(
    0,
  );
  await expect(card).toContainText("2027 Volkswagen Jetta Sport");
});

test("all five primary links stay visible without overflow controls at desktop and mobile widths", async ({
  page,
}) => {
  test.setTimeout(60000);
  const destinations = [
    ["Home", "#/"],
    ["Model Guides", "#/search"],
    ["Compare Models", "#/compare"],
    ["Current Specials", "#/specials"],
    ["Resources", "#/resources"],
  ];
  for (const width of [1440, 1024, 768, 760, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./#/");
    const primary = page.locator("#navigation .primary-links");
    await expect(primary.getByRole("link")).toHaveCount(5);
    await expect(
      primary.locator("button, select, input, [role=button]"),
    ).toHaveCount(0);
    const sizes = await primary.evaluate((node) => ({
      width: node.clientWidth,
      content: node.scrollWidth,
      overflow: getComputedStyle(node).overflowX,
    }));
    expect(sizes.content, String(width)).toBeLessThanOrEqual(sizes.width);
    expect(["auto", "scroll"]).not.toContain(sizes.overflow);
    const bounds = [];
    for (const [label, href] of destinations) {
      const link = primary.getByRole("link", { name: label, exact: true });
      await expect(link).toHaveAttribute("href", href);
      await expect(link).toBeInViewport({ ratio: 1 });
      const box = await link.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      bounds.push(box);
      await link.click();
      await expect(link).toHaveAttribute("aria-current", "page");
      await expect(primary.locator("[aria-current=page]")).toHaveCount(1);
      expect(
        await link.evaluate(
          (node) => getComputedStyle(node, "::after").content,
        ),
      ).not.toBe("none");
      await expect.poll(() => page.evaluate(() => location.hash)).toBe(href);
    }
    for (let i = 0; i < bounds.length; i++)
      for (let j = i + 1; j < bounds.length; j++) {
        const a = bounds[i],
          b = bounds[j];
        expect(
          a.x + a.width <= b.x + 1 ||
            b.x + b.width <= a.x + 1 ||
            a.y + a.height <= b.y + 1 ||
            b.y + b.height <= a.y + 1,
        ).toBe(true);
      }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

for (const width of [1280, 390]) {
  test(`Toyota brochure palettes and source review remain scoped at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 850 });
    for (const model of ["tacoma", "sienna", "grand-highlander", "rav4"]) {
      const vehicle = catalog.vehicles.find(
        (v) => v.id === `2026-toyota-${model}`,
      );
      await page.goto(modelPath(vehicle));
      await expect(page.locator(".trim-training-card")).toHaveCount(
        new Set(vehicle.trims.map((t) => t.name)).size,
      );
      const colors = page.locator("#color-section");
      await expect(colors).toContainText(
        "trim availability not established by the brochure",
      );
      for (const color of vehicle.colors.referenceInteriors)
        await expect(colors).toContainText(color.name);
      const specs = page.locator("#view-specifications");
      await specs.click();
      await expect(page.getByRole("dialog")).toContainText("N/A");
      await page.keyboard.press("Escape");
      await page.locator("#view-sources").click();
      await page.getByText("Original guide notes", { exact: true }).click();
      await expect(page.getByRole("dialog")).toContainText(
        "INFO AND DISCLOSURES",
      );
      await page.keyboard.press("Escape");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (model === "rav4")
        await expect(page.locator("#model-year-changes")).toContainText(
          "all new",
        );
    }
  });
}

for (const width of [1280, 390]) {
  test(`Resources library and salesperson phone training read and print at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./#/resources");
    await expect(
      page.getByRole("heading", { level: 1, name: "Resources", exact: true }),
    ).toBeVisible();
    await expect(
      page.locator("#navigation .primary-links [aria-current=page]"),
    ).toHaveText("Resources");
    await expect(page.getByRole("heading", { level: 2 })).toHaveText([
      "FOX AUTOMOTIVE SALES PLAYBOOK",
      "Sales Training",
    ]);
    await page
      .getByRole("link", {
        name: "Inbound Sales Calls — Ask. Listen. Adjust. Appoint.",
        exact: true,
      })
      .click();
    const document = page.locator(".resource-document");
    await expect(
      document.getByRole("heading", { level: 1, name: "Inbound Sales Calls" }),
    ).toBeVisible();
    await expect(page).toHaveTitle(
      "Inbound Sales Calls — Ask. Listen. Adjust. Appoint. · Fox Automotive",
    );
    await expect(document.locator("h2")).toHaveText([
      "Part One: Understanding the Framework",
      "Part Two: The Inbound Phone Script",
      "Final Reminder",
    ]);
    await expect(
      document.locator("h3").filter({ hasText: /^Step \d/ }),
    ).toHaveCount(8);
    await expect(
      document.locator("h4").filter({ hasText: /^Scenario [A-D]/ }),
    ).toHaveCount(4);
    await expect(document.locator(".resource-turn.customer")).not.toHaveCount(
      0,
    );
    await expect(
      document.locator(".resource-turn.salesperson"),
    ).not.toHaveCount(0);
    await expect(document.locator(".resource-note")).not.toHaveCount(0);
    await expect(
      document.getByText("Manager Phone Call Evaluation"),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const documentBounds = await document.boundingBox();
    expect(documentBounds.x).toBeGreaterThanOrEqual(18);
    expect(documentBounds.x + documentBounds.width).toBeLessThanOrEqual(
      width - 18,
    );
    await page.screenshot({
      path: testInfo.outputPath(`resources-${width}.png`),
    });
    const { default: AxeBuilder } = await import("@axe-core/playwright");
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.evaluate(() => {
      window.print = () => {
        window.__resourcePrinted = true;
      };
    });
    await page
      .getByRole("button", { name: "Print / Save as PDF", exact: true })
      .click();
    expect(await page.evaluate(() => window.__resourcePrinted)).toBe(true);
    const paragraphs = await document
      .locator("p, li, th, td, h1, h2, h3, h4")
      .allTextContents();
    const exchanges = await document
      .locator(".resource-exchange")
      .allTextContents();
    await page.emulateMedia({ media: "print" });
    await expect(document).toBeVisible();
    await expect(page.locator(".site-header")).toBeHidden();
    await expect(page.locator(".site-footer")).toBeHidden();
    await expect(page.locator(".resource-actions")).toBeHidden();
    const pdf = await page.pdf({
      preferCSSPageSize: true,
      path: testInfo.outputPath(`inbound-sales-${width}.pdf`),
    });
    const { execFileSync } = await import("node:child_process");
    const pages = JSON.parse(
      execFileSync(
        "python",
        [
          "-c",
          "import fitz,json,sys; d=fitz.open(stream=sys.stdin.buffer.read(),filetype='pdf'); print(json.dumps([{'text':p.get_text(),'width':p.rect.width,'height':p.rect.height} for p in d]))",
        ],
        { input: pdf, encoding: "utf8" },
      ),
    );
    const normalized = (text) =>
      text.replace(/[“”"]/g, "").replace(/\s/g, "").toLowerCase();
    const printed = normalized(pages.map((p) => p.text).join(""));
    for (const p of pages) {
      expect(p.width).toBe(612);
      expect(p.height).toBe(792);
      expect(p.text.trim().length).toBeGreaterThan(100);
      expect(p.text).not.toMatch(
        /Back to Resources|Print \/ Save as PDF|BROWSE BY BRAND|Current Specials/,
      );
    }
    for (const text of paragraphs)
      expect(printed, text).toContain(normalized(text));
    for (const text of exchanges)
      expect(
        pages.some((p) => normalized(p.text).includes(normalized(text))),
        `Dialogue split across pages: ${text}`,
      ).toBe(true);
    expect(pages.length).toBeGreaterThan(1);
    await page.emulateMedia({ media: "screen" });
    await page.getByRole("link", { name: "Back to Resources" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Resources",
    );
  });
}

test("Resources expands from manifest data, hides drafts and supports direct links", async ({
  page,
}) => {
  const data = JSON.parse(
    await readFile(new URL("../data/resources.json", import.meta.url), "utf8"),
  );
  data.resources.push({
    ...data.resources[0],
    id: "draft",
    title: "Unpublished training",
    published: false,
  });
  data.resources.push({
    id: "check-request",
    title: "Check request",
    heading: "Check request",
    category: "forms-documents",
    description: "A future form reference.",
    published: true,
    revisedOn: "2026-11-09",
    content: [
      {
        type: "paragraph",
        text: "Form instructions from the resource catalog.",
      },
    ],
  });
  await page.route("**/data/resources.json", (route) =>
    route.fulfill({ json: data }),
  );
  await page.goto("./#/resources");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    "FOX AUTOMOTIVE SALES PLAYBOOK",
    "Sales Training",
    "Forms & Documents",
  ]);
  await expect(page.getByText("Unpublished training")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Quick Reference" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Check request", exact: true }).click();
  await expect(page.locator(".resource-document")).toContainText(
    "Form instructions from the resource catalog.",
  );
  await expect(page.locator(".resource-document")).toContainText(
    "Revised Nov 9, 2026",
  );
  for (const id of ["draft", "missing"]) {
    await page.goto(`./#/resources/${id}`);
    await expect(
      page.getByRole("heading", { name: "Resource not available" }),
    ).toBeVisible();
    await expect(page.locator(".resource-document")).toHaveCount(0);
  }
  await page.goto("./#/resources/inbound-sales-calls");
  await expect(page.locator(".resource-document h1")).toHaveText(
    "Inbound Sales Calls",
  );
});

test("Resources failures retry locally and stale requests cannot replace another page", async ({
  page,
}) => {
  let fail = true;
  await page.route("**/data/resources.json", async (route) =>
    fail
      ? route.fulfill({ status: 503, body: "Unavailable" })
      : route.continue(),
  );
  await page.goto("./#/resources");
  await expect(page.getByRole("alert")).toContainText(
    "Resources couldn’t load",
  );
  fail = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("link", { name: /^Inbound Sales Calls —/ }),
  ).toBeVisible();
  await page.unroute("**/data/resources.json");
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  let requested;
  const request = new Promise((resolve) => {
    requested = resolve;
  });
  await page.route("**/data/resources.json", async (route) => {
    requested();
    await gate;
    await route.continue();
  });
  await page.getByRole("link", { name: /^Inbound Sales Calls —/ }).click();
  await request;
  await page
    .locator("#navigation")
    .getByRole("link", { name: "Home", exact: true })
    .click();
  const response = page.waitForResponse("**/data/resources.json");
  release();
  await response;
  await expect(
    page.getByRole("heading", {
      name: "Know the vehicle. Build the confidence.",
    }),
  ).toBeVisible();
  await expect(page.locator(".resource-document")).toHaveCount(0);
});

for (const width of [1280, 390]) {
  test(`All ten playbook guides read and print at ${width}px`, async ({
    page,
  }, testInfo) => {
    const data = JSON.parse(
      await readFile(
        new URL("../data/resources.json", import.meta.url),
        "utf8",
      ),
    );
    const guides = data.resources.filter((r) => r.moduleNumber);
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      window.print = () => {
        window.__printCount = (window.__printCount || 0) + 1;
      };
    });
    await page.goto("./#/resources");
    const section = page.locator(".section-block").filter({
      has: page.getByRole("heading", {
        name: "FOX AUTOMOTIVE SALES PLAYBOOK",
        exact: true,
      }),
    });
    await expect(section.locator("article h3")).toHaveText(
      guides.map((r) => r.title),
    );
    await expect(
      section.getByRole("link", { name: "Read Quick Guide", exact: true }),
    ).toHaveCount(10);
    for (const guide of guides) {
      await section
        .getByRole("link", { name: "Print Quick Guide", exact: true })
        .nth(guide.moduleNumber - 1)
        .click();
      const doc = page.locator(".resource-document");
      await expect(doc.locator("h1")).toHaveText(guide.heading);
      await expect
        .poll(() => page.evaluate(() => window.__printCount))
        .toBe(guide.moduleNumber * 2 - 1);
      await expect(
        page.getByRole("link", { name: "View Full Training", exact: true }),
      ).toHaveAttribute("href", guide.fullTraining);
      await expect(
        page.getByText("Full training awaiting original Academy PDF"),
      ).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page
        .getByRole("button", { name: "Print / Save as PDF", exact: true })
        .click();
      expect(await page.evaluate(() => window.__printCount)).toBe(
        guide.moduleNumber * 2,
      );
      const text = await doc.innerText();
      await page.emulateMedia({ media: "print" });
      await expect(page.locator(".site-header")).toBeHidden();
      await expect(page.locator(".resource-actions")).toBeHidden();
      const pdf = await page.pdf({
        preferCSSPageSize: true,
        path: testInfo.outputPath(`guide-${guide.moduleNumber}-${width}.pdf`),
      });
      const { execFileSync } = await import("node:child_process");
      const pages = JSON.parse(
        execFileSync(
          "python",
          [
            "-c",
            "import fitz,json,sys;d=fitz.open(stream=sys.stdin.buffer.read(),filetype='pdf');print(json.dumps([{'text':p.get_text(),'width':p.rect.width,'height':p.rect.height} for p in d]))",
          ],
          { input: pdf, encoding: "utf8" },
        ),
      );
      expect(pages.length).toBeLessThanOrEqual(3);
      const normalize = (s) => s.replace(/\s/g, "").toLowerCase();
      const printed = normalize(pages.map((p) => p.text).join(""));
      for (const line of text.split("\n").filter(Boolean))
        expect(printed).toContain(normalize(line));
      for (const p of pages) {
        expect(p.width).toBe(612);
        expect(p.height).toBe(792);
        expect(p.text.trim().length).toBeGreaterThan(100);
        expect(p.text).not.toMatch(
          /Back to Resources|Print \/ Save as PDF|Current Specials|awaiting original/,
        );
      }
      if (guide.moduleNumber === 8) {
        await page.emulateMedia({ media: "screen" });
        await page.screenshot({
          path: testInfo.outputPath(`guide-${width}.png`),
          fullPage: true,
        });
      }
      await page.emulateMedia({ media: "screen" });
      await page.getByRole("link", { name: "Back to Resources" }).click();
      await expect(section).toBeVisible();
    }
  });
}

test("Full training links use the corresponding module PDF in a new tab when supplied", async ({
  page,
}) => {
  const data = JSON.parse(
    await readFile(new URL("../data/resources.json", import.meta.url), "utf8"),
  );
  for (const guide of data.resources.filter((r) => r.moduleNumber))
    guide.fullTraining = `assets/training/module-${guide.moduleNumber}.pdf`;
  await page.route("**/data/resources.json", (route) =>
    route.fulfill({ json: data }),
  );
  await page.goto("./#/resources");
  const links = page.getByRole("link", {
    name: "View Full Training",
    exact: true,
  });
  await expect(links).toHaveCount(10);
  for (let i = 0; i < 10; i++) {
    await expect(links.nth(i)).toHaveAttribute(
      "href",
      `assets/training/module-${i + 1}.pdf`,
    );
    await expect(links.nth(i)).toHaveAttribute("target", "_blank");
  }
  await page.goto("./#/resources/sales-playbook-08");
  await expect(
    page.getByRole("link", { name: "View Full Training" }),
  ).toHaveAttribute("href", "assets/training/module-8.pdf");
});

for (const width of [1280, 390]) {
  test(`November Chevrolet lease offers preserve down-payment labels and qualifications at ${width}px`, async ({
    page,
  }) => {
    await page.clock.install({ time: new Date("2026-11-10T17:00:00Z") });
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./#/specials");
    await expect(page.locator(".special-offer")).toHaveCount(16);
    await expect(page.locator(".special-brand h2")).toHaveText([
      "Toyota",
      "Volkswagen",
      "Chevrolet",
    ]);
    await page
      .getByLabel("Manufacturer", { exact: true })
      .selectOption("chevrolet");
    const cards = page.locator(".special-offer");
    await expect(cards).toHaveCount(7);
    const rows = [
      [
        "Silverado Crew Cab 2FL 4x4",
        "$189",
        "$999",
        "$54,095",
        24,
        "GM Financial",
        "A+",
        "Nov 30, 2026",
        "Chevrolet Lease Loyalty required.",
      ],
      [
        "Equinox LT FWD, Previous CTP",
        "$239",
        "$999",
        "$33,170",
        36,
        "GM Financial",
        "A+",
        "Nov 30, 2026",
        "Lease Loyalty or Lease Conquest required.",
      ],
      [
        "Trax LS",
        "$239",
        "$1,999",
        "$25,150",
        36,
        "MSUFCU",
        "Super Tier",
        "Nov 15, 2026",
        "Lease Loyalty or Lease Conquest required.",
      ],
      [
        "Blazer LT FWD",
        "$249",
        "$1,999",
        "$38,815",
        24,
        "GM Financial",
        "A+",
        "Nov 30, 2026",
        "Lease Loyalty or Lease Conquest required.",
      ],
      [
        "Colorado 4x4 Work Truck",
        "$288",
        "$2,799",
        "$41,175",
        36,
        "GM Financial",
        "A+",
        "Nov 30, 2026",
        "Lease Loyalty or Lease Conquest required.",
      ],
      [
        "Equinox EV LT2, Previous CTP",
        "$369",
        "$3,899",
        "$43,690",
        24,
        "GM Financial",
        "A+",
        "Nov 30, 2026",
        "Chevrolet EV Lease Loyalty required.",
      ],
      [
        "Traverse AWD LT",
        "$459",
        "$2,799",
        "$47,505",
        36,
        "MSUFCU",
        "Super Tier",
        "Nov 15, 2026",
        "Lease Loyalty or Lease Conquest required.",
      ],
    ];
    const field = (card, label) =>
      card
        .locator(".special-facts > div")
        .filter({
          has: page.locator("dt", { hasText: new RegExp(`^${label}$`) }),
        })
        .locator("dd");
    for (const [
      name,
      payment,
      down,
      msrp,
      term,
      lender,
      tier,
      expires,
      loyalty,
    ] of rows) {
      const card = cards.filter({
        has: page.getByRole("heading", {
          name: `2026 Chevrolet ${name}`,
          exact: true,
        }),
      });
      await expect(card.locator(".special-payment")).toHaveText(
        `${payment} / month`,
      );
      await expect(card).toContainText(
        "GM Employee or Eligible Family Member pricing required.",
      );
      await expect(card).toContainText(
        `${lender} ${tier} credit approval required.`,
      );
      await expect(card.locator(":scope > .special-facts")).toContainText(
        `Down payment${down}`,
      );
      await expect(
        card.locator(":scope > .special-facts dt"),
      ).not.toContainText(["Due at signing"]);
      await expect(field(card, "Lease term")).toHaveText(`${term} months`);
      await expect(field(card, "Annual mileage")).toHaveText("10,000 miles");
      await expect(field(card, "Expiration date")).toHaveText(expires);
      await card.getByText("Full Offer Details", { exact: true }).click();
      await expect(field(card, "MSRP")).toHaveText(msrp);
      await expect(field(card, "Leasing company")).toHaveText(lender);
      await expect(field(card, "Security deposit")).toHaveText("$0");
      await expect(field(card, "Credit tier")).toHaveText(tier);
      await expect(card.locator("details")).toContainText(loyalty);
      await expect(card.locator("details")).toContainText(
        "GM Rewards Credit Card signup and a minimum $1,000 charge to the card at delivery required.",
      );
      await expect(card.locator("details")).toContainText(
        "Tax, title, CVR, and documentation fees are additional.",
      );
      await expect(card.locator("details")).toContainText(
        "those totals have not been provided",
      );
      await expect(
        card.getByRole("link", { name: /Product Guide/ }),
      ).toHaveCount(0);
      await card.getByText("Full Offer Details", { exact: true }).click();
    }
    const a = await cards.nth(0).boundingBox(),
      b = await cards.nth(1).boundingBox();
    if (width > 760) expect(a.y).toBe(b.y);
    else expect(b.y).toBeGreaterThan(a.y + a.height);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByLabel("Offer Type", { exact: true })
      .selectOption("finance");
    await expect(cards).toHaveCount(0);
    await expect(
      page.getByText("No current finance offers are available for Chevrolet."),
    ).toBeVisible();
  });
}

test("November 15 Chevrolet offers disappear at midnight while later offers remain", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-11-16T04:59:59Z") });
  await page.goto("./#/specials");
  await page
    .getByLabel("Manufacturer", { exact: true })
    .selectOption("chevrolet");
  await expect(page.locator(".special-offer")).toHaveCount(7);
  await page.clock.fastForward(2000);
  await expect(page.locator(".special-offer")).toHaveCount(5);
  await expect(
    page.getByRole("heading", { name: "2026 Chevrolet Trax LS", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "2026 Chevrolet Traverse AWD LT",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByLabel("Manufacturer", { exact: true }).selectOption("");
  await expect(page.locator(".special-offer")).toHaveCount(14);
});
