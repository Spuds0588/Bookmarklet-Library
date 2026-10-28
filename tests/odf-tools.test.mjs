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
const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const bytesOf = async (blob) => new Uint8Array(await blob.arrayBuffer());
const unzip = async (BL, blob, name) => BL.unzip(file(name, await bytesOf(blob)));

const findBytes = (bytes, text, fromEnd = false) => {
  const needle = new TextEncoder().encode(text);
  for (let index = 0; index + needle.length <= bytes.length; index++) {
    const start = fromEnd ? bytes.length - needle.length - index : index;
    let match = true;
    for (let index = 0; index < needle.length; index++) {
      if (bytes[start + index] !== needle[index]) {
        match = false;
        break;
      }
    }
    if (match) return start;
  }
  return -1;
};

test("ODT reader keeps headings, inherited runs, links, lists and a table", async () => {
  const BL = load("odt-to-html");
  const model = await BL.parseOdt(file("report.odt", fixture("report.odt")));
  assert.equal(model.title, "Weekly field report");
  assert.equal(Math.round(model.section.width), 612);
  assert.equal(Math.round(model.section.left), 90);

  const [title, paragraph, second] = model.blocks;
  assert.equal(title.type, "heading");
  assert.equal(title.level, 1);
  assert.equal(title.runs[0].text, "Weekly field report");
  assert.equal(second.type, "heading");
  assert.equal(second.level, 2);

  // The run style inherits bold from its parent style, the link keeps its href.
  const strong = paragraph.runs.find((run) => run.text === "Twelve visits");
  assert.equal(strong.bold, true);
  assert.equal(strong.italic, true);
  const link = paragraph.runs.find((run) => run.link);
  assert.equal(link.link, "https://example.com/field-guide");
  assert.equal(link.text, "field guide");
  assert.match(paragraph.runs.map((run) => run.text || "").join(""), /held up\. Twelve visits and three handoffs were logged\./);

  const lists = model.blocks.filter((block) => block.type === "list");
  assert.deepEqual(lists.map((block) => `${block.ordered ? "ol" : "ul"}${block.marker}`), ["ul•", "ul•", "ol1.", "ol2."]);
  assert.equal(lists[0].listLevel, 0);

  const table = model.blocks.find((block) => block.type === "table");
  assert.equal(table.rows.length, 3);
  assert.equal(table.rows.filter((row) => row.header).length, 1);
  assert.equal(table.rows[0].cells[0].runs[0].text, "Site");
  assert.equal(table.rows[2].cells.length, 1);
  assert.equal(table.rows[2].cells[0].colspan, 2);

  assert.equal(model.images.length, 1);
  assert.equal(model.images[0].mime, "image/png");
  assert.equal(model.images[0].alt, "Route map");
  assert.equal(Math.round(model.images[0].width), 170);
  assert.equal(model.skippedImages, 0);

  const breakBlock = model.blocks.find((block) => block.pageBreak);
  assert.ok(breakBlock, "the page-break style became a pageBreak block");
  const text = model.blocks.map((block) => (block.runs || []).map((run) => run.text || "").join("")) .join("\n");
  assert.match(text, /Said "hello" and {2}spaced {2}words\./);
});

test("ODT to Word writes headings, numbering, a table, a link and media", async () => {
  const BL = load("odt-to-word");
  const model = await BL.parseOdt(file("report.odt", fixture("report.odt")));
  const blob = await BL.writeDocx(model);
  const zip = await unzip(BL, blob, "report.docx");
  const xml = zip.text("word/document.xml");
  assert.match(xml, /<w:pStyle w:val="Title"\/>/);
  assert.match(xml, /<w:pStyle w:val="Heading2"\/>/);
  assert.match(xml, /<w:numPr>/);
  assert.match(xml, /<w:tbl>/);
  assert.match(xml, /<w:hyperlink r:id="rId3">/);
  assert.match(xml, /<w:gridSpan w:val="2"\/>/);
  assert.ok(zip.has("word/media/image1.png"));
});

test("ODT to HTML, Markdown, RTF, TXT and PDF carry the same document", async () => {
  const html = load("odt-to-html");
  const model = await html.parseOdt(file("report.odt", fixture("report.odt")));
  const page = html.htmlFromModel(model);
  assert.match(page, /<h1><strong>Weekly field report<\/strong><\/h1>|<h1>Weekly field report<\/h1>/);
  assert.match(page, /<em><strong>Twelve visits<\/strong><\/em>/);
  assert.match(page, /<a href="https:\/\/example\.com\/field-guide">field guide<\/a>/);
  assert.match(page, /<table>/);
  assert.match(page, /<img src="data:image\/png;base64,/);

  const markdownTool = load("odt-to-markdown");
  const markdown = markdownTool.markdownFromModel(model);
  assert.match(markdown, /^# Weekly field report$/m);
  assert.match(markdown, /^## What changed$/m);
  assert.match(markdown, /\*\*\*Twelve visits\*\*\*/);
  assert.match(markdown, /^1\. Check the mobile layout/m);
  assert.match(markdown, /^\| Site \| Visits \|$/m);

  const rtfTool = load("odt-to-rtf");
  const rtf = rtfTool.rtfFromModel(model);
  assert.match(rtf, /^\{\\rtf1/);
  assert.match(rtf, /\\pict/);

  const txt = load("odt-to-txt").modelToText(model);
  assert.match(txt, /^Weekly field report/m);
  assert.match(txt, /• Retry the demo route early\./);
  assert.match(txt, /Site\tVisits/);

  const pdfTool = load("odt-to-pdf");
  const pdf = await pdfTool.pdfFromModel(model);
  const pdfBytes = Buffer.from(await bytesOf(pdf.blob)).toString("latin1");
  assert.equal(pdfBytes.slice(0, 8), "%PDF-1.4");
  const stream = pdfBytes.match(/stream\n([\s\S]*?)\nendstream/);
  const content = inflateSync(Buffer.from(stream[1], "latin1")).toString("latin1");
  assert.match(content, /\(Weekly\)/);
  assert.match(content, /\(field\)/);
});

test("ODS reader turns typed cells into values, dates and booleans", async () => {
  const BL = load("ods-to-csv");
  const sheets = await BL.parseOds(file("report.ods", fixture("report.ods")));
  assert.deepEqual(sheets.map((sheet) => sheet.name), ["Visits", "Handoffs"]);
  // 500-cell and 1000-row padding runs come back as trimmed rows, not a padded grid.
  assert.deepEqual(sheets[0].rows, [
    ["Date", "Site", "Visits", "Note"],
    ["2026-10-20", "Northwind", 12, "Gate opens at 8, bring the deck"],
    ["2026-10-21 09:15:00", "Contoso", 9, 'Said "hello"'],
    ["Total", 7, 7, 7],
  ]);
  assert.deepEqual(sheets[1].rows[2], ["Day crew", "TRUE", 3.5]);

  const csv = await BL.odsToCsv(file("report.ods", fixture("report.ods")), { format: "csv", sheets: "all" });
  assert.deepEqual(csv.outputs.map((output) => output.name), ["report-Visits.csv", "report-Handoffs.csv"]);
  const visits = await csv.outputs[0].blob.text();
  assert.match(visits, /^Date,Site,Visits,Note\r$/m);
  assert.match(visits, /"Gate opens at 8, bring the deck"/);
  assert.match(visits, /"Said ""hello"""/);
  const tsv = await BL.odsToCsv(file("report.ods", fixture("report.ods")), { format: "tsv", sheets: "first" });
  assert.equal(tsv.outputs.length, 1);
  assert.match(await tsv.outputs[0].blob.text(), /Northwind\t12/);
});

test("ODS to Excel writes numbers as numbers and keeps the sheet names", async () => {
  const BL = load("ods-to-excel");
  const result = await BL.odsToXlsx(file("report.ods", fixture("report.ods")), { sheets: "all" });
  assert.equal(result.output.name, "report.xlsx");
  assert.equal(result.exported, 2);
  const zip = await unzip(BL, result.output.blob, "report.xlsx");
  const sheet = zip.text("xl/worksheets/sheet1.xml");
  assert.match(sheet, /<c r="C2"><v>12<\/v><\/c>/);
  assert.match(sheet, /<c r="A2" t="inlineStr"><is><t xml:space="preserve">2026-10-20<\/t><\/is><\/c>/);
  assert.match(zip.text("xl/workbook.xml"), /sheet name="Visits"/);
});

test("CSV to ODS keeps numbers and quoting, and Excel to ODS keeps the sheets", async () => {
  const BL = load("csv-to-ods");
  const result = await BL.csvToOds(file("report.csv", fixture("report.csv"), "text/csv"));
  assert.equal(result.output.name, "report.ods");
  assert.equal(result.rows, 3);
  const reader = load("ods-to-csv");
  const sheets = await reader.parseOds(file("report.ods", await bytesOf(result.output.blob)));
  assert.deepEqual(sheets[0].rows, [
    ["id", "site", "visits", "note"],
    ["0012", "Northwind", 12, "Gate opens at 8, bring the deck"],
    ["0013", "Contoso", 9, 'Said "hello"'],
  ]);

  const sheetsFromXlsx = await load("excel-to-ods").xlsxToOds(file("report.xlsx", fixture("report.xlsx")), { sheets: "all" });
  assert.equal(sheetsFromXlsx.exported, 2);
  const workbook = await reader.parseOds(file("report.ods", await bytesOf(sheetsFromXlsx.output.blob)));
  assert.deepEqual(workbook.map((sheet) => sheet.name), ["Visits", "Handoffs"]);
  assert.equal(workbook[0].rows[1][2], 12);
});

test("the ODT writer writes an OpenDocument package the reader can open again", async () => {
  const writer = load("txt-to-odt");
  const BL = load("odt-to-html");
  const model = writer.textToModel(new TextEncoder().encode("First line\n\nSecond line"), "notes.txt");
  const bytes = await bytesOf(await writer.writeOdt(model));

  // mimetype is the first entry and stored, as OpenDocument requires.
  assert.equal(bytes[0] | (bytes[1] << 8), 0x4b50);
  assert.equal(bytes[8] | (bytes[9] << 8), 0);
  const archive = await BL.unzip(file("notes.odt", bytes));
  assert.equal([...archive.parts.keys()][0], "mimetype");
  assert.equal(archive.text("mimetype").trim(), "application/vnd.oasis.opendocument.text");
  const manifest = archive.text("META-INF/manifest.xml");
  for (const name of ["content.xml", "styles.xml", "meta.xml"]) assert.match(manifest, new RegExp(`full-path="${name}"`));
  assert.match(archive.text("content.xml"), /office:version="1.3"/);

  const parsed = await BL.parseOdt(file("notes.odt", bytes));
  assert.equal(parsed.title, "notes");
  assert.deepEqual(parsed.blocks.map((block) => (block.runs || []).map((run) => run.text).join("")), ["First line", "", "Second line"]);
});

test("the ODS writer writes an OpenDocument package the reader can open again", async () => {
  const writer = load("csv-to-ods");
  const BL = load("ods-to-csv");
  const blob = await writer.writeOds([
    { name: "Visits", rows: [["Site", "Visits"], ["Northwind", 12], ["Contoso", 9]] },
    { name: "Notes", rows: [["Sent", "TRUE"]] },
  ]);
  const bytes = await bytesOf(blob);
  assert.equal(bytes[8] | (bytes[9] << 8), 0);
  const archive = await BL.unzip(file("book.ods", bytes));
  assert.equal([...archive.parts.keys()][0], "mimetype");
  assert.match(archive.text("META-INF/manifest.xml"), /full-path="styles.xml"/);
  assert.match(archive.text("content.xml"), /table:name="Visits"/);

  const sheets = await BL.parseOds(file("book.ods", bytes));
  assert.deepEqual(sheets, [
    { name: "Visits", rows: [["Site", "Visits"], ["Northwind", 12], ["Contoso", 9]] },
    { name: "Notes", rows: [["Sent", "TRUE"]] },
  ]);
});

test("the ODT writer groups flat lists, writes covered cells and embeds images", async () => {
  const writer = load("word-to-odt");
  const BL = load("odt-to-html");
  const model = {
    title: "Blocks",
    section: { width: 612, height: 792, top: 72, right: 72, bottom: 72, left: 72 },
    images: [{ bytes: fixture("field.png"), mime: "image/png", width: 320, height: 180, alt: "Field" }],
    blocks: [
      { type: "heading", level: 3, runs: [{ text: "Third level" }], align: "" },
      { type: "list", ordered: true, listId: "a", listLevel: 0, runs: [{ text: "One" }] },
      { type: "list", ordered: true, listId: "a", listLevel: 0, runs: [{ text: "Two" }] },
      { type: "list", ordered: false, listId: "b", listLevel: 1, runs: [{ text: "Nested bullet" }] },
      { type: "table", rows: [
        { header: true, cells: [{ runs: [{ text: "Site" }], blocks: [], colspan: 2, rowspan: 1 }] },
        { header: false, cells: [{ runs: [{ text: "Northwind" }], blocks: [], colspan: 1, rowspan: 1 }, { runs: [{ text: "12" }], blocks: [], colspan: 1, rowspan: 1 }] },
      ] },
      { type: "paragraph", runs: [{ text: "Picture: " }, { image: 0 }], align: "" },
    ],
    skippedImages: 0,
  };
  const blob = await writer.writeOdt(model);
  const zip = await unzip(BL, blob, "blocks.odt");
  const content = zip.text("content.xml");
  assert.match(content, /<text:h text:style-name="P\d+" text:outline-level="3">/);
  assert.match(content, /<text:list text:style-name="LNumber">/);
  assert.match(content, /<text:list text:style-name="LBullet">/);
  assert.equal((content.match(/<text:list text:style-name="LNumber">/g) || []).length, 1);
  assert.equal((content.match(/<text:list-item>/g) || []).length, 3);
  assert.match(content, /table:number-columns-spanned="2"/);
  assert.equal((content.match(/<table:covered-table-cell\/>/g) || []).length, 1);
  assert.match(content, /<table:table-header-rows>/);
  assert.match(content, /xlink:href="Pictures\/image1.png"/);
  assert.ok(zip.has("Pictures/image1.png"));
  assert.match(zip.text("META-INF/manifest.xml"), /full-path="Pictures\/image1.png"/);

  const parsed = await BL.parseOdt(file("blocks.odt", await bytesOf(blob)));
  assert.equal(parsed.blocks[0].type, "heading");
  assert.equal(parsed.blocks[0].level, 3);
  assert.deepEqual(parsed.blocks.filter((block) => block.type === "list").map((block) => `${block.ordered}${block.listLevel}`), ["true0", "true0", "false1"]);
  assert.equal(parsed.blocks.find((block) => block.type === "table").rows.length, 2);
  assert.deepEqual(parsed.images.map((image) => image.mime), ["image/png"]);
  assert.equal(parsed.images[0].bytes.length, fixture("field.png").length);
});

test("wrong file types are refused with the format they should use", async () => {
  const docs = load("odt-to-html");
  const sheets = load("ods-to-csv");
  await assert.rejects(() => docs.parseOdt(file("report.ods", fixture("report.ods"))), /not a text document\. Use \.odt for documents and \.ods for spreadsheets/);
  await assert.rejects(() => sheets.parseOds(file("report.odt", fixture("report.odt"))), /not a spreadsheet\. Use \.ods for spreadsheets and \.odt for documents/);
  await assert.rejects(() => docs.parseOdt(file("report.txt", fixture("report.txt"))), /not a ZIP archive, or it is password-protected/);
  await assert.rejects(() => sheets.parseOds(file("report.rtf", fixture("report.rtf"))), /not a ZIP archive, or it is password-protected/);
});

test("damaged, encrypted and ZIP64 packages are refused by name", async () => {
  const BL = load("odt-to-html");
  const source = Uint8Array.from(fixture("report.odt"));

  // The last copy of the name is the one in the Central Directory.
  const encrypted = Uint8Array.from(source);
  const nameAt = findBytes(encrypted, "content.xml", true);
  assert.ok(nameAt > 46);
  encrypted[nameAt - 46 + 8] = 1;
  await assert.rejects(() => BL.parseOdt(file("locked.odt", encrypted)), /Encrypted Office files are not supported/);

  const zip64 = Uint8Array.from(source);
  const eocd = findBytes(zip64, "\x50\x4b\x05\x06");
  assert.ok(eocd > 0);
  zip64[eocd + 10] = 0xff;
  zip64[eocd + 11] = 0xff;
  await assert.rejects(() => BL.parseOdt(file("big.odt", zip64)), /ZIP64 Office files are not supported/);

  await assert.rejects(() => BL.parseOdt(file("cut.odt", source.subarray(0, source.length - 40))), /ZIP|outside the file|truncated/);
});

test("documents written by LibreOffice and OpenOffice parse as they are", async () => {
  const BL = load("odt-to-html");
  const styled = await BL.parseOdt(file("character-styles.odt", fixture("character-styles.odt")));
  assert.equal(styled.blocks.length, 26);
  assert.equal(styled.blocks.filter((block) => block.type === "heading").length, 12);
  assert.equal(styled.blocks.find((block) => block.type === "paragraph").runs[0].text, "Character Attributes");

  // A 56 KB manual from OpenOffice.org: headings, lists, 21 tables and a picture.
  const manual = await BL.parseOdt(file("compdocfileformat.odt", fixture("compdocfileformat.odt")));
  assert.equal(manual.title, "The Microsoft Compound Document File Format");
  assert.equal(manual.blocks.filter((block) => block.type === "table").length, 21);
  assert.equal(manual.blocks.filter((block) => block.type === "list").length, 40);
  assert.equal(manual.images.length, 1);

  const sheets = await load("ods-to-csv").parseOds(file("default_namespace.ods", fixture("default_namespace.ods")));
  assert.equal(sheets.length, 19);
  assert.equal(sheets[0].name, "ACC∕NCDR CathPCI v5.0");
  assert.equal(typeof sheets[0].rows[1][0], "number");
  assert.equal(sheets[0].rows[0][0], "Participant ID [1000: PartID]");
});

test("ODS keeps a numeric zero instead of treating it as an empty cell", async () => {
  const writer = load("csv-to-ods");
  const reader = load("ods-to-csv");
  const made = await writer.csvToOds(file("zeros.csv", new TextEncoder().encode("a,b\n0,0\n")), {});
  const sheets = await reader.parseOds(file("zeros.ods", await bytesOf(made.output.blob)));
  assert.deepEqual(sheets[0].rows, [["a", "b"], [0, 0]]);
  const csv = await reader.odsToCsv(file("zeros.ods", await bytesOf(made.output.blob)), {});
  assert.equal(await csv.outputs[0].blob.text(), "a,b\r\n0,0\r\n");
});

test("ODS blank repeat counters keep leading columns aligned", async () => {
  const BL = load("ods-to-csv");
  const content = `<?xml version="1.0"?><office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"><office:body><office:spreadsheet><table:table table:name="S"><table:table-row><table:table-cell table:number-columns-repeated="3"/><table:table-cell office:value-type="string"><text:p>Hit</text:p></table:table-cell></table:table-row></table:table></office:spreadsheet></office:body></office:document-content>`;
  const blob = await BL.makeZip([{ name: "content.xml", blob: new Blob([content]) }]);
  const sheets = await BL.parseOds(file("repeats.ods", new Uint8Array(await blob.arrayBuffer())));
  assert.deepEqual(sheets[0].rows, [["", "", "", "Hit"]]);
});

test("ODS rejects a repeated row run that is larger than the converter handles", async () => {
  const BL = load("ods-to-csv");
  const content = `<?xml version="1.0"?><office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"><office:body><office:spreadsheet><table:table table:name="S"><table:table-row table:number-rows-repeated="200000"><table:table-cell office:value-type="string"><text:p>row</text:p></table:table-cell></table:table-row></table:table></office:spreadsheet></office:body></office:document-content>`;
  const blob = await BL.makeZip([{ name: "content.xml", blob: new Blob([content]) }]);
  await assert.rejects(BL.parseOds(file("huge.ods", new Uint8Array(await blob.arrayBuffer()))), /more rows/);
});
