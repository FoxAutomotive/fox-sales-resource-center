import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
// Actual PDF viewing needs full Chromium, including in CI.
test.use({ channel: "chromium" });
for (const width of [1280, 390]) {
  test(`All ten supplied full-training PDFs open correct new tabs and download intact at ${width}px`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(90000);
    const data = JSON.parse(
      await readFile(
        new URL("../data/resources.json", import.meta.url),
        "utf8",
      ),
    );
    const { createHash } = await import("node:crypto");
    const report = JSON.parse(
      await readFile(
        new URL(
          "../docs/full-salesperson-training-files.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./#/resources");
    const links = page.getByRole("link", {
      name: "View Full Training",
      exact: true,
    });
    await expect(links).toHaveCount(10);
    await expect(
      page.getByText("Full training awaiting original Academy PDF"),
    ).toHaveCount(0);
    for (const file of report.files) {
      const link = links.nth(file.moduleNumber - 1);
      await expect(link).toHaveAttribute("href", file.path);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener");
      const url = new URL(file.path, page.url().split("#")[0]).href;
      const popup = page.waitForEvent("popup");
      await link.click();
      const tab = await popup;
      await expect.poll(() => tab.url()).toBe(url);
      await expect
        .poll(
          () =>
            tab
              .frames()
              .some((frame) => frame.url().startsWith("chrome-extension://")),
          { timeout: 15000 },
        )
        .toBe(true);
      const viewer = tab
        .frames()
        .find((frame) => frame.url().startsWith("chrome-extension://"));
      await expect(
        viewer.getByRole("button", { name: "Print", exact: true }),
      ).toBeVisible();
      await expect(
        viewer.getByRole("button", { name: "Print", exact: true }),
      ).toBeEnabled();
      const response = await page.request.get(url);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("application/pdf");
      const bytes = await response.body();
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        file.sha256,
      );
      const downloadEvent = tab.waitForEvent("download");
      await viewer
        .getByRole("button", { name: "Download", exact: true })
        .click();
      const download = await downloadEvent;
      const destination = testInfo.outputPath(
        `module-${file.moduleNumber}.pdf`,
      );
      await download.saveAs(destination);
      expect(
        createHash("sha256")
          .update(await readFile(destination))
          .digest("hex"),
      ).toBe(file.sha256);
      if (file.moduleNumber === 1)
        await tab.screenshot({
          path: testInfo.outputPath(`pdf-viewer-${width}.png`),
        });
      await tab.close();
    }
    // Detail pages expose the same PDF without embedding or changing the Quick Guide.
    for (const guide of data.resources.filter((r) => r.moduleNumber)) {
      await page.goto(`./#/resources/${guide.id}`);
      await expect(
        page.getByRole("link", { name: "View Full Training", exact: true }),
      ).toHaveAttribute("href", guide.fullTraining);
      await expect(page.locator("iframe, embed, object")).toHaveCount(0);
      await expect(
        page.getByText("Full training awaiting original Academy PDF"),
      ).toHaveCount(0);
    }
  });
}
