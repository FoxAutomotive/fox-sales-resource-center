import { cp, mkdir, rm } from "node:fs/promises";
import { validateFiles } from "./validate.mjs";
await validateFiles();
const destination = new URL("../dist/", import.meta.url);
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
for (const path of [
  "index.html",
  "styles.css",
  "app.js",
  "lib.js",
  "presentation.js",
  "dialog.js",
  "specials.js",
  "data",
  "assets",
])
  await cp(new URL(`../${path}`, import.meta.url), new URL(path, destination), {
    recursive: true,
  });
console.log("Static site built in dist/ (all paths are relative).");
