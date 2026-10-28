#!/usr/bin/env node
/**
 * Builds the OpenDocument fixtures with plain XML and Node's own zlib.
 *
 * The fixtures must never be produced by the code the tests exercise, so this
 * script writes the packages itself: mimetype first and stored, everything else
 * deflated, the way an office suite writes them.
 *
 *   node scripts/fixtures/make-odf.mjs
 */
import { deflateRawSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, "office");

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let value = n;
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[n] = value >>> 0;
  }
  return table;
})();

const crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

/** A ZIP package: the first entry is written stored, the rest deflated. */
function buildPackage(entries) {
  const chunks = [];
  const central = [];
  let offset = 0;
  entries.forEach((entry, index) => {
    const name = Buffer.from(entry.name, "utf8");
    const raw = Buffer.from(entry.data);
    const deflated = index === 0 ? raw : deflateRawSync(raw, { level: 9 });
    const method = index === 0 ? 0 : 8;
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(crc32(raw), 14);
    local.writeUInt32LE(deflated.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    chunks.push(local, deflated);
    const header = Buffer.alloc(46 + name.length);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(0x0800, 8);
    header.writeUInt16LE(method, 10);
    header.writeUInt32LE(crc32(raw), 16);
    header.writeUInt32LE(deflated.length, 20);
    header.writeUInt32LE(raw.length, 24);
    header.writeUInt16LE(name.length, 28);
    header.writeUInt32LE(offset, 42);
    name.copy(header, 46);
    central.push(header);
    offset += local.length + deflated.length;
  });
  const centralOffset = offset;
  const centralSize = central.reduce((sum, header) => sum + header.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralOffset, 16);
  return Buffer.concat([...chunks, ...central, end]);
}

const NS = [
  'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"',
  'xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"',
  'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"',
  'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"',
  'xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"',
  'xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"',
  'xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"',
  'xmlns:xlink="http://www.w3.org/1999/xlink"',
  'xmlns:dc="http://purl.org/dc/elements/1.1/"',
  'xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"',
  'xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"',
].join(" ");

const manifest = (mime, paths) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<manifest:manifest ${NS} manifest:version="1.3">` +
  `<manifest:file-entry manifest:full-path="/" manifest:media-type="${mime}"/>` +
  paths.map(([name, type]) => `<manifest:file-entry manifest:full-path="${name}" manifest:media-type="${type}"/>`).join("") +
  `</manifest:manifest>`;

const metaXml = (title) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<office:document-meta ${NS} office:version="1.3"><office:meta>` +
  `<dc:title>${title}</dc:title><dc:creator>Field team</dc:creator></office:meta></office:document-meta>`;

/* ------------------------------- report.odt ------------------------------ */

const image = readFileSync(path.join(outDir, "field.png"));

const odtContent = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content ${NS} office:version="1.3">
<office:automatic-styles>
<style:style style:name="P1" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:keep-with-next="always"/><style:text-properties fo:font-weight="bold" fo:font-size="20pt"/></style:style>
<style:style style:name="P2" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:keep-with-next="always"/><style:text-properties fo:font-weight="bold" fo:font-size="16pt"/></style:style>
<style:style style:name="PBreak" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:break-before="page"/></style:style>
<style:style style:name="TStrongItalic" style:family="text" style:parent-style-name="StrongItalic"/>
<style:style style:name="TUnderline" style:family="text"><style:text-properties style:text-underline-style="solid"/></style:style>
<style:style style:name="TCenter" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:text-align="center"/></style:style>
<text:list-style style:name="LBullet">
<text:list-level-style-bullet text:level="1" text:bullet-char="•"><style:list-level-properties text:space-before="0.5cm" text:min-label-width="0.5cm"/></text:list-level-style-bullet>
<text:list-level-style-bullet text:level="2" text:bullet-char="◦"><style:list-level-properties text:space-before="1cm" text:min-label-width="0.5cm"/></text:list-level-style-bullet>
</text:list-style>
<text:list-style style:name="LNumber">
<text:list-level-style-number text:level="1" style:num-format="1" style:num-suffix="."><style:list-level-properties text:space-before="0.5cm" text:min-label-width="0.5cm"/></text:list-level-style-number>
</text:list-style>
</office:automatic-styles>
<office:body><office:text>
<text:h text:outline-level="1" text:style-name="P1">Weekly field report</text:h>
<text:p text:style-name="Standard">The demo route held up. <text:span text:style-name="TStrongItalic">Twelve visits</text:span> and <text:span text:style-name="TUnderline">three handoffs</text:span> were logged. See the <text:a xlink:type="simple" xlink:href="https://example.com/field-guide">field guide</text:a>.</text:p>
<text:h text:outline-level="2" text:style-name="P2">What changed</text:h>
<text:list text:style-name="LBullet">
<text:list-item><text:p text:style-name="Standard">Retry the demo route early.</text:p></text:list-item>
<text:list-item><text:p text:style-name="Standard">Send the revised deck before Friday.</text:p></text:list-item>
</text:list>
<text:list text:style-name="LNumber">
<text:list-item><text:p text:style-name="Standard">Check the mobile layout on the dispatch page.</text:p></text:list-item>
<text:list-item><text:p text:style-name="Standard">Ask the night crew about the handoff.</text:p></text:list-item>
</text:list>
<table:table table:name="Visits">
<table:table-column table:number-columns-repeated="2"/>
<table:table-header-rows><table:table-row>
<table:table-cell office:value-type="string"><text:p>Site</text:p></table:table-cell>
<table:table-cell office:value-type="string"><text:p>Visits</text:p></table:table-cell>
</table:table-row></table:table-header-rows>
<table:table-row>
<table:table-cell office:value-type="string"><text:p>Northwind</text:p></table:table-cell>
<table:table-cell office:value-type="float" office:value="12"><text:p>12</text:p></table:table-cell>
</table:table-row>
<table:table-row>
<table:table-cell table:number-columns-spanned="2" table:number-rows-spanned="1" office:value-type="string"><text:p>Contoso merged the two rows into one cell.</text:p></table:table-cell>
<table:covered-table-cell/>
</table:table-row>
</table:table>
<text:p text:style-name="PBreak"></text:p>
<text:p text:style-name="TCenter">Route map</text:p>
<text:p text:style-name="Standard">
<draw:frame draw:name="Route map" text:anchor-type="as-char" svg:width="4.5cm" svg:height="2.5cm"><draw:image xlink:href="Pictures/field.png" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/><svg:title>Route map</svg:title></draw:frame>
</text:p>
<text:p text:style-name="Standard">Gate opens at 8, bring the deck.</text:p>
<text:p text:style-name="Standard">Said &quot;hello&quot; and  spaced  words.</text:p>
</office:text></office:body></office:document-content>`;

const odtStyles = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles ${NS} office:version="1.3">
<office:styles>
<style:default-style style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0.2cm"/><style:text-properties fo:font-size="11pt" fo:font-family="Liberation Serif"/></style:default-style>
<style:style style:name="Standard" style:family="paragraph" style:class="text"/>
<style:style style:name="Strong" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style>
<style:style style:name="StrongItalic" style:family="text" style:parent-style-name="Strong"><style:text-properties fo:font-style="italic"/></style:style>
</office:styles>
<office:automatic-styles>
<style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="21.59cm" fo:page-height="27.94cm" style:print-orientation="portrait" fo:margin-top="2.54cm" fo:margin-bottom="2.54cm" fo:margin-left="3.17cm" fo:margin-right="3.17cm"/></style:page-layout>
</office:automatic-styles>
<office:master-styles><style:master-page style:name="Standard" style:page-layout-name="pm1"/></office:master-styles>
</office:document-styles>`;

writeFileSync(path.join(outDir, "report.odt"), buildPackage([
  { name: "mimetype", data: "application/vnd.oasis.opendocument.text" },
  { name: "META-INF/manifest.xml", data: manifest("application/vnd.oasis.opendocument.text", [["content.xml", "text/xml"], ["styles.xml", "text/xml"], ["meta.xml", "text/xml"], ["Pictures/field.png", "image/png"]]) },
  { name: "content.xml", data: odtContent },
  { name: "styles.xml", data: odtStyles },
  { name: "meta.xml", data: metaXml("Weekly field report") },
  { name: "Pictures/field.png", data: image },
]));

/* ------------------------------- report.ods ------------------------------ */

const odsContent = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content ${NS} office:version="1.3">
<office:automatic-styles><style:style style:name="co1" style:family="table-column"><style:table-column-properties style:column-width="2.5cm"/></style:style></office:automatic-styles>
<office:body><office:spreadsheet>
<table:table table:name="Visits">
<table:table-column table:style-name="co1" table:number-columns-repeated="4"/>
<table:table-row>
<table:table-cell office:value-type="string"><text:p>Date</text:p></table:table-cell>
<table:table-cell office:value-type="string"><text:p>Site</text:p></table:table-cell>
<table:table-cell office:value-type="string"><text:p>Visits</text:p></table:table-cell>
<table:table-cell office:value-type="string"><text:p>Note</text:p></table:table-cell>
</table:table-row>
<table:table-row>
<table:table-cell office:value-type="date" office:date-value="2026-10-20"><text:p>2026-10-20</text:p></table:table-cell>
<table:table-cell office:value-type="string"><text:p>Northwind</text:p></table:table-cell>
<table:table-cell office:value-type="float" office:value="12"><text:p>12</text:p></table:table-cell>
<table:table-cell office:value-type="string"><text:p>Gate opens at 8, bring the deck</text:p></table:table-cell>
</table:table-row>
<table:table-row>
<table:table-cell office:value-type="date" office:date-value="2026-10-21T09:15:00"><text:p>2026-10-21 09:15</text:p></table:table-cell>
<table:table-cell office:value-type="string"><text:p>Contoso</text:p></table:table-cell>
<table:table-cell office:value-type="float" office:value="9"><text:p>9</text:p></table:table-cell>
<table:table-cell office:value-type="string"><text:p>Said &quot;hello&quot;</text:p></table:table-cell>
</table:table-row>
<table:table-row>
<table:table-cell office:value-type="string"><text:p>Total</text:p></table:table-cell>
<table:table-cell table:number-columns-repeated="3" office:value-type="float" office:value="7"><text:p>7</text:p></table:table-cell>
<table:table-cell table:number-columns-repeated="500"/>
</table:table-row>
<table:table-row table:number-rows-repeated="1000"/>
</table:table>
<table:table table:name="Handoffs">
<table:table-column table:style-name="co1" table:number-columns-repeated="3"/>
<table:table-row>
<table:table-cell office:value-type="string"><text:p>Owner</text:p></table:table-cell>
<table:table-cell office:value-type="string"><text:p>Missed</text:p></table:table-cell>
<table:table-cell office:value-type="string"><text:p>Backlog</text:p></table:table-cell>
</table:table-row>
<table:table-row>
<table:table-cell office:value-type="string"><text:p>Night crew</text:p></table:table-cell>
<table:table-cell office:value-type="float" office:value="0"><text:p>0</text:p></table:table-cell>
<table:table-cell office:value-type="float" office:value="2"><text:p>2</text:p></table:table-cell>
</table:table-row>
<table:table-row>
<table:table-cell office:value-type="string"><text:p>Day crew</text:p></table:table-cell>
<table:table-cell office:value-type="boolean" office:boolean-value="true"><text:p>TRUE</text:p></table:table-cell>
<table:table-cell office:value-type="float" office:value="3.5"><text:p>3.5</text:p></table:table-cell>
</table:table-row>
</table:table>
</office:spreadsheet></office:body></office:document-content>`;

const odsStyles = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles ${NS} office:version="1.3"><office:styles>
<style:default-style style:family="table-cell"><style:table-cell-properties fo:padding="0.02in"/></style:default-style>
<style:style style:name="Default" style:family="table-cell"/>
</office:styles><office:automatic-styles/><office:master-styles/></office:document-styles>`;

writeFileSync(path.join(outDir, "report.ods"), buildPackage([
  { name: "mimetype", data: "application/vnd.oasis.opendocument.spreadsheet" },
  { name: "META-INF/manifest.xml", data: manifest("application/vnd.oasis.opendocument.spreadsheet", [["content.xml", "text/xml"], ["styles.xml", "text/xml"], ["meta.xml", "text/xml"]]) },
  { name: "content.xml", data: odsContent },
  { name: "styles.xml", data: odsStyles },
  { name: "meta.xml", data: metaXml("Weekly field report") },
]));

console.log("wrote report.odt and report.ods to scripts/fixtures/office");
