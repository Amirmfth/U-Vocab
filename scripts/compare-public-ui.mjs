import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const outputDir = path.resolve("visual-parity");
fs.mkdirSync(outputDir, { recursive: true });

const pages = ["/login", "/signup", "/forgot-password"];
const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
];
const threshold = 0.01;

async function capture(browser, baseUrl, route, viewport, outputPath) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: "reduce",
    deviceScaleFactor: 1,
    locale: "en-US",
    colorScheme: "dark",
  });
  const page = await context.newPage();
  try {
    await page.goto(baseUrl + route, { waitUntil: "networkidle", timeout: 90000 });
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({
      content: "nextjs-portal { display: none !important; } * { caret-color: transparent !important; }",
    });
    await page.screenshot({ path: outputPath, fullPage: true, animations: "disabled" });
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
let failures = 0;
try {
  for (const route of pages) {
    for (const viewport of viewports) {
      const id = route.replaceAll("/", "-").replace(/^-/, "") + "-" + viewport.name;
      const beforePath = path.join(outputDir, id + "-before.png");
      const afterPath = path.join(outputDir, id + "-after.png");
      await capture(browser, "http://127.0.0.1:3101", route, viewport, beforePath);
      await capture(browser, "http://127.0.0.1:3102", route, viewport, afterPath);
      const before = PNG.sync.read(fs.readFileSync(beforePath));
      const after = PNG.sync.read(fs.readFileSync(afterPath));
      if (before.width !== after.width || before.height !== after.height) {
        console.error(id, "dimensions changed", before.width, before.height, after.width, after.height);
        failures += 1;
        continue;
      }
      const diff = new PNG({ width: before.width, height: before.height });
      const mismatched = pixelmatch(before.data, after.data, diff.data, before.width, before.height, {
        threshold: 0.1,
        includeAA: false,
      });
      fs.writeFileSync(path.join(outputDir, id + "-diff.png"), PNG.sync.write(diff));
      const fraction = mismatched / (before.width * before.height);
      console.log(id, "different pixels", mismatched, "ratio", fraction.toFixed(5));
      if (fraction > threshold) failures += 1;
    }
  }
} finally {
  await browser.close();
}
if (failures) {
  console.error(failures + " screenshot comparisons exceeded the visual parity tolerance.");
  process.exitCode = 1;
}
