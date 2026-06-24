import * as pdfjsLib from 'pdfjs-dist';

// Use CDN worker — avoids .mjs MIME type issues on Apache/cPanel servers in production.
// Version is read from the installed package to ensure exact compatibility.
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const MAX_PAGES = 3;
const TARGET_WIDTH = 1000; // px — keeps file size manageable
const PAGE_GAP = 8;        // px gap between stitched pages

/**
 * Converts an image or PDF File into a single JPEG Blob ready for the CF Worker.
 *
 * For PDFs: renders up to MAX_PAGES pages and stitches them vertically.
 * For images: returns the file directly as-is (no conversion needed).
 *
 * @param {File} file
 * @returns {Promise<{ blob: Blob, pageCount: number, pagesScanned: number }>}
 */
export async function fileToScanBlob(file) {
  // ── Image files: pass through directly ──────────────────────────
  if (file.type.startsWith('image/')) {
    return { blob: file, pageCount: 1, pagesScanned: 1 };
  }

  // ── PDF files: convert pages to stitched JPEG ───────────────────
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageCount = pdf.numPages;
  const pagesToProcess = Math.min(pageCount, MAX_PAGES);

  // Render each page to its own canvas
  const pageCanvases = [];
  for (let i = 1; i <= pagesToProcess; i++) {
    const page = await pdf.getPage(i);
    const baseViewport = page.getViewport({ scale: 1 });

    // Scale so the page is exactly TARGET_WIDTH wide
    const scale = TARGET_WIDTH / baseViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);

    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    pageCanvases.push(canvas);
  }

  // Stitch pages vertically into one tall canvas
  const totalHeight =
    pageCanvases.reduce((sum, c) => sum + c.height, 0) +
    PAGE_GAP * (pageCanvases.length - 1);

  const stitchCanvas = document.createElement('canvas');
  stitchCanvas.width = TARGET_WIDTH;
  stitchCanvas.height = totalHeight;

  const ctx = stitchCanvas.getContext('2d');
  // White background (avoids black areas on transparent canvases)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, TARGET_WIDTH, totalHeight);

  let y = 0;
  for (const canvas of pageCanvases) {
    ctx.drawImage(canvas, 0, y);
    y += canvas.height + PAGE_GAP;
  }

  // Export as JPEG (85% quality — good balance of clarity vs. file size)
  const blob = await new Promise((resolve) =>
    stitchCanvas.toBlob(resolve, 'image/jpeg', 0.85)
  );

  return { blob, pageCount, pagesScanned: pagesToProcess };
}
