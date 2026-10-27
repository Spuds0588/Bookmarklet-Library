import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = (name) => readFileSync(path.join(root, "scripts", "fixtures", "office", name));
const load = (slug) => {
  globalThis.__BL_TEST__ = {};
  const source = readFileSync(path.join(root, "bookmarklets", "files", `${slug}.js`), "utf8");
  new Function(source)();
  const BL = globalThis.__BL_TEST__.BL;
  delete globalThis.__BL_TEST__;
  return BL;
};
const file = (name, bytes, type = "") => new File([bytes], name, { type });
const unzip = async (BL, blob, name = "converted.docx") => BL.unzip(file(name, new Uint8Array(await blob.arrayBuffer())));
const documentXml = (zip) => zip.text("word/document.xml");

const WORD = fixture("report.docx");
const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

test("Word to HTML keeps headings, links, tables and an embedded image", async () => {
  const BL = load("word-to-html");
  const model = await BL.parseDocx(file("report.docx", WORD, DOCX_TYPE));
  const html = BL.docxToHtml(model);
  assert.match(html, /<!doctype html>/);
  assert.match(html, /<h1><strong>Weekly field report<\/strong><\/h1>/);
  assert.match(html, /<a href="https:\/\/example\.com\/field-guide">/);
  assert.match(html, /<table>/);
  assert.match(html, /<img src="data:image\/png;base64,/);
  assert.match(html, /Northwind/);
});

test("Word to TXT flattens paragraphs, lists and tables without images", async () => {
  const BL = load("word-to-txt");
  const model = await BL.parseDocx(file("report.docx", WORD, DOCX_TYPE));
  const text = BL.docxToText(model);
  assert.match(text, /^Weekly field report/m);
  assert.match(text, /• Retry the demo route early/);
  assert.match(text, /Site\tVisits\tOwner/);
  assert.doesNotMatch(text, /Picture 1/);
});

test("Word to RTF keeps formatting, hyperlinks, a table and a pict image", async () => {
  const BL = load("word-to-rtf");
  const model = await BL.parseDocx(file("report.docx", WORD, DOCX_TYPE));
  const rtf = BL.docxToRtf(model);
  assert.match(rtf, /^\{\\rtf1/);
  assert.match(rtf, /\{\\b Twelve visits\}/);
  assert.match(rtf, /HYPERLINK "https:\/\/example\.com\/field-guide"/);
  assert.match(rtf, /\\trowd/);
  assert.match(rtf, /\\pict/);
  assert.match(rtf, /\\pngblip/);
});

test("Word to PDF writes a readable PDF 1.4 page and reports skipped images", async () => {
  const BL = load("word-to-pdf");
  const model = await BL.parseDocx(file("report.docx", WORD, DOCX_TYPE));
  const result = await BL.docxToPdf(model);
  const bytes = new Uint8Array(await result.blob.arrayBuffer());
  const text = Buffer.from(bytes).toString("latin1");
  assert.equal(text.slice(0, 8), "%PDF-1.4");
  assert.match(text, /\/Type \/Page/);
  const stream = text.match(/stream\n([\s\S]*?)\nendstream/);
  assert.ok(stream, "PDF content stream is missing");
  const content = inflateSync(Buffer.from(stream[1], "latin1")).toString("latin1");
  assert.match(content, /\(Weekly\)/);
  assert.match(content, /\(report\)/);
  assert.match(content, /\/F2 24 Tf/);
  assert.equal(result.replaced, 0);
  assert.equal(result.skippedImages, 1);
});

test("Word to Markdown keeps GFM headings, lists, tables, links and a data URL image", async () => {
  const BL = load("word-to-markdown");
  const model = await BL.parseDocx(file("report.docx", WORD, DOCX_TYPE));
  const markdown = BL.docxToMarkdown(model);
  assert.match(markdown, /^# Weekly field report$/m);
  assert.match(markdown, /^## What changed$/m);
  assert.match(markdown, /^- Retry the demo route early;/m);
  assert.match(markdown, /^1\. Check the mobile layout/m);
  assert.match(markdown, /\[field guide\]\(https:\/\/example\.com\/field-guide\)/);
  assert.match(markdown, /^\| Site \| Visits \| Owner \|$/m);
  assert.match(markdown, /!\[Picture 1\]\(data:image\/png;base64,/);
  assert.doesNotMatch(markdown, /\\\./);
});

test("RTF to Word carries formatting, a link, a table and the image", async () => {
  const BL = load("rtf-to-word");
  const result = await BL.rtfToDocx(fixture("report.rtf").toString("utf8"));
  const zip = await unzip(BL, result.blob);
  const xml = documentXml(zip);
  assert.match(xml, /<w:jc w:val="center"\/>/);
  assert.match(xml, /<w:b\/>/);
  assert.match(xml, /<w:i\/>/);
  assert.match(xml, /<w:hyperlink r:id="rId3">/);
  assert.match(xml, /<w:tbl>/);
  assert.match(xml, /Night crew owns the handoff\./);
  assert.ok(zip.has("word/media/image1.png"));
  assert.match(zip.text("word/_rels/document.xml.rels"), /relationships\/hyperlink/);
  assert.match(zip.text("word/_rels/document.xml.rels"), /styles\.xml/);
});

test("TXT to Word preserves one paragraph per line and blank lines", async () => {
  const BL = load("txt-to-word");
  const result = await BL.txtToDocx(fixture("report.txt"), "report.txt");
  const zip = await unzip(BL, result.blob);
  const xml = documentXml(zip);
  assert.match(xml, /Weekly field report/);
  assert.match(xml, /Retry the demo route early\./);
  assert.match(xml, /Send the revised deck before Friday\./);
  assert.equal((xml.match(/<w:p>/g) || []).length, 5);
});

test("Markdown to Word produces styled headings, bold runs, a link, a table and an image", async () => {
  const BL = load("markdown-to-word");
  const result = await BL.markdownToDocx(fixture("report.md").toString("utf8"));
  const zip = await unzip(BL, result.blob);
  const xml = documentXml(zip);
  assert.match(xml, /<w:pStyle w:val="Title"\/>/);
  assert.match(xml, /<w:pStyle w:val="Heading2"\/>/);
  assert.match(xml, /<w:b\/>/);
  assert.match(xml, /<w:i\/>/);
  assert.match(xml, /<w:hyperlink r:id="rId3">/);
  assert.match(xml, /<w:tbl>/);
  assert.match(xml, /The demo route held up\. /);
  assert.ok(zip.has("word/media/image1.png"));
});

test("Word can travel through Markdown and back without losing its block structure", async () => {
  const word = load("word-to-markdown");
  const markdownTool = load("markdown-to-word");
  const model = await word.parseDocx(file("report.docx", WORD, DOCX_TYPE));
  const markdown = word.docxToMarkdown(model);
  const result = await markdownTool.markdownToDocx(markdown);
  const parsed = await word.parseDocx(file("roundtrip.docx", new Uint8Array(await result.blob.arrayBuffer()), DOCX_TYPE));
  assert.ok(parsed.blocks.some((block) => block.type === "heading" && block.level === 1));
  assert.ok(parsed.blocks.some((block) => block.type === "table"));
  assert.ok(parsed.blocks.some((block) => block.runs?.some((run) => run.image !== undefined)));
});

test("Excel to CSV exports each sheet, dates, quoting and a selected sheet", async () => {
  const BL = load("excel-to-csv");
  const workbook = file("report.xlsx", fixture("report.xlsx"));
  const all = await BL.xlsxToCsv(workbook, { format: "csv", sheets: "all" });
  assert.deepEqual(all.outputs.map((output) => output.name), ["report-Visits.csv", "report-Handoffs.csv"]);
  const visits = await all.outputs[0].blob.text();
  assert.match(visits, /^Date,Site,Visits,Notes,/);
  assert.match(visits, /2026-10-20,Northwind,12,Gate opens at 8,Total/);
  assert.match(visits, /Fabrikam,15/);
  const handoffs = await all.outputs[1].blob.text();
  assert.match(handoffs, /^Owner,Missed,Backlog/);
  const first = await BL.xlsxToCsv(workbook, { format: "tsv", sheets: "first" });
  assert.equal(first.outputs.length, 1);
  assert.match(await first.outputs[0].blob.text(), /\t/);
});

test("CSV to Excel writes real numbers and keeps leading-zero text as text", async () => {
  const BL = load("csv-to-excel");
  const result = await BL.csvToXlsx(file("report.csv", fixture("report.csv"), "text/csv"));
  const zip = await unzip(BL, result.output.blob, "report.xlsx");
  const xml = zip.text("xl/worksheets/sheet1.xml");
  assert.match(xml, /<c r="C2"><v>12<\/v><\/c>/);
  assert.match(xml, /<c r="A2" t="inlineStr"><is><t xml:space="preserve">0012<\/t><\/is><\/c>/);
  assert.match(xml, /Said &quot;hello&quot;/);
  assert.equal(result.rows, 3);
  assert.equal(result.columns, 4);
});

test("CSV to Excel detects tab and semicolon delimiters", async () => {
  const BL = load("csv-to-excel");
  const tab = await BL.parseCsv("a\tb\n1\t2\n", "auto");
  assert.deepEqual(tab.rows, [["a", "b"], ["1", "2"]]);
  const semicolon = await BL.parseCsv("a;b\n1;2\n", "auto");
  assert.equal(semicolon.delimiter, ";");
  const quoted = await BL.parseCsv('a,b\n"one, two","say ""hi"""\n', "auto");
  assert.deepEqual(quoted.rows[1], ["one, two", 'say "hi"']);
});

test("Word to TXT keeps text that shares a paragraph with an image", async () => {
  const BL = load("word-to-txt");
  const text = BL.docxToText({
    blocks: [
      { type: "paragraph", runs: [{ text: "Before " }, { image: 0 }, { text: " after" }] },
      { type: "paragraph", runs: [{ image: 1 }] },
    ],
  });
  assert.match(text, /Before  after/);
  assert.match(text, /\[image\]/);
});

test("Word to RTF writes numbered markers without a leading space", async () => {
  const BL = load("word-to-rtf");
  const model = await BL.parseDocx(file("report.docx", WORD, DOCX_TYPE));
  const rtf = BL.docxToRtf(model);
  assert.match(rtf, /\{\\pntext\\f0 1\.\\tab\}/);
  const parsed = await BL.parseRtf(rtf);
  const ordered = parsed.blocks.find((block) => block.type === "list" && block.ordered);
  assert.equal(ordered.marker, "1.");
  assert.equal(BL.runText(ordered.runs), "Check the mobile layout on the dispatch page.");
});

test("Word to PDF keeps text in a paragraph that also carries an image", async () => {
  const BL = load("word-to-pdf");
  const source = await BL.parseDocx(file("report.docx", WORD, DOCX_TYPE));
  const model = {
    blocks: [{ type: "paragraph", runs: [{ text: "Before image. " }, { image: 0 }, { text: " After image." }] }],
    images: source.images,
    section: source.section,
  };
  const result = await BL.pdfFromModel(model);
  const text = Buffer.from(new Uint8Array(await result.blob.arrayBuffer())).toString("latin1");
  const stream = text.match(/stream\n([\s\S]*?)\nendstream/);
  const content = inflateSync(Buffer.from(stream[1], "latin1")).toString("latin1");
  assert.match(content, /\(Before\)/);
  assert.match(content, /\(After\)/);
  assert.equal(result.skippedImages, 1);
});

test("HTML to Word gives separate ordered lists their own numbering", async () => {
  const BL = load("html-to-word");
  const blob = await BL.writeDocx({
    title: "Lists",
    blocks: [
      { type: "list", ordered: true, listId: "first", listLevel: 0, runs: [{ text: "One" }] },
      { type: "list", ordered: true, listId: "first", listLevel: 0, runs: [{ text: "Two" }] },
      { type: "paragraph", runs: [{ text: "Break" }] },
      { type: "list", ordered: true, listId: "second", listLevel: 0, runs: [{ text: "Three" }] },
    ],
    images: [],
    section: {},
    skippedImages: 0,
  });
  const zip = await unzip(BL, blob);
  const xml = documentXml(zip);
  const numbering = zip.text("word/numbering.xml");
  assert.deepEqual([...xml.matchAll(/w:numId w:val="(\d+)"/g)].map((match) => match[1]), ["2", "2", "3"]);
  assert.match(numbering, /w:num w:numId="2"/);
  assert.match(numbering, /w:num w:numId="3"/);
});

test("Word table images survive DOCX reading and Markdown output", async () => {
  const writer = load("html-to-word");
  const reader = load("word-to-markdown");
  const source = await reader.parseDocx(file("report.docx", WORD, DOCX_TYPE));
  const blob = await writer.writeDocx({
    title: "Table image",
    blocks: [{ type: "table", rows: [{ header: false, cells: [{ runs: [{ text: "Before " }, { image: 0 }, { text: " after" }], blocks: [], colspan: 1 }] }] }],
    images: source.images,
    section: source.section,
    skippedImages: 0,
  });
  const parsed = await reader.parseDocx(file("table.docx", new Uint8Array(await blob.arrayBuffer()), DOCX_TYPE));
  assert.ok(parsed.blocks[0].rows[0].cells[0].runs.some((run) => run.image !== undefined));
  assert.match(reader.docxToMarkdown(parsed), /!\[Picture 1\]\(data:image\/png;base64,/);
});

test("the OOXML ZIP writer keeps package paths instead of flattening them", async () => {
  const BL = load("word-to-html");
  const blob = await BL.makeZip([
    { name: "[Content_Types].xml", blob: new Blob(["types"]) },
    { name: "_rels/.rels", blob: new Blob(["rels"]) },
    { name: "word/document.xml", blob: new Blob(["document"]) },
  ]);
  const zip = await BL.unzip(file("package.docx", new Uint8Array(await blob.arrayBuffer())));
  assert.deepEqual([...zip.parts.keys()].sort(), ["[Content_Types].xml", "_rels/.rels", "word/document.xml"]);
  assert.equal(zip.text("_rels/.rels"), "rels");
});
