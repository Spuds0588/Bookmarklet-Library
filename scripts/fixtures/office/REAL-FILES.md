# Where these fixtures come from

`report.docx`, `report.xlsx`, `report.html`, `report.rtf`, `report.txt`, `report.md`,
`report.csv`, `field.png` are the samples the conversion tests and the capture
harness run against. `report.odt` and `report.ods` are written by
`scripts/fixtures/make-odf.mjs` with plain XML and Node's own zlib, so no
fixture is ever produced by the reader it is meant to test:

```sh
node scripts/fixtures/make-odf.mjs
```

The three real-world OpenDocument files are kept byte for byte, so the readers
are checked against what an office suite actually writes and not only against
packages built in memory. They come from the Apache-2.0 licensed ODF Toolkit
repository ([tdf/odftoolkit](https://github.com/tdf/odftoolkit),
`odfdom/src/test/resources/test-input/`), and are redistributed here under that
license:

| File | Size | Producer (`meta:generator`) | What it covers |
| --- | --- | --- | --- |
| `character-styles.odt` | 13 KB | `LibreOffice/6.1.6.3$Windows_X86_64` | 12 headings, character styles, no tables |
| `compdocfileformat.odt` | 55 KB | `StarOffice/8$Win32` | 21 tables, 29 lists, row spans, an embedded image, a document title |
| `default_namespace.ods` | 28 KB | `Cedaron.FormBuilder.Presentation` (third party) | 19 sheets, default XML namespace, floats, booleans and dates |

SHA-256:

```
6b96d690822330ca0ce0632163dd3269d7f551890510131bf688fa6a05c3dca6  character-styles.odt
a74407595f8461961a98e88346142c72685587f6e373167c98778a9e362f6407  compdocfileformat.odt
f9a8dc2170ef476fbec3f0386b58836e91149f90e03f0a497ec98256a70fa1d0  default_namespace.ods
c275790cee73056456c7951eb222b4256450162a10c7aa1a5a8978fa843c7f5a  report.odt
aed97b885b38ab627735cbc66aa03505b5f78178c66c65d39b55132c419aa887  report.ods
```

Do not edit these files. `tests/odf-tools.test.mjs` asserts what each one parses
into, so a replaced copy fails the suite rather than quietly weakening it.
