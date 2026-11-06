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
  await expect(page.locator(".vehicle-card")).toHaveCount(2);
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
      await expect(card.locator(".trim-card-actions button")).toHaveCount(2);
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
  await expect(page.locator(".special-offer")).toHaveCount(4);
  await expect(
    page.getByText("No current offers are available for Volkswagen."),
  ).toBeVisible();
  await expect(
    page.getByText("No current offers are available for Chevrolet."),
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
  await expect(page.locator(".special-offer")).toHaveCount(0);
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
  await expect(cards).toHaveCount(4);
});

test("specials expire on an open page at dealership midnight", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-12-01T04:59:59Z") });
  await page.goto("./#/specials");
  await expect(page.locator(".special-offer")).toHaveCount(4);
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

test("all model guides retain cards, standard-only comparisons, equipment explanations and sources", async ({
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
      page.locator("#specifications, #equipment-explained"),
    ).toHaveCount(2);
    await expect(
      page.locator(
        ".equipment-detail, #package-section, #source-section, .upgrade-grid, #categorized-equipment, #compare-select",
      ),
    ).toHaveCount(0);
    await expect(page.locator(".model-page")).not.toContainText("Unverified");
    if (v.trims.length)
      await expect(page.locator("#model-equipment")).not.toContainText(
        "Available (Optional)",
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
  await page.locator("#model-view-all").check();
  await expect(equipmentTable(page)).toContainText("Not standard");
  await expect(equipmentTable(page)).not.toContainText(
    "Requires synthetic package",
  );
  await expect(page.locator("#specifications")).toContainText("N/A");
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

test("Find Your Differences keeps core mechanics and one selection-aware standard Why Upgrade", async ({
  page,
}) => {
  await useFixtures(page);
  await page.goto(modelPath("fixture-a"));
  const table = equipmentTable(page);
  await expect(table).toContainText("Synthetic engine A");
  await expect(table).toContainText("Synthetic upgraded audio");
  await expect(table).toContainText("Not standard");
  await expect(page.locator("#why-upgrade")).toHaveCount(1);
  await expect(page.locator("#why-upgrade")).toContainText(
    "Synthetic heated seats",
  );
  await expect(page.locator("#why-upgrade")).not.toContainText(
    /package|Available|Unverified/,
  );
  await page.locator("#model-view-all").check();
  await expect(table).toContainText("Synthetic engine A");
  await page.locator("#model-view-differences").check();
  await page.locator(".model-trim-picker > summary").click();
  await page.locator('input[value="fixture-a:plus"]').uncheck();
  await expect(
    page.getByRole("heading", { name: "Select at least two configurations" }),
  ).toBeVisible();
  await expect(page.locator("#why-upgrade")).toHaveCount(0);
  await page.locator('input[value="fixture-a:plus"]').check();
  await expect(page.locator("#why-upgrade")).toContainText(
    "Fixture Base → Fixture Plus",
  );
  await page.locator("#model-group").selectOption("Safety");
  await expect(table).toHaveCount(0);
  await page.locator("#model-group").selectOption("");
  await expect(table).toContainText("Synthetic engine A");
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
    ["Find Your Differences", "trim-section"],
    ["Equipment Explained", "equipment-explained"],
    ["Specifications", "specifications"],
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
  await page
    .locator("#spec-config")
    .selectOption("2027-chevrolet-equinox:lt-fwd");
  await expect(page.locator("#specifications")).toContainText("14.8 U.S. gal");
  await expect(page.locator("#specifications")).toContainText(
    "8-speed automatic",
  );
  const dialog = await openEquipment(page);
  await page
    .locator("#equipment-config")
    .selectOption("2027-chevrolet-equinox:lt-awd");
  await expect(dialog).toContainText("15.6 U.S. gal");
  await expect(dialog).toContainText("3583 lb");
  await page.keyboard.press("Escape");
  await expect(page.locator("#spec-config")).toHaveValue(
    "2027-chevrolet-equinox:lt-awd",
  );
  await expect(page.locator("#specifications")).toContainText(
    "8-speed automatic",
  );
  await expect(page.locator("#specifications")).toContainText("63.5 cu ft");
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
    for (const trigger of ["#view-equipment", "#view-sources"]) {
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

test("both shared dialogs pass accessible naming and automated WCAG checks", async ({
  page,
}) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.goto(modelPath("2027-chevrolet-equinox"));
  for (const trigger of ["#view-equipment", "#view-sources"]) {
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
  await page.locator("#model-view-all").check();
  await page
    .locator("#spec-config")
    .selectOption("2027-chevrolet-equinox:rs-awd");
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
  await expect(
    page.locator(
      '#specifications [title="N/A — not applicable to this configuration"]',
    ),
  ).not.toHaveCount(0);
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
      "2026-volkswagen-tiguan",
      "2027-chevrolet-equinox",
    ]) {
      const vehicle = catalog.vehicles.find((v) => v.id === id);
      await page.goto(modelPath(vehicle));
      await expect(page.locator("h1")).toHaveText(vehicle.model);
      const unchanged = [
        "#navigation",
        "#model-equipment",
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
        await expect(page.locator("#specifications")).toBeVisible();
        await expect(page.locator("#model-equipment")).toHaveCount(1);
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
      await page.locator("#model-view-all").check();
      await expect(equipmentTable(page)).toBeVisible();
      await page.locator("#model-view-differences").check();
      await expect(equipmentTable(page)).toBeVisible();
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
