import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
// Use full Chromium for PDF navigation, without depending on its private viewer UI.
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
    const downloaded = [];
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
      const response = await page.request.get(url);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("application/pdf");
      const bytes = await response.body();
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        file.sha256,
      );
      // Exercise standard browser downloads, not version-specific PDF toolbar internals.
      const downloadEvent = page.waitForEvent("download");
      const filename = file.path.split("/").at(-1);
      await page.evaluate(
        ({ url, filename }) => {
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = filename;
          anchor.hidden = true;
          document.body.append(anchor);
          anchor.click();
          anchor.remove();
        },
        { url, filename },
      );
      const download = await downloadEvent;
      const destination = testInfo.outputPath(
        `module-${file.moduleNumber}.pdf`,
      );
      expect(download.suggestedFilename()).toBe(filename);
      await download.saveAs(destination);
      downloaded.push({ destination, file });
      expect(
        createHash("sha256")
          .update(await readFile(destination))
          .digest("hex"),
      ).toBe(file.sha256);
      await tab.close();
    }
    // Validate the downloaded PDFs themselves: every page must render, and printing
    // must be permitted. These checks do not depend on browser-owned toolbar markup.
    const { execFileSync } = await import("node:child_process");
    const documents = JSON.parse(
      execFileSync(
        "python",
        [
          "-c",
          `
import fitz,json,sys
results=[]
for item in json.load(sys.stdin):
    doc=fitz.open(item["destination"])
    rendered=0
    for page in doc:
        pix=page.get_pixmap(matrix=fitz.Matrix(0.5,0.5))
        assert pix.width > 0 and pix.height > 0
        rendered+=1
    results.append({"pages":len(doc),"rendered":rendered,"encrypted":doc.is_encrypted,"printable":bool(doc.permissions & fitz.PDF_PERM_PRINT),"highQualityPrint":bool(doc.permissions & fitz.PDF_PERM_PRINT_HQ),"firstPage":doc[0].get_text()})
print(json.dumps(results))
`,
        ],
        { input: JSON.stringify(downloaded), encoding: "utf8" },
      ),
    );
    expect(documents).toHaveLength(10);
    for (const [index, document] of documents.entries()) {
      const file = downloaded[index].file;
      expect(document.pages).toBe(file.pages);
      expect(document.rendered).toBe(file.pages);
      expect(document.encrypted).toBe(false);
      expect(document.printable).toBe(true);
      expect(document.highQualityPrint).toBe(true);
      expect(document.firstPage.replace(/\s+/g, " ").toLowerCase()).toContain(
        file.title.toLowerCase(),
      );
      expect(document.firstPage).toMatch(
        new RegExp(`module\\s+${file.moduleNumber}\\b`, "i"),
      );
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
