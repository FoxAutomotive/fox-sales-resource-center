import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fixtureVehicle } from "./fixtures.mjs";
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

test("homepage and primary navigation work under the GitHub Pages subpath", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const missing = [];
  page.on("response", (r) => {
    if (r.status() >= 400) missing.push(r.url());
  });
  await page.goto("./");
  await expect(
    page.getByRole("heading", {
      name: "Know the vehicle. Build the confidence.",
    }),
  ).toBeVisible();
  await expect(page.locator(".manufacturer-card")).toHaveCount(3);
  for (const brand of ["Chevrolet", "Toyota", "Volkswagen"]) {
    await page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: brand, exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: brand, exact: true }),
    ).toBeVisible();
  }
  await page
    .getByRole("link", { name: "Manager’s Specials", exact: false })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Manager’s Specials" }),
  ).toBeVisible();
  await expect(page.getByText("COMING SOON", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  expect(missing).toEqual([]);
});
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
  await expect(page.locator(".vehicle-card")).toHaveCount(4);
  await page.getByRole("searchbox").fill("Super Cruise");
  await expect(page.locator(".vehicle-card")).toHaveCount(0);
  await expect(page.locator(".feature-card")).toHaveCount(1);
  await page.getByRole("searchbox").fill("<img src=x onerror=alert(1)>");
  await expect(page.locator(".vehicle-card")).toHaveCount(0);
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
});
test("manufacturer years remain distinct and model guides disclose missing evidence", async ({
  page,
}) => {
  await page.goto("./#/brand/toyota?year=2027");
  await expect(
    page.getByRole("heading", { name: "Model-year research in progress" }),
  ).toBeVisible();
  await expect(page.locator(".vehicle-card")).toHaveCount(0);
  await page.getByRole("link", { name: "2026 models" }).click();
  await expect(page.locator(".vehicle-card")).toHaveCount(2);
  await page.goto("./#/model/2026-chevrolet-equinox");
  await expect(
    page.getByText("Accuracy comes before a filled-in table."),
  ).toBeVisible();
  await expect(
    page.getByText("Not yet verified", { exact: false }).first(),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Factory packages", exact: true })
    .click();
  await expect(page).toHaveURL(/model\/2026-chevrolet-equinox$/);
  await expect(
    page.getByRole("heading", { name: "Factory packages", exact: true }),
  ).toBeInViewport();
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
test("comparison refuses pending data", async ({ page }) => {
  await page.route("**/data/catalog.json", (route) =>
    route.fulfill({
      json: {
        ...catalog,
        vehicles: catalog.vehicles.filter((v) => v.status !== "verified"),
      },
    }),
  );
  await page.goto("./#/compare");
  await expect(
    page.getByRole("heading", {
      name: "The tool is ready. The evidence comes first.",
    }),
  ).toBeVisible();
  await expect(page.locator("#compare-select")).toHaveCount(0);
});
test("verified synthetic configurations compare across brands and trims", async ({
  page,
}) => {
  await useFixtures(page);
  await page.goto("./#/compare");
  await page.locator("#compare-select").selectOption("fixture-a:base");
  await page.getByRole("button", { name: "Add to comparison" }).click();
  await page.locator("#compare-select").selectOption("fixture-a:plus");
  await page.getByRole("button", { name: "Add to comparison" }).click();
  await expect(
    page.locator('[data-comparison-table="equipment"] tbody tr'),
  ).toHaveCount(3);
  await expect(
    page.locator('[data-comparison-table="equipment"]'),
  ).toContainText("Requires synthetic package");
  await expect(
    page.locator('[data-comparison-table="equipment"]'),
  ).not.toContainText("Synthetic engine A");
  await page.getByRole("radio", { name: "All Equipment", exact: true }).check();
  await expect(
    page.locator('[data-comparison-table="equipment"]'),
  ).toContainText("Synthetic engine A");
  await expect(
    page.locator('[data-comparison-table="equipment"]'),
  ).toContainText("Unverified");
  await page.locator("#compare-select").selectOption("fixture-b:plus");
  await page.getByRole("button", { name: "Add to comparison" }).click();
  await expect(page.locator(".selection-chip")).toHaveCount(3);
  await page.locator(".selection-chip button").first().click();
  await expect(page.locator(".selection-chip")).toHaveCount(2);
});
test("verified model shows upgrades, package conditions, and all equipment controls", async ({
  page,
}) => {
  await useFixtures(page);
  await page.goto("./#/model/fixture-a");
  await expect(
    page.locator(
      '#model-equipment [data-comparison-table="equipment"] tbody tr',
    ),
  ).toHaveCount(3);
  await page.getByRole("radio", { name: "All Equipment", exact: true }).check();
  await expect(
    page.locator(
      '#model-equipment [data-comparison-table="equipment"] tbody tr',
    ),
  ).toHaveCount(30);
  await page
    .getByLabel("Category", { exact: true })
    .selectOption("Performance");
  await expect(
    page.locator(
      '#model-equipment [data-comparison-table="equipment"] tbody tr',
    ),
  ).toHaveCount(10);
  await expect(
    page.locator("#upgrade-section").getByText("Synthetic audio upgrade"),
  ).toBeVisible();
  await page.locator("#package-section summary").click();
  await expect(
    page.getByText("Eligible configurations: Fixture Base"),
  ).toBeVisible();
});
test("pending guide print uses landscape Letter and creates exactly one PDF page", async ({
  page,
}, testInfo) => {
  await page.goto("./#/model/2026-chevrolet-equinox");
  await expect(
    page.getByRole("button", { name: "Print Quick Reference" }),
  ).toBeVisible();
  await page.evaluate(() => {
    window.print = () => {
      window.__printed = true;
    };
  });
  await page.getByRole("button", { name: "Print Quick Reference" }).click();
  expect(await page.evaluate(() => window.__printed)).toBe(true);
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".print-reference")).toBeVisible();
  await expect(page.locator(".site-header")).toBeHidden();
  await expect(page.locator(".print-reference")).toContainText(
    "NOT A SPECIFICATION SHEET",
  );
  const pdf = await page.pdf({
    path: testInfo.outputPath("pending-reference.pdf"),
    preferCSSPageSize: true,
  });
  expect(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length).toBe(1);
});
test("verified synthetic quick reference shares guide data and fits one page", async ({
  page,
}, testInfo) => {
  await useFixtures(page);
  await page.goto("./#/model/fixture-a");
  await expect(
    page.getByRole("heading", { name: "Fixture A", exact: true }),
  ).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".print-reference")).toContainText(
    "Synthetic engine A",
  );
  await expect(page.locator(".print-reference")).toContainText(
    "Synthetic audio upgrade",
  );
  await expect(page.locator(".print-reference")).toContainText(
    "Synthetic comfort package",
  );
  const pdf = await page.pdf({
    path: testInfo.outputPath("verified-fixture-reference.pdf"),
    preferCSSPageSize: true,
  });
  expect(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length).toBe(1);
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
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  const violations = [];
  for (const route of [
    "/",
    "/search",
    "/brand/toyota",
    "/model/2026-toyota-rav4",
    "/model/2026-volkswagen-tiguan",
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

test("RAV4 HEV brochure equipment, package caveats and separate PHEV link render", async ({
  page,
}) => {
  await page.goto("./#/model/2026-toyota-rav4");
  await expect(
    page.locator(
      '#model-equipment [data-comparison-table="equipment"] thead th',
    ),
  ).toHaveCount(3);
  await expect(page.locator("#model-equipment")).not.toContainText("Plug-in");
  await page.getByRole("radio", { name: "All Equipment", exact: true }).check();
  await expect(page.locator("#model-equipment")).toContainText("B1 pp. 21");
  await expect(page.locator("#model-equipment")).toContainText("Unverified");
  await page
    .locator("#package-section summary")
    .filter({ hasText: "XLE Driver Assist Package" })
    .click();
  await expect(
    page.locator("#package-section details[open] .editorial-note"),
  ).toBeVisible();
  await page
    .getByRole("link", {
      name: "Separate plug-in hybrid reference",
      exact: false,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "RAV4 Plug-in Hybrid", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(
      '#model-equipment [data-comparison-table="equipment"] thead th',
    ),
  ).toHaveCount(3);
  await expect(page.locator("#model-equipment")).not.toContainText("B1");
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
test("RAV4 hybrid quick reference fits landscape Letter and includes all grades and package caveats", async ({
  page,
}, testInfo) => {
  await page.goto("./#/model/2026-toyota-rav4");
  await expect(
    page.locator('#model-equipment [data-comparison-table="equipment"]'),
  ).toBeVisible();
  await page.emulateMedia({ media: "print" });
  const sheet = page.locator(".print-reference");
  await expect(sheet.locator(".print-grade-table tbody tr")).toHaveCount(6);
  for (const name of [
    "LE HEV",
    "SE HEV",
    "XLE Premium HEV",
    "Woodland HEV",
    "XSE HEV",
    "Limited HEV",
    "Weather Package",
    "XLE Driver Assist Package",
    "Contents U.",
  ])
    await expect(sheet).toContainText(name);
  await expect(sheet).not.toContainText("GR SPORT");
  const pdf = await page.pdf({
    path: testInfo.outputPath("rav4-hybrid-reference.pdf"),
    preferCSSPageSize: true,
  });
  expect(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length).toBe(1);
});

test("model trim picker supports three selections, visible baseline, packages and verified Why Upgrade", async ({
  page,
}) => {
  const v = fixtureVehicle();
  const third = structuredClone(v.trims[1]);
  third.id = "max";
  third.name = "Fixture Max";
  third.equipment.audio.value = "Synthetic premium audio";
  v.trims.push(third);
  await page.route("**/data/catalog.json", (route) =>
    route.fulfill({ json: { ...catalog, vehicles: [v] } }),
  );
  await page.goto("./#/model/fixture-a");
  await expect(
    page.getByRole("radio", { name: "Trim Differences", exact: true }),
  ).toBeChecked();
  const main = page.locator('[data-comparison-table="equipment"]');
  await expect(main).not.toContainText("Synthetic engine A");
  await expect(main).toContainText("Unavailable");
  await expect(main).toContainText("Unverified");
  await expect(page.locator(".comparison-upgrades")).toContainText(
    "Synthetic audio upgrade",
  );
  await expect(
    page.locator('[data-comparison-table="packages"]'),
  ).toContainText("Synthetic heated seats");
  await expect(
    page.locator('[data-comparison-table="baseline"]'),
  ).toContainText("Synthetic engine A");
  await expect(
    page.locator('[data-comparison-table="baseline"]'),
  ).not.toContainText("Synthetic heated seats");
  await page.locator(".model-trim-picker > summary").click();
  await page.locator('input[name="model-trim"][value="fixture-a:max"]').check();
  await expect(main.locator("thead th")).toHaveCount(4);
  await page.getByRole("radio", { name: "All Equipment", exact: true }).check();
  await expect(main).toContainText("Synthetic engine A");
  await expect(main.locator("tbody tr")).toHaveCount(catalog.fields.length);
  await page
    .locator('input[name="model-trim"][value="fixture-a:base"]')
    .uncheck();
  await page
    .locator('input[name="model-trim"][value="fixture-a:plus"]')
    .uncheck();
  await expect(
    page.getByRole("heading", { name: "Select at least two configurations" }),
  ).toBeVisible();
  await page
    .locator('input[name="model-trim"][value="fixture-a:base"]')
    .check();
  await expect(main.locator("thead th")).toHaveCount(3);
  await expect(
    page.getByRole("radio", { name: "All Equipment", exact: true }),
  ).toBeChecked();
});
test("same availability filter applies to cross-model comparisons and package contents", async ({
  page,
}) => {
  const v = fixtureVehicle();
  v.trims[1].equipment.engine.status = "optional";
  v.trims[1].equipment.engine.conditions = "Synthetic engine package";
  await page.route("**/data/catalog.json", (route) =>
    route.fulfill({ json: { ...catalog, vehicles: [v] } }),
  );
  await page.goto("./#/compare");
  for (const id of ["fixture-a:base", "fixture-a:plus"]) {
    await page.locator("#compare-select").selectOption(id);
    await page.getByRole("button", { name: "Add to comparison" }).click();
  }
  await expect(
    page.getByRole("radio", { name: "Trim Differences", exact: true }),
  ).toBeChecked();
  const main = page.locator('[data-comparison-table="equipment"]');
  await expect(main).toContainText("Synthetic engine A");
  await expect(main).toContainText("Optional");
  await expect(main).toContainText("Unavailable");
  await expect(main).toContainText("Unverified");
  await expect(
    page.locator('[data-comparison-table="packages"]'),
  ).toContainText("Synthetic heated seats");
  await page.getByRole("radio", { name: "All Equipment", exact: true }).check();
  await expect(main.locator("tbody tr")).toHaveCount(catalog.fields.length);
  await page
    .getByRole("radio", { name: "Trim Differences", exact: true })
    .check();
  await expect(main.locator("tbody tr")).toHaveCount(4);
});
test("selection and All Equipment never change the full model print reference", async ({
  page,
}, testInfo) => {
  await page.goto("./#/model/2026-toyota-rav4");
  await page.locator(".model-trim-picker > summary").click();
  await page
    .locator('input[name="model-trim"]')
    .filter({ visible: true })
    .first()
    .uncheck();
  await page.getByRole("radio", { name: "All Equipment", exact: true }).check();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".print-grade-table tbody tr")).toHaveCount(6);
  await expect(page.locator(".model-trim-picker")).toBeHidden();
  const pdf = await page.pdf({
    path: testInfo.outputPath("unchanged-full-model-reference.pdf"),
    preferCSSPageSize: true,
  });
  expect(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length).toBe(1);
});

test("Trim Differences shows verified base specifications once and updates the baseline", async ({
  page,
}) => {
  const v = fixtureVehicle();
  const third = structuredClone(v.trims[1]);
  third.id = "max";
  third.name = "Fixture Max";
  third.equipment.audio.value = "Synthetic highest audio";
  v.trims.push(third);
  v.upgrades.push({
    from: "Fixture Plus",
    to: "Fixture Max",
    gains: [{ text: "Synthetic max gain", sourceIds: ["test-source"] }],
  });
  await page.route("**/data/catalog.json", (route) =>
    route.fulfill({ json: { ...catalog, vehicles: [v] } }),
  );
  await page.goto("./#/model/fixture-a");
  await expect(
    page.getByRole("radio", { name: "Trim Differences", exact: true }),
  ).toBeChecked();
  await expect(page.locator(".baseline-identity")).toContainText(
    "Fixture Base",
  );
  const base = page.locator('[data-comparison-table="baseline"]');
  const changes = page.locator('[data-comparison-table="equipment"]');
  await expect(base).toContainText("Synthetic engine A");
  await expect(changes).not.toContainText("Synthetic engine A");
  await expect(changes).toContainText("Synthetic upgraded audio");
  await expect(page.locator(".baseline-column-label")).toHaveCount(1);
  await page.locator(".model-trim-picker > summary").click();
  await page.locator('input[name="model-trim"][value="fixture-a:max"]').check();
  await page
    .locator('input[name="model-trim"][value="fixture-a:base"]')
    .uncheck();
  await expect(page.locator(".baseline-identity")).toContainText(
    "Fixture Plus",
  );
  await expect(page.locator(".baseline-identity")).not.toContainText(
    "Fixture Base",
  );
  await expect(base).toContainText("Synthetic engine A");
  await expect(changes).not.toContainText("Synthetic engine A");
  await page.getByRole("radio", { name: "All Equipment", exact: true }).check();
  await expect(page.locator(".baseline-equipment")).toHaveCount(0);
  await expect(changes).toContainText("Synthetic engine A");
  await expect(changes.locator("tbody tr")).toHaveCount(catalog.fields.length);
  await page
    .getByRole("radio", { name: "Trim Differences", exact: true })
    .check();
  await expect(page.locator(".baseline-identity")).toContainText(
    "Fixture Plus",
  );
});
test("cross comparison chooses the lower selected trim even when added last", async ({
  page,
}) => {
  await useFixtures(page);
  await page.goto("./#/compare");
  for (const id of ["fixture-a:plus", "fixture-a:base"]) {
    await page.locator("#compare-select").selectOption(id);
    await page.getByRole("button", { name: "Add to comparison" }).click();
  }
  await expect(page.locator(".baseline-identity")).toContainText(
    "Fixture Base",
  );
  await expect(
    page.locator('[data-comparison-table="baseline"]'),
  ).toContainText("Synthetic engine A");
  await expect(
    page.locator('[data-comparison-table="equipment"]'),
  ).not.toContainText("Synthetic engine A");
  await expect(
    page.locator('[data-comparison-table="equipment"] thead th').last(),
  ).toContainText("Baseline");
});
test("RAV4 baseline keeps its engine, output, drivetrain, safety and infotainment visible", async ({
  page,
}) => {
  await page.goto("./#/model/2026-toyota-rav4");
  await expect(page.locator(".baseline-identity")).toContainText("LE Hybrid");
  const base = page.locator('[data-comparison-table="baseline"]');
  for (const text of [
    "2.5L Dynamic Force",
    "226 net combined hp",
    "Front-wheel drive",
    "Toyota Safety Sense 4.0",
    "10.5-inch Toyota Audio Multimedia",
  ])
    await expect(base).toContainText(text);
  await expect(
    page.locator('[data-comparison-table="equipment"]'),
  ).not.toContainText("2.5L Dynamic Force");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

test("audited RAV4 technical facts and HEV not-applicable states render without hiding genuine unknowns", async ({
  page,
}) => {
  await page.goto("./#/model/2026-toyota-rav4");
  await page.getByRole("radio", { name: "All Equipment", exact: true }).check();
  const table = page.locator('[data-comparison-table="equipment"]');
  await expect(table).toContainText("170 lb-ft (231 N·m)");
  await expect(table).toContainText("torque basis not specified");
  await expect(table).toContainText("Not applicable — conventional HEV");
  await expect(table).toContainText("Unavailable");
  await expect(table).toContainText("Unverified");
  await expect(page.locator("#source-section")).toContainText(
    "all 93 previously Unverified",
  );
});

test("Stage 1 trim cards keep configuration-specific facts and open categorized equipment", async ({
  page,
}) => {
  await page.goto("./#/model/2026-toyota-rav4");
  const cards = page.locator(".trim-training-card");
  await expect(cards).toHaveCount(6);
  await expect(page.locator("#trim-lineup")).toContainText("9 configurations");
  const le = cards.filter({
    has: page.getByRole("heading", { name: "LE Hybrid", exact: true }),
  });
  await expect(le.locator(".trim-core-specs")).toContainText("226");
  await le.locator("select").selectOption({ label: "HEV · AWD" });
  await expect(le.locator(".trim-core-specs")).toContainText("236");
  await expect(le.locator(".trim-core-specs")).toContainText("AWD");
  for (const card of await cards.all()) {
    const count = await card.locator(".trim-highlights li").count();
    expect(count).toBeGreaterThanOrEqual(3);
    expect(count).toBeLessThanOrEqual(5);
  }
  await le.getByRole("button", { name: "View Equipment", exact: true }).click();
  await expect(page.locator("#equipment-config option:checked")).toHaveText(
    "LE Hybrid · HEV · AWD",
  );
  await expect(page.locator("#equipment-detail-title")).toBeFocused();
  await expect(page.locator(".categorized-fields dt")).toHaveCount(
    catalog.fields.length,
  );
  const comfort = page
    .locator(".equipment-category")
    .filter({ has: page.locator("summary > span", { hasText: /^Comfort$/ }) });
  await comfort.locator("summary").click();
  await expect(comfort.locator(".categorized-fields")).toBeVisible();
  await expect(page.locator("#categorized-equipment")).toContainText("Source:");
  await page
    .locator("#equipment-config")
    .selectOption({ label: "XLE Premium Hybrid · HEV · FWD" });
  const packages = page
    .locator(".equipment-category")
    .filter({ hasText: "Packages & listed options" });
  await packages.locator("summary").click();
  await expect(packages).toContainText("Contents Unverified");
});

test("trim card comparison action preserves the baseline and All Equipment views", async ({
  page,
}) => {
  await page.goto("./#/model/2026-toyota-rav4");
  const limited = page.locator(".trim-training-card").filter({
    has: page.getByRole("heading", { name: "Limited Hybrid", exact: true }),
  });
  await limited
    .getByRole("button", { name: "Compare Trims", exact: true })
    .click();
  await expect(
    page.locator('input[name="model-trim"][value$="limited-hev-awd"]'),
  ).toBeChecked();
  await expect(page.locator("#trim-section")).toBeFocused();
  await expect(page.locator("#model-view-differences")).toBeChecked();
  await expect(page.locator("#model-equipment")).toContainText(
    "Base Equipment",
  );
  await expect(page.locator("#model-equipment")).toContainText("What Changes");
  await page.locator("#model-view-all").check();
  await expect(
    page.locator(
      '#model-equipment [data-comparison-table="equipment"] tbody tr',
    ),
  ).toHaveCount(catalog.fields.length);
});

test("Stage 2 navigation provides honest landing pages and retains working guide links", async ({
  page,
}) => {
  await page.goto("./");
  const nav = page.getByRole("navigation", { name: "Primary navigation" });
  for (const title of ["Compare Vehicles", "Equipment Search"]) {
    await nav.getByRole("link", { name: new RegExp(`^${title}`) }).click();
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(page.locator("main")).toContainText("STAGE 2");
    await expect(page.locator("main input, main select")).toHaveCount(0);
    await expect(page.locator('main a[href="#/search"]')).toBeVisible();
  }
  await nav.getByRole("link", { name: "Model Guides", exact: true }).click();
  await expect(page.locator(".vehicle-card")).toHaveCount(
    catalog.vehicles.length,
  );
});

test("trim lineup and equipment remain usable on narrow mobile and desktop", async ({
  page,
}, testInfo) => {
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto("./#/model/2026-toyota-rav4");
    await expect(page.locator(".trim-training-card")).toHaveCount(6);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `viewport ${width}`,
    ).toBe(true);
    await expect(page.locator(".trim-card-visual img")).toHaveCount(0);
    await expect(page.locator(".trim-image-placeholder")).toHaveCount(0);
    await expect(page.locator(".trim-card-visual")).toHaveCount(0);
    await page.locator("#trim-lineup").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: testInfo.outputPath(`rav4-lineup-${width}.png`),
      fullPage: false,
    });
  }
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

test("Tiguan reuses trim cards, switches drivetrain specs, and displays sourced equipment", async ({
  page,
}) => {
  await page.goto("./#/model/2026-volkswagen-tiguan");
  const cards = page.locator(".trim-training-card");
  await expect(cards).toHaveCount(4);
  await expect(
    page.locator(".trim-card-visual, .trim-image-placeholder"),
  ).toHaveCount(0);
  for (const card of await cards.all()) {
    await expect(card.locator(".trim-core-specs > div")).toHaveCount(4);
    expect(
      await card.locator(".trim-highlights li").count(),
    ).toBeGreaterThanOrEqual(3);
    expect(
      await card.locator(".trim-highlights li").count(),
    ).toBeLessThanOrEqual(5);
    await expect(card.locator(".trim-msrp")).toContainText("2026-11-04");
  }
  await expect(cards.first()).toContainText("$30,805");
  await cards
    .first()
    .getByLabel("Configuration", { exact: true })
    .selectOption("2026-volkswagen-tiguan:s-4motion");
  await expect(cards.first()).toContainText("$32,305");
  await expect(cards.first()).toContainText(
    "22 city / 30 highway / 25 combined",
  );
  await cards
    .last()
    .getByRole("button", { name: "View Equipment", exact: true })
    .click();
  await expect(page.locator("#equipment-config")).toHaveValue(
    "2026-volkswagen-tiguan:sel-r-line-turbo-4motion",
  );
  const comfort = page
    .locator(".equipment-category")
    .filter({ has: page.locator("summary > span", { hasText: /^Comfort$/ }) });
  await comfort.locator("summary").click();
  await expect(comfort).toContainText("Quilted Varenna leather");
  await expect(comfort).toContainText("delayed availability");
  const tech = page.locator(".equipment-category").filter({
    has: page.locator("summary > span", { hasText: /^Technology$/ }),
  });
  await tech.locator("summary").click();
  await expect(tech).toContainText("15-inch display");
  await expect(tech).toContainText("does not itemize them");
  await expect(page.locator("#categorized-equipment")).toContainText(
    "Not Applicable",
  );
  const changes = page.locator(
    '#model-equipment .what-changes [data-comparison-table="equipment"]',
  );
  await expect(changes).toContainText("Starting MSRP");
  await expect(
    page.locator('#model-equipment [data-comparison-table="baseline"]'),
  ).toContainText("201 hp");
  await page.locator("#model-view-all").check();
  await expect(
    page.locator('#model-equipment [data-comparison-table="equipment"]'),
  ).toContainText("Ground clearance");
});

test("Tiguan quick reference is a one-page gasoline guide with correct pricing and no photos", async ({
  page,
}, testInfo) => {
  await page.goto("./#/model/2026-volkswagen-tiguan");
  await expect(page.locator(".trim-training-card")).toHaveCount(4);
  await page.emulateMedia({ media: "print" });
  const sheet = page.locator(".print-reference");
  await expect(sheet.locator(".print-grade-table tbody tr")).toHaveCount(4);
  await expect(sheet).toContainText("4 gasoline trims / 7 configurations");
  await expect(sheet).toContainText("$43,085");
  await expect(sheet).not.toContainText("PHEV only");
  const pdf = await page.pdf({
    path: testInfo.outputPath("tiguan-reference.pdf"),
    preferCSSPageSize: true,
  });
  expect(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length).toBe(1);
});

test("Tiguan mobile layout and cross-brand comparison preserve existing components", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("./#/model/2026-volkswagen-tiguan");
  await expect(page.locator(".trim-training-card")).toHaveCount(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto("./#/compare");
  for (const id of [
    "2026-toyota-rav4:le-hev-fwd",
    "2026-volkswagen-tiguan:s-fwd",
  ]) {
    await page.locator("#compare-select").selectOption(id);
    await page.locator("#add-compare").click();
  }
  await expect(page.locator("#comparison-results")).toContainText("207 lb-ft");
  await expect(page.locator("#comparison-results")).toContainText(
    "torque basis not specified",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
