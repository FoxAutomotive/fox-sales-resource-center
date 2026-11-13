import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const catalog = JSON.parse(
  readFileSync(new URL("../data/catalog.json", import.meta.url)),
);
const models = catalog.vehicles.filter((v) => v.brand === "chevrolet");
for (const width of [1280, 390]) {
  test(`Chevrolet seven model-years and all 44 configurations retain equipment/specification pop-ups at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: 844 });
    for (const v of models) {
      await page.goto(`./#/model/${v.id}`);
      await expect(page.locator(".trim-training-card")).toHaveCount(
        new Set(v.trims.map((t) => t.name)).size,
      );
      await expect(
        page.locator("#why-upgrade .equipment-category").first(),
      ).toBeVisible();
      await expect(
        page.locator(
          ".model-page #compare-select, .model-page #model-equipment, .model-page .equipment-detail",
        ),
      ).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        v.id,
      ).toBe(true);
      const opener = page.locator("#view-equipment");
      await opener.click();
      for (const t of v.trims) {
        await page.locator("#equipment-config").selectOption(`${v.id}:${t.id}`);
        await expect(page.locator("#reference-context")).toContainText(t.name);
        await expect(
          page
            .locator("#categorized-equipment .equipment-status.standard")
            .first(),
        ).toBeVisible();
        await expect(
          page.locator(
            "#categorized-equipment .equipment-status:not(.standard)",
          ),
        ).toHaveCount(0);
        await expect(page.getByRole("dialog")).not.toContainText(
          "Available (Optional)",
        );
      }
      await page.keyboard.press("Escape");
      await expect(opener).toBeFocused();
      await page.locator("#view-specifications").click();
      for (const t of v.trims) {
        await page.locator("#spec-config").selectOption(`${v.id}:${t.id}`);
        await expect(page.getByRole("dialog")).toContainText(t.name);
        await expect(page.getByRole("dialog")).toContainText(
          t.equipment.transmission.value,
        );
      }
      await page.getByRole("button", { name: "Close dialog" }).click();
      await page.locator("#view-sources").click();
      const source = page
        .getByRole("dialog")
        .getByRole("link", { name: v.sources[0].title, exact: false })
        .first();
      await expect(source).toBeVisible();
      await page.keyboard.press("Escape");
    }
  });
}

test("Chevrolet comparisons preserve independently verified model-year powertrains and equipment", async ({
  page,
}) => {
  await page.goto("./#/compare");
  for (const id of [
    "2026-chevrolet-equinox:lt-fwd",
    "2027-chevrolet-equinox:lt-fwd",
    "2026-chevrolet-trax:lt-fwd",
    "2027-chevrolet-trax:lt-fwd",
  ]) {
    await page.locator("#compare-select").selectOption(id);
    await page.locator("#add-compare").click();
  }
  const results = page.locator("#comparison-results");
  await expect(results).toContainText("CVT");
  await expect(results).toContainText("8-speed");
  await expect(results).toContainText("137 hp");
  await expect(results).toContainText("140 hp");
  await page.locator("#compare-view-all").check();
  const acc = results.locator("tr").filter({
    has: page.getByRole("rowheader", {
      name: "Safety Adaptive cruise control",
      exact: true,
    }),
  });
  await expect(acc.locator("td").nth(2)).toContainText("Not standard");
  await expect(acc.locator("td").nth(3)).toContainText("Standard");
  await expect(results).not.toContainText("Base Equipment");
});
