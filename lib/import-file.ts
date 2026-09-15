import { version as pdfjsVersion } from "pdfjs-dist/package.json";

const pdfjsBase = `/vendor/pdfjs/${pdfjsVersion}`;
let readerRetry = 0;
const readerUnavailable = () =>
  Error(
    "The PDF reader could not load. Your current notes have been kept. Reconnect and try the file again, or paste its text instead.",
  );

/** Parse in the browser. The original PDF bytes are never uploaded or retained. */
export async function readDocumentFile(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024)
    throw Error("Choose a file smaller than 5 MB.");
  if (/\.txt$/i.test(file.name) || file.type === "text/plain") {
    const text = await file.text();
    if (text.length > 40000)
      throw Error("Keep the text under 40,000 characters.");
    if (text.includes("\u0000"))
      throw Error("This file does not look like plain text.");
    return text;
  }
  if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf")
    throw Error("Choose a text-based PDF or a plain .txt file.");
  // These package-version URLs survive app-bundle deployments. A failed fetch
  // gets a new query on retry because browsers can cache failed module imports.
  const retryQuery = readerRetry ? `?retry=${readerRetry}` : "";
  const moduleUrl = `${pdfjsBase}/pdf.min.mjs${retryQuery}`;
  let pdfjs: typeof import("pdfjs-dist");
  try {
    pdfjs = await import(/* @vite-ignore */ moduleUrl);
    if (pdfjs.version !== pdfjsVersion) throw readerUnavailable();
  } catch {
    readerRetry++;
    throw readerUnavailable();
  }
  pdfjs.GlobalWorkerOptions.workerSrc = `${pdfjsBase}/pdf.worker.min.mjs${retryQuery}`;
  const loading = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    isEvalSupported: false,
    useSystemFonts: true,
  });
  try {
    const document = await loading.promise;
    if (document.numPages > 20)
      throw Error("Use a PDF with 20 pages or fewer.");
    let text = "";
    for (let n = 1; n <= document.numPages; n++) {
      const page = await document.getPage(n),
        content = await page.getTextContent();
      text += `\n[Page ${n}]\n`;
      for (const item of content.items)
        if ("str" in item) text += item.str + (item.hasEOL ? "\n" : " ");
      text += "\n";
      if (text.length > 40000)
        throw Error(
          "The extracted text is too long. Use a shorter discharge document.",
        );
    }
    if (text.replace(/\[Page \d+\]/g, "").trim().length < 20)
      throw Error(
        "This PDF has no readable text. Scanned images need OCR first; paste the text instead.",
      );
    return text.trim();
  } catch (error) {
    if (error instanceof Error && error.name === "PasswordException")
      throw Error(
        "This PDF is password-protected. Use an unlocked copy or paste its text.",
      );
    if (
      error instanceof Error &&
      /(?:worker|dynamically imported module|module script|failed to fetch|network)/i.test(
        error.message,
      )
    ) {
      readerRetry++;
      throw readerUnavailable();
    }
    throw error;
  } finally {
    // Cleanup must not replace a useful reader/password/validation error.
    await loading.destroy().catch(() => {});
  }
}
