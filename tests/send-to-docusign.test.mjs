import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

globalThis.location = { href: "https://library.example.com/files/" };
globalThis.__BL_TEST__ = {};
new Function(await readFile(path.join(root, "bookmarklets", "files", "send-to-docusign.js"), "utf8"))();
const { isPdfHref, fileNameFor, sourceName, envelopeBody, looksLikePdf, tokenHint, accountHint } = globalThis.__BL_TEST__.docusign;
delete globalThis.__BL_TEST__;

const bytes = (text) => new TextEncoder().encode(text);

test("a PDF is recognised in a tab, a blob and a page embed", () => {
  assert.equal(isPdfHref("https://example.com/reports/q3.PDF?download=1"), true);
  assert.equal(isPdfHref("/field-notes.pdf"), true);
  assert.equal(isPdfHref("blob:https://example.com/6f1c2a"), true);
  assert.equal(isPdfHref("data:application/pdf;base64,JVBERi0="), true);
  assert.equal(isPdfHref("https://example.com/report.docx"), false);
  assert.equal(isPdfHref("https://example.com/a.pdf.html"), false);
  assert.equal(isPdfHref("https://example.com/pdf"), false);
  assert.equal(isPdfHref(""), false);
});

test("the envelope name looks like a file, not a page title", () => {
  assert.equal(fileNameFor("Field report (draft)", "/x/a.pdf"), "Field report (draft).pdf");
  assert.equal(fileNameFor("Field report.pdf", "/x/a.pdf"), "Field report.pdf");
  assert.equal(fileNameFor("", "/files/field%20notes.pdf"), "field notes.pdf");
  assert.equal(fileNameFor("", ""), "Document.pdf");
  assert.equal(fileNameFor("Site: report / final?", "/x/a.pdf"), "Site-report-final.pdf");
  assert.equal(fileNameFor("- - notes - -", "/x/a.pdf"), "notes.pdf");
  assert.equal(fileNameFor("x".repeat(140), "/x/a.pdf"), `${"x".repeat(90)}.pdf`);
});

test("a PDF is named after its file, not the page around it", () => {
  globalThis.document = { title: "Northwind field guide — keeping a team in the loop" };
  assert.equal(sourceName({ url: "https://example.com/files/sample.pdf?x=1" }), "sample.pdf");
  assert.equal(sourceName({ url: "/files/field%20notes.pdf" }), "field notes.pdf");
  // A viewer page is not a file name, so the title is the only hint left.
  assert.equal(sourceName({ url: "https://example.com/view?id=3" }), "Northwind field guide — keeping a team in the loop");
  assert.equal(sourceName(null), "Northwind field guide — keeping a team in the loop");
  assert.equal(fileNameFor(sourceName({ url: "/files/field%20notes.pdf" }), "/files/field%20notes.pdf"), "field notes.pdf");
  delete globalThis.document;
});

test("the envelope is a draft with the bytes attached", () => {
  const body = envelopeBody({ name: "field notes.pdf", base64: "JVBERi0=", email: "", subject: "" });
  assert.equal(body.status, "created");
  assert.equal(body.emailSubject, "Please sign this document");
  assert.equal(body.documents.length, 1);
  assert.equal(body.documents[0].documentId, "1");
  assert.equal(body.documents[0].fileExtension, "pdf");
  assert.equal(body.documents[0].documentBase64, "JVBERi0=");
  // A draft with no signer is allowed; DocuSign rejects an empty email address.
  assert.equal(body.recipients, undefined);
  assert.equal(envelopeBody({ name: "a.pdf", base64: "x", email: "   ", subject: "Sign" }).recipients, undefined);
});

test("a signer is added only when there is an address", () => {
  const body = envelopeBody({ name: "a.pdf", base64: "x", email: "dana@northwind.example", subject: "Please sign the visit report" });
  assert.equal(body.emailSubject, "Please sign the visit report");
  assert.equal(body.recipients.signers.length, 1);
  assert.equal(body.recipients.signers[0].email, "dana@northwind.example");
  assert.equal(body.recipients.signers[0].recipientId, "1");
  assert.equal(body.recipients.signers[0].routingOrder, "1");
});

test("only bytes that start like a PDF are uploaded", () => {
  assert.equal(looksLikePdf(bytes("%PDF-1.7\n...")), true);
  assert.equal(looksLikePdf(bytes("see %PDF-1.4 later")), true);
  assert.equal(looksLikePdf(bytes("<html><body>Not found</body></html>")), false);
  assert.equal(looksLikePdf(new Uint8Array([])), false);
  assert.equal(looksLikePdf(null), false);
});

test("credentials are checked for shape, not for validity", () => {
  assert.equal(tokenHint("eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxIn0.c2ln"), "jwt");
  assert.equal(tokenHint("not-a-token"), "odd");
  assert.equal(tokenHint(""), "empty");
  assert.equal(accountHint("4f2a9d1e-6c31-4a07-9b55-1d8e2c7a3b60"), "guid");
  assert.equal(accountHint("12345"), "odd");
  assert.equal(accountHint(""), "empty");
});
