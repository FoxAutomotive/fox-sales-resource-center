import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const data = JSON.parse(
  await readFile(new URL("../data/resources.json", import.meta.url)),
);
const training = data.resources.find((r) => r.id === "fox-team-ai-training-02");
const trainings = data.resources.filter(
  (r) => r.category === "fox-team-ai-training",
);
const hashes = {
  "fox-team-ai-training-01":
    "b9d2eeb9c0a052c5e84a17dd3e043997387594c794172579c8038602a2cec196",
  "fox-team-ai-training-02":
    "e74aa789c7ee2ac617afa924f33d14d8a268ced8af1b048d035ba28dd48e924f",
};
test.use({ channel: "chromium" });
for (const width of [1280, 390]) {
  test(`AI training section keeps existing sales resources and opens both original PDFs at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./#/resources");
    await expect(page.getByRole("heading", { level: 2 })).toHaveText([
      "FOX AUTOMOTIVE SALES PLAYBOOK",
      "Sales Training",
      "FOX TEAM AI TRAINING",
    ]);
    await expect(
      page.getByRole("link", { name: "Read Quick Guide", exact: true }),
    ).toHaveCount(10);
    await expect(
      page.getByRole("link", { name: "View Full Training", exact: true }),
    ).toHaveCount(10);
    const section = page.locator(".section-block").filter({
      has: page.getByRole("heading", {
        name: "FOX TEAM AI TRAINING",
        exact: true,
      }),
    });
    await expect(
      section.getByRole("link", { name: "View Training", exact: true }),
    ).toHaveCount(2);
    await expect(section.locator("h3")).toHaveText(
      trainings.map((r) => r.title),
    );
    for (const training of trainings) {
      const card = section.locator("article").filter({
        has: page.getByRole("heading", { name: training.title, exact: true }),
      });
      await expect(card).toContainText(training.title);
      await expect(section).toContainText(training.description);
      const link = card.getByRole("link", {
        name: "View Training",
        exact: true,
      });
      await expect(link).toHaveAttribute("href", training.trainingDocument);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await section.screenshot({
        path: testInfo.outputPath(`ai-training-${width}.png`),
      });
      const popupPromise = page.waitForEvent("popup");
      await link.click();
      const tab = await popupPromise;
      const url = new URL(training.trainingDocument, page.url().split("#")[0])
        .href;
      await expect.poll(() => tab.url()).toBe(url);
      const response = await page.request.get(url);
      expect(response.ok()).toBe(true);
      expect(response.headers()["content-type"]).toContain("application/pdf");
      expect(
        createHash("sha256")
          .update(await response.body())
          .digest("hex"),
      ).toBe(hashes[training.id]);
      const downloadEvent = page.waitForEvent("download");
      await page.evaluate((url) => {
        const a = document.createElement("a");
        a.href = url;
        a.download = new URL(url).pathname.split("/").at(-1);
        document.body.append(a);
        a.click();
        a.remove();
      }, url);
      const download = await downloadEvent;
      const destination = testInfo.outputPath(`${training.id}.pdf`);
      await download.saveAs(destination);
      expect(
        createHash("sha256")
          .update(await readFile(destination))
          .digest("hex"),
      ).toBe(hashes[training.id]);
      await tab.close();
      await page.goto(`./#/resources/${training.id}`);
      await expect(
        page.getByRole("link", { name: "View Training", exact: true }),
      ).toHaveAttribute("href", training.trainingDocument);
      await expect(page.locator("#print-resource")).toHaveCount(0);
      await page.goto("./#/resources");
    }
  });
}

test("Future AI image documents need only a manifest record, not new components", async ({
  page,
}) => {
  const next = structuredClone(data);
  next.resources.push({
    ...training,
    id: "ai-training-test-fixture",
    title: "Future image training fixture",
    heading: "Future image training fixture",
    trainingDocument: "assets/training/ai/test-fixture.png",
  });
  await page.route("**/data/resources.json", (route) =>
    route.fulfill({ json: next }),
  );
  await page
    .context()
    .route("**/assets/training/ai/test-fixture.png", (route) =>
      route.fulfill({ path: "assets/fox-logo.png", contentType: "image/png" }),
    );
  await page.goto("./#/resources");
  const card = page.locator(".resource-list article").filter({
    has: page.getByRole("heading", { name: "Future image training fixture" }),
  });
  const popupPromise = page.waitForEvent("popup");
  await card.getByRole("link", { name: "View Training", exact: true }).click();
  const tab = await popupPromise;
  await expect(tab.locator("img")).toBeVisible();
  expect(
    await tab.locator("img").evaluate((image) => image.naturalWidth > 0),
  ).toBe(true);
  await tab.close();
});
