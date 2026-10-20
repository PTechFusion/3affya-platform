// Practice ID card image, made in the browser from the one DoctorCard (screen 31, task 2.7 prototype). No new dependency: the
// rendered card face is cloned with its computed styles inlined, wrapped in an SVG <foreignObject> with the page fonts embedded,
// drawn to a canvas at print scale and saved as a PNG; the PDF is a two-page file around JPEGs of the same canvases.
// Production serves the same card from GET /api/cards/[id].png (task 2.7); this file is the prototype stand-in for it.

/** Pixels per CSS pixel in the saved image: a 448 px wide card becomes 1344 px, about 114 mm wide at 300 dpi. */
export const CARD_IMAGE_SCALE = 3;
const FETCH_TIMEOUT_MS = 10_000;

const dataUrls = new Map<string, Promise<string>>();

/** A same-origin asset as a data: URL, so the SVG image (which cannot load anything itself) carries it. Cached per URL. */
function toDataUrl(url: string): Promise<string> {
  let pending = dataUrls.get(url);
  if (!pending) {
    pending = fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
      .then((res) => {
        if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
        return res.blob();
      })
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          }),
      );
    pending.catch(() => dataUrls.delete(url)); // a failed fetch is retried next time
    dataUrls.set(url, pending);
  }
  return pending;
}

/** Every @font-face rule on the page with its files inlined (Readex Pro), so the image uses the real weights (rule R6). */
async function embeddedFontCss(): Promise<string> {
  const rules: Array<Promise<string>> = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let cssRules: CSSRuleList;
    try {
      cssRules = sheet.cssRules;
    } catch {
      continue; // a cross-origin sheet cannot be read; the app has none
    }
    for (const rule of Array.from(cssRules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const base = sheet.href ?? location.href;
      const urls = Array.from(rule.style.getPropertyValue("src").matchAll(/url\((["']?)([^"')]+)\1\)/g), (m) => m[2] ?? "").filter(Boolean);
      rules.push(
        Promise.all(urls.map(async (u) => [u, await toDataUrl(new URL(u, base).href)] as const)).then((pairs) =>
          pairs.reduce((css, [u, inlined]) => css.split(u).join(inlined), rule.cssText),
        ),
      );
    }
  }
  return (await Promise.all(rules)).join("\n");
}

/** Deep clone with every computed property written inline, so the copy renders the same with no stylesheet. */
function cloneWithStyles(source: Element): Element {
  const copy = source.cloneNode(false) as Element;
  copy.removeAttribute("class");
  const computed = getComputedStyle(source);
  const style = (copy as HTMLElement | SVGElement).style;
  for (let i = 0; i < computed.length; i++) {
    const name = computed.item(i);
    if (name.startsWith("--")) continue; // custom properties are already resolved into the real ones
    style.setProperty(name, computed.getPropertyValue(name), computed.getPropertyPriority(name));
  }
  for (const child of Array.from(source.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE) copy.appendChild(cloneWithStyles(child as Element));
    else if (child.nodeType === Node.TEXT_NODE) copy.appendChild(child.cloneNode());
  }
  return copy;
}

/** Draws one rendered card face to a canvas at `scale` times its CSS size. */
export async function faceToCanvas(face: HTMLElement, scale = CARD_IMAGE_SCALE): Promise<HTMLCanvasElement> {
  const images = Array.from(face.querySelectorAll("img"));
  await Promise.all(images.map((img) => img.decode().catch(() => undefined)));
  const width = face.offsetWidth;
  const height = face.offsetHeight;

  const copy = cloneWithStyles(face) as HTMLElement;
  // The face alone, flat: no shadow outside its rounded corners (the PNG keeps them transparent), no outer margin.
  copy.style.setProperty("box-shadow", "none");
  copy.style.setProperty("margin", "0");
  copy.style.setProperty("width", `${width}px`);
  copy.style.setProperty("height", `${height}px`);
  const copiedImages = Array.from(copy.querySelectorAll("img"));
  await Promise.all(
    copiedImages.map(async (img, i) => {
      const src = images[i]?.currentSrc || images[i]?.src;
      img.removeAttribute("srcset");
      img.removeAttribute("loading");
      if (src) img.setAttribute("src", await toDataUrl(src));
    }),
  );

  const wrapper = document.createElement("div");
  wrapper.setAttribute("lang", face.closest("[lang]")?.getAttribute("lang") ?? document.documentElement.lang);
  wrapper.setAttribute("dir", getComputedStyle(face).direction);
  const fonts = document.createElement("style");
  fonts.textContent = await embeddedFontCss();
  wrapper.append(fonts, copy);
  const xhtml = new XMLSerializer().serializeToString(wrapper);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${height * scale}" viewBox="0 0 ${width} ${height}">` +
    `<foreignObject x="0" y="0" width="${width}" height="${height}">${xhtml}</foreignObject></svg>`;

  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();
  // Fonts inside an SVG image can finish decoding a frame after the image itself; one frame keeps the first draw honest.
  await new Promise((resolve) => requestAnimationFrame(resolve));

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error(`toBlob ${type}`))), type, quality),
  );
}

export const canvasToPng = (canvas: HTMLCanvasElement) => canvasBlob(canvas, "image/png");

/**
 * A PDF with one page per canvas, each page the card at its CSS size (1 CSS px = 0.75 pt) plus a margin, the image a JPEG on
 * white paper. Hand-written PDF 1.4: catalog, page tree, then page, image and content stream objects per card.
 */
export async function canvasesToPdf(canvases: HTMLCanvasElement[], scale = CARD_IMAGE_SCALE): Promise<Blob> {
  const MARGIN_PT = 18;
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const write = (part: string | Uint8Array) => {
    const bytes = typeof part === "string" ? enc.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };
  const object = (id: number, ...parts: Array<string | Uint8Array>) => {
    offsets[id] = length;
    write(`${id} 0 obj\n`);
    parts.forEach(write);
    write("\nendobj\n");
  };

  const pages = await Promise.all(
    canvases.map(async (canvas) => {
      const paper = document.createElement("canvas");
      paper.width = canvas.width;
      paper.height = canvas.height;
      const ctx = paper.getContext("2d");
      if (!ctx) throw new Error("no 2d context");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, paper.width, paper.height);
      ctx.drawImage(canvas, 0, 0);
      const jpeg = new Uint8Array(await (await canvasBlob(paper, "image/jpeg", 0.92)).arrayBuffer());
      const round = (v: number) => Math.round(((v / scale) * 0.75) * 100) / 100; // CSS px to points
      return { jpeg, width: canvas.width, height: canvas.height, wPt: round(canvas.width), hPt: round(canvas.height) };
    }),
  );

  write("%PDF-1.4\n");
  write(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])); // binary marker comment
  const pageId = (i: number) => 3 + i * 3; // each card: page, image, content stream
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, `<< /Type /Pages /Kids [${pages.map((_, i) => `${pageId(i)} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  pages.forEach((page, i) => {
    const id = pageId(i);
    const draw = `q ${page.wPt} 0 0 ${page.hPt} ${MARGIN_PT} ${MARGIN_PT} cm /Card Do Q`;
    object(
      id,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.wPt + MARGIN_PT * 2} ${page.hPt + MARGIN_PT * 2}] ` +
        `/Resources << /XObject << /Card ${id + 1} 0 R >> >> /Contents ${id + 2} 0 R >>`,
    );
    object(
      id + 1,
      `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 ` +
        `/Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`,
      page.jpeg,
      "\nendstream",
    );
    object(id + 2, `<< /Length ${enc.encode(draw).length} >>\nstream\n${draw}\nendstream`);
  });

  const count = 3 + pages.length * 3;
  const xref = length;
  write(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let id = 1; id < count; id++) write(`${String(offsets[id] ?? 0).padStart(10, "0")} 00000 n \n`);
  write(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks as BlobPart[], { type: "application/pdf" });
}

/** Hands a file to the browser's download. */
export function saveFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
