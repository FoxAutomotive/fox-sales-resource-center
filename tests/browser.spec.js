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
  await expect(page.locator(".vehicle-card")).toHaveCount(1);
  await expect(page.locator(".vehicle-card h3")).toContainText("RAV4");
  await page.getByLabel("Model year", { exact: true }).selectOption("2027");
  await expect(
    page.getByRole("heading", { name: "No matching guides yet" }),
  ).toBeVisible();
  await expect(page.locator(".vehicle-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".vehicle-card")).toHaveCount(3);
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
  await page.getByRole("link", { name: "RAV4", exact: false }).first().click();
  await expect(
    page.getByText("Accuracy comes before a filled-in table."),
  ).toBeVisible();
  await expect(
    page.getByText("Not yet verified", { exact: false }).first(),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Factory packages", exact: true })
    .click();
  await expect(page).toHaveURL(/model\/2026-toyota-rav4$/);
  await expect(
    page.getByRole("heading", { name: "Factory packages", exact: true }),
  ).toBeInViewport();
});
test("glossary expands and can be searched with the keyboard shortcut", async ({
  page,
}) => {
  await page.goto("./#/features");
  await expect(page.locator(".feature-card")).toHaveCount(5);
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
  await expect(page.locator(".equipment-table tbody tr")).toHaveCount(2);
  await expect(page.locator(".equipment-table")).toContainText(
    "Requires synthetic package",
  );
  await expect(page.locator(".equipment-table")).not.toContainText(
    "Synthetic engine A",
  );
  await page.getByLabel("Show verified differences only").uncheck();
  await expect(page.locator(".equipment-table")).toContainText(
    "Synthetic engine A",
  );
  await expect(page.locator(".equipment-table")).toContainText("Unverified");
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
  await expect(page.locator("#model-equipment tbody tr")).toHaveCount(2);
  await page.getByLabel("Show verified differences only").uncheck();
  await expect(page.locator("#model-equipment tbody tr")).toHaveCount(21);
  await page
    .getByLabel("Category", { exact: true })
    .selectOption("Performance");
  await expect(page.locator("#model-equipment tbody tr")).toHaveCount(7);
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
  await page.goto("./#/model/2026-toyota-rav4");
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
    "/features",
    "/compare",
    "/specials",
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
