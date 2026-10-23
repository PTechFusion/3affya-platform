// Writes the synthetic extraction-spike documents in fixtures/documents/ from fixtures/source/ (task 1.9). Nothing here is a
// real document: every source is hand-written, every name is a placeholder, every page is footed as a synthetic test document.
//
//   node fixtures/generate.mjs
//
// Chromium (Playwright, already a dev dependency) prints the HTML sources to A4 PDFs, which shapes Arabic correctly. A
// multi-page source is also printed one page at a time, because extractPage reads one page per call (splitting an uploaded
// PDF is task 3.7's validate step, not the spike's). The low-resolution scan is the scan source rasterised, downscaled to about
// 70 dpi, blurred, rotated, noised with a seeded generator and saved as a low-quality JPEG. The DOCX is written from
// source/referral-letter.json as Office Open XML in a zip, with no library. PDFs carry Chromium's creation time, so a rerun
// changes their bytes but not their content.
import { chromium } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { crc32, deflateRawSync } from "node:zlib";

const here = new URL("./", import.meta.url);
const source = (name) => new URL(`source/${name}`, here);
const documents = (name) => new URL(`documents/${name}`, here);

// Playwright pins one Chromium build per version; when that build is missing, use any installed one (as scripts/screenshots.mjs
// does) rather than downloading. CHROME_PATH wins.
function installedChromium() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "ms-playwright"),
    join(homedir(), ".cache", "ms-playwright"),
    join(homedir(), "Library", "Caches", "ms-playwright"),
  ].filter(Boolean);
  const binaries = [
    ["chrome-win64", "chrome.exe"],
    ["chrome-win", "chrome.exe"],
    ["chrome-linux64", "chrome"],
    ["chrome-linux", "chrome"],
    ["chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"],
  ];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const dir of readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()) {
      for (const parts of binaries) {
        const bin = join(root, dir, ...parts);
        if (existsSync(bin)) return bin;
      }
    }
  }
  return undefined;
}

export async function launchChromium() {
  try {
    return await chromium.launch();
  } catch (error) {
    const executablePath = installedChromium();
    if (!executablePath) throw error;
    return chromium.launch({ executablePath });
  }
}

/** Pages in a PDF Chromium printed (one /Type /Page object per page). */
export function pdfPageCount(bytes) {
  return (Buffer.from(bytes).toString("latin1").match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
}

async function printHtml(browser, name, { split = false } = {}) {
  const page = await browser.newPage();
  await page.goto(source(`${name}.html`).href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const options = { format: "A4", printBackground: true, preferCSSPageSize: true };
  const whole = await page.pdf(options);
  await writeFile(documents(`${name}.pdf`), whole);
  const pages = pdfPageCount(whole);
  const written = [`${name}.pdf (${pages} page${pages === 1 ? "" : "s"})`];
  if (split && pages > 1) {
    for (let n = 1; n <= pages; n += 1) {
      const one = await page.pdf({ ...options, pageRanges: String(n) });
      if (pdfPageCount(one) !== 1) throw new Error(`${name} page ${n} did not print as one page`);
      await writeFile(documents(`${name}.p${n}.pdf`), one);
      written.push(`${name}.p${n}.pdf`);
    }
  }
  await page.close();
  return written;
}

async function lowResolutionScan(browser) {
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 1 });
  await page.goto(source("scan-lowres.html").href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ type: "png" });
  await page.setContent("<!doctype html><html><body></body></html>");
  const dataUrl = await page.evaluate(
    async ({ src, seed, width }) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const height = Math.round((img.height * width) / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#efeadf";
      ctx.fillRect(0, 0, width, height);
      ctx.filter = "blur(0.75px) contrast(0.8) brightness(1.03)";
      ctx.globalCompositeOperation = "multiply";
      ctx.translate(width / 2, height / 2);
      ctx.rotate((1.1 * Math.PI) / 180);
      ctx.translate(-width / 2, -height / 2);
      ctx.drawImage(img, 0, 0, width, height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.filter = "none";
      ctx.globalCompositeOperation = "source-over";
      // mulberry32: the same noise on every run.
      let s = seed;
      const random = () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      const image = ctx.getImageData(0, 0, width, height);
      const px = image.data;
      for (let i = 0; i < px.length; i += 4) {
        const grain = (random() - 0.5) * 70;
        const speck = random() < 0.0025 ? -120 : 0;
        for (let c = 0; c < 3; c += 1) px[i + c] = Math.max(0, Math.min(255, px[i + c] + grain + speck));
      }
      ctx.putImageData(image, 0, 0);
      return canvas.toDataURL("image/jpeg", 0.42);
    },
    { src: `data:image/png;base64,${png.toString("base64")}`, seed: 20261021, width: 580 },
  );
  await page.close();
  const jpeg = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
  await writeFile(documents("scan-lowres.jpg"), jpeg);
  return [`scan-lowres.jpg (${jpeg.length} bytes, 580 px wide)`];
}

/* ---------------- DOCX ---------------- */

const xmlText = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function run(text, { bold = false, rtl = false } = {}) {
  const props = `${bold ? "<w:b/>" : ""}${rtl ? "<w:rtl/>" : ""}`;
  return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ""}<w:t xml:space="preserve">${xmlText(text)}</w:t></w:r>`;
}

function paragraph(text, options = {}) {
  return `<w:p>${options.rtl ? "<w:pPr><w:bidi/></w:pPr>" : ""}${run(text, options)}</w:p>`;
}

function table(rows) {
  const width = 3000;
  const border = '<w:top w:val="single" w:sz="4" w:space="0" w:color="999999"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="999999"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="999999"/>';
  const grid = rows[0].map(() => `<w:gridCol w:w="${width}"/>`).join("");
  const body = rows
    .map(
      (cells, r) =>
        `<w:tr>${cells.map((cell) => `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/></w:tcPr>${paragraph(cell, { bold: r === 0 })}</w:tc>`).join("")}</w:tr>`,
    )
    .join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>${border}</w:tblBorders></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${body}</w:tbl>`;
}

function documentXml(content) {
  const body = content.body.map((block) => (block.table ? table(block.table) : paragraph(block.p, block))).join("");
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    `<w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body>` +
    "</w:document>"
  );
}

const CONTENT_TYPES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
  "</Types>";

const ROOT_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
  "</Relationships>";

/** A zip of deflated entries, with a fixed timestamp so the same content gives the same bytes. */
export function zip(entries) {
  const time = 0;
  const date = ((2026 - 1980) << 9) | (10 << 5) | 21;
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBytes = Buffer.from(name, "utf8");
    const raw = Buffer.from(data);
    const packed = deflateRawSync(raw);
    const crc = crc32(raw);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBytes, packed);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + packed.length;
  }
  const centralSize = centrals.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

async function referralDocx() {
  const content = JSON.parse(await readFile(source("referral-letter.json"), "utf8"));
  const docx = zip([
    { name: "[Content_Types].xml", data: CONTENT_TYPES },
    { name: "_rels/.rels", data: ROOT_RELS },
    { name: "word/document.xml", data: documentXml(content) },
  ]);
  await writeFile(documents("referral-letter.docx"), docx);
  return [`referral-letter.docx (${docx.length} bytes)`];
}

async function main() {
  await mkdir(documents(""), { recursive: true });
  const browser = await launchChromium();
  try {
    const written = [
      ...(await printHtml(browser, "lab-report-en")),
      ...(await printHtml(browser, "prescription-ar")),
      ...(await printHtml(browser, "discharge-note-mixed", { split: true })),
      ...(await lowResolutionScan(browser)),
      ...(await printHtml(browser, "injection-note")),
      ...(await referralDocx()),
    ];
    console.log(`fixtures/documents: ${written.join(", ")}`);
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
