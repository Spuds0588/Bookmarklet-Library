import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";

globalThis.__BL_TEST__ = {};
new Function(await readFile("bookmarklets/files/pdf-shrink.js", "utf8"))();
const lib = globalThis.__BL_TEST__.pdfShrink;

await mkdir("/tmp/pdfcheck", { recursive: true });
const run = (command, args) => {
  try {
    return execFileSync(command, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    return `ERR ${String(error.message).split("\n")[0]}`;
  }
};
const pages = (file) => (run("pdfinfo", [file]).match(/Pages:\s+(\d+)/) || [])[1] || "?";
const text = (file) => run("pdftotext", ["-layout", file, "-"]).replace(/\s+/g, " ").trim();

for (const file of process.argv.slice(2)) {
  try {
    const bytes = new Uint8Array(await readFile(file));
    const pdf = await lib.readPdf(bytes);
    const tree = lib.pageTree(pdf.objects, pdf.trailer.root.num);
    const full = lib.serializePdf(pdf.objects, pdf.trailer);
    const first = lib.serializePdf(lib.subsetFor({ ...pdf, pagesRef: tree.pagesRef }, [tree.pages[0]]).objects, pdf.trailer);
    await writeFile("/tmp/pdfcheck/orig.pdf", bytes);
    await writeFile("/tmp/pdfcheck/full.pdf", full);
    await writeFile("/tmp/pdfcheck/page1.pdf", first);

    const originalText = text("/tmp/pdfcheck/orig.pdf");
    const rebuiltText = text("/tmp/pdfcheck/full.pdf");
    console.log(JSON.stringify({
      file,
      tracedPages: tree.pages.length,
      pagesOriginal: pages("/tmp/pdfcheck/orig.pdf"),
      pagesRebuilt: pages("/tmp/pdfcheck/full.pdf"),
      pagesFirstPart: pages("/tmp/pdfcheck/page1.pdf"),
      textKeptPercent: originalText.length ? Math.round((rebuiltText.length / originalText.length) * 100) : null,
      rebuiltTextStarts: rebuiltText.slice(0, 70),
      partTextStarts: text("/tmp/pdfcheck/page1.pdf").slice(0, 70),
      size: `${bytes.length} -> ${full.length}`,
    }));
  } catch (error) {
    console.log(JSON.stringify({ file, error: String((error && error.message) || error) }));
  }
}
