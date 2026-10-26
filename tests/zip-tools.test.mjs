import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { deflateRawSync, inflateRawSync } from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function loadTool(file) {
  const text = await readFile(path.join(root, "bookmarklets", "files", file), "utf8");
  const code = text.slice(text.indexOf("*/") + 2).trim();
  const context = vm.createContext({
    __BL_TEST__: {},
    Blob,
    File,
    Response,
    CompressionStream,
    DecompressionStream,
    TextEncoder,
    TextDecoder,
    console,
    setTimeout,
    clearTimeout,
  });
  vm.runInContext(code, context, { filename: file });
  return context.__BL_TEST__;
}

function readU16(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readU32(bytes, offset) {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function findEocd(bytes) {
  for (let index = bytes.length - 22; index >= 0; index--) {
    if (readU32(bytes, index) === 0x06054b50) return index;
  }
  throw new Error("test ZIP has no end record");
}

function makeZip(entries, options = {}) {
  const locals = [];
  const central = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const data = Buffer.from(entry.data ?? "");
    const method = entry.method ?? (entry.directory ? 0 : 8);
    const compressed = entry.raw ? data : method === 8 ? deflateRawSync(data) : data;
    const checksum = entry.crc ?? crc32(data);
    const flags = (entry.flags ?? 0) | 0x0800 | (entry.encrypted ? 1 : 0) | (entry.dataDescriptor ? 8 : 0);
    const external = entry.external ?? (entry.directory ? 0x10 : 0);
    const size = entry.declaredSize ?? data.length;
    const compressedSize = entry.declaredCompressed ?? compressed.length;
    const localOffset = offset;
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(entry.dataDescriptor ? 0 : checksum, 14);
    local.writeUInt32LE(entry.dataDescriptor ? 0 : compressedSize, 18);
    local.writeUInt32LE(entry.dataDescriptor ? 0 : size, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    const payload = Buffer.concat([local, compressed]);
    locals.push(payload);
    offset += payload.length;

    const directory = Buffer.alloc(46 + name.length);
    directory.writeUInt32LE(0x02014b50, 0);
    directory.writeUInt16LE(20, 4);
    directory.writeUInt16LE(20, 6);
    directory.writeUInt16LE(flags, 8);
    directory.writeUInt16LE(method, 10);
    directory.writeUInt32LE(checksum, 16);
    directory.writeUInt32LE(compressedSize, 20);
    directory.writeUInt32LE(size, 24);
    directory.writeUInt16LE(name.length, 28);
    directory.writeUInt32LE(external >>> 0, 38);
    directory.writeUInt32LE(localOffset, 42);
    name.copy(directory, 46);
    central.push(directory);
  }
  const centralOffset = offset;
  const centralDirectory = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(options.split ? 1 : 0, 4);
  eocd.writeUInt16LE(options.split ? 1 : 0, 6);
  eocd.writeUInt16LE(options.zip64 ? 0xffff : entries.length, 8);
  eocd.writeUInt16LE(options.zip64 ? 0xffff : entries.length, 10);
  eocd.writeUInt32LE(options.zip64 ? 0xffffffff : centralDirectory.length, 12);
  eocd.writeUInt32LE(options.zip64 ? 0xffffffff : centralOffset, 16);
  return Buffer.concat([...locals, centralDirectory, eocd]);
}

function parseZip(buffer) {
  const bytes = Buffer.from(buffer);
  const eocd = findEocd(bytes);
  const total = readU16(bytes, eocd + 10);
  const centralSize = readU32(bytes, eocd + 12);
  const centralOffset = readU32(bytes, eocd + 16);
  const central = bytes.subarray(centralOffset, centralOffset + centralSize);
  const entries = [];
  let position = 0;
  for (let index = 0; index < total; index++) {
    assert.equal(readU32(central, position), 0x02014b50);
    const flags = readU16(central, position + 8);
    const method = readU16(central, position + 10);
    const checksum = readU32(central, position + 16);
    const compressedSize = readU32(central, position + 20);
    const size = readU32(central, position + 24);
    const nameLength = readU16(central, position + 28);
    const extraLength = readU16(central, position + 30);
    const commentLength = readU16(central, position + 32);
    const localOffset = readU32(central, position + 42);
    const name = central.subarray(position + 46, position + 46 + nameLength).toString("utf8");
    const local = bytes.subarray(localOffset, localOffset + 30);
    assert.equal(readU32(local, 0), 0x04034b50);
    const localNameLength = readU16(local, 26);
    const localExtraLength = readU16(local, 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const raw = bytes.subarray(dataStart, dataStart + compressedSize);
    const data = method === 8 ? inflateRawSync(raw) : raw;
    entries.push({ name, method, flags, checksum, size, data, directory: name.endsWith("/") });
    position += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function directory(name = "root") {
  const folders = new Map();
  const files = new Map();
  const handle = {
    name,
    folders,
    files,
    async getDirectoryHandle(child, options = {}) {
      if (folders.has(child)) return folders.get(child).handle;
      if (files.has(child)) throw new Error("a file has that name");
      if (!options.create) {
        const error = new Error("not found");
        error.name = "NotFoundError";
        throw error;
      }
      const next = directory(child);
      folders.set(child, next);
      return next.handle;
    },
    async getFileHandle(child, options = {}) {
      if (files.has(child)) return files.get(child).handle;
      if (folders.has(child)) throw new Error("a folder has that name");
      if (!options.create) {
        const error = new Error("not found");
        error.name = "NotFoundError";
        throw error;
      }
      const record = { chunks: [], value: null, aborted: false };
      record.handle = {
        name: child,
        async createWritable() {
          record.chunks = [];
          record.aborted = false;
          return {
            async write(chunk) { record.chunks.push(Buffer.from(chunk)); },
            async close() { record.value = Buffer.concat(record.chunks); },
            async abort() { record.aborted = true; record.chunks = []; },
          };
        },
      };
      files.set(child, record);
      return record.handle;
    },
    async removeEntry(child, options = {}) {
      if (files.delete(child)) return;
      if (folders.has(child)) {
        if (!options.recursive) throw new Error("directory not empty");
        folders.delete(child);
        return;
      }
      const error = new Error("not found");
      error.name = "NotFoundError";
      throw error;
    },
  };
  return { name, folders, files, handle };
}

const zipTool = (await loadTool("zip-files.js")).zipFiles;
const unzipTool = (await loadTool("unzip.js")).unzip;

test("ZIP builder writes a standard archive with paths, folders and UTF-8 names", async () => {
  const notes = new File(["# Field notes\n\n- Retry the demo route\n"], "notes.md", { lastModified: Date.UTC(2026, 9, 26) });
  const photo = new File([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])], "diagram.png");
  const blob = await zipTool.createZip(
    [
      { path: "notes.md", file: notes },
      { path: "project/images/diagram.png", file: photo },
      { path: "café/readme.txt", file: new File(["café"], "readme.txt") },
      { path: "large.log", file: new File(["retry the demo route\n".repeat(600)], "large.log") },
    ],
    { directories: ["project/empty"] },
  );
  assert.equal(blob.type, "application/zip");
  const entries = parseZip(Buffer.from(await blob.arrayBuffer()));
  const byName = new Map(entries.map((entry) => [entry.name, entry]));
  assert.equal(byName.get("notes.md").data.toString(), "# Field notes\n\n- Retry the demo route\n");
  assert.deepEqual([...byName.get("project/images/diagram.png").data], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(byName.get("café/readme.txt").data.toString(), "café");
  assert.ok(byName.has("project/"));
  assert.ok(byName.has("project/empty/"));
  assert.ok(entries.every((entry) => entry.flags & 0x0800));
  assert.ok(entries.every((entry) => !(entry.flags & 1)));
  assert.equal(byName.get("large.log").method, 8);
  assert.equal(byName.get("notes.md").method, 0);
  assert.equal(byName.get("large.log").data.toString().slice(0, 20), "retry the demo route");
});

test("ZIP builder makes tiny files stored and resolves duplicate paths", async () => {
  const blob = await zipTool.createZip([
    { path: "same.txt", file: new File(["a"], "same.txt") },
    { path: "same.txt", file: new File(["b"], "same.txt") },
  ]);
  const entries = parseZip(Buffer.from(await blob.arrayBuffer()));
  assert.deepEqual(entries.map((entry) => entry.name), ["same.txt", "same (2).txt"]);
  assert.deepEqual(entries.map((entry) => entry.data.toString()), ["a", "b"]);
  assert.ok(entries.every((entry) => entry.method === 0));
});

test("ZIP builder archives a folder even when it is empty", async () => {
  const blob = await zipTool.createZip([], { directories: ["project/empty"] });
  const entries = parseZip(Buffer.from(await blob.arrayBuffer()));
  assert.deepEqual(entries.map((entry) => entry.name), ["project/", "project/empty/"]);
  assert.ok(entries.every((entry) => entry.directory));
  assert.equal(blob.size, 218);
});

test("ZIP builder enforces size and entry caps", async () => {
  const huge = { name: "huge.bin", size: 1000000001, lastModified: 0, arrayBuffer: async () => new ArrayBuffer(0) };
  await assert.rejects(zipTool.createZip([{ path: "huge.bin", file: huge }]), /1 GB/);
  const many = Array.from({ length: 65536 }, (_, index) => ({
    path: `file-${index}.txt`,
    file: { name: `file-${index}.txt`, size: 0, lastModified: 0, arrayBuffer: async () => new ArrayBuffer(0) },
  }));
  await assert.rejects(zipTool.createZip(many), /65,535/);
});

test("ZIP reader parses the central directory and extracts individual entries", async () => {
  const bytes = makeZip([
    { name: "notes/todo.txt", data: "one" },
    { name: "café.txt", data: "two" },
    { name: "empty/", data: "", directory: true },
    { name: "zero.txt", data: "" },
  ]);
  const file = new File([bytes], "sample.zip");
  const archive = await unzipTool.readZip(file);
  assert.equal(archive.entries.length, 4);
  assert.equal(archive.files.length, 3);
  assert.equal(archive.folders.length, 1);
  assert.equal(archive.totalSize, 6);
  assert.ok(archive.entries.some((entry) => entry.path === "café.txt"));
  assert.ok(archive.entries.some((entry) => entry.isDirectory && entry.path === "empty"));
  const note = archive.entries.find((entry) => entry.path === "notes/todo.txt");
  const blob = await unzipTool.extractEntry(file, note);
  assert.equal(Buffer.from(await blob.arrayBuffer()).toString(), "one");
});

test("ZIP reader handles data descriptors by using central-directory sizes", async () => {
  const bytes = makeZip([
    { name: "streamed.txt", data: Buffer.from("a".repeat(5000)), dataDescriptor: true },
    { name: "stored.bin", data: "raw", method: 0, dataDescriptor: true },
  ]);
  const file = new File([bytes], "descriptor.zip");
  const archive = await unzipTool.readZip(file);
  for (const entry of archive.entries) {
    const blob = await unzipTool.extractEntry(file, entry);
    assert.ok((await blob.arrayBuffer()).byteLength === entry.size);
  }
});

test("ZIP extraction writes the whole tree and removes an existing-name collision", async () => {
  const bytes = makeZip([
    { name: "notes/todo.txt", data: "todo" },
    { name: "empty/", data: "", directory: true },
    { name: "café.txt", data: "coffee" },
  ]);
  const file = new File([bytes], "sample.zip");
  const archive = await unzipTool.readZip(file);
  const root = directory();
  await root.handle.getDirectoryHandle("sample", { create: true });
  const result = await unzipTool.extractAll(file, root.handle, "sample.zip", archive.entries);
  assert.equal(result.folder, "sample (2)");
  assert.equal(result.files, 2);
  const folder = root.folders.get("sample (2)");
  assert.ok(folder.folders.has("notes"));
  assert.ok(folder.folders.has("empty"));
  assert.equal(folder.folders.get("notes").files.get("todo.txt").value.toString(), "todo");
  assert.equal(folder.files.get("café.txt").value.toString(), "coffee");
});

test("ZIP extraction does not repeat an archive-name root folder", async () => {
  const bytes = makeZip([
    { name: "project/", data: "", directory: true },
    { name: "project/README.md", data: "readme" },
    { name: "project/notes/day-1.md", data: "day one" },
    { name: "project/empty/", data: "", directory: true },
  ]);
  const file = new File([bytes], "project.zip");
  const archive = await unzipTool.readZip(file);
  const root = directory();
  await root.handle.getDirectoryHandle("project", { create: true });
  const result = await unzipTool.extractAll(file, root.handle, "project.zip", archive.entries);
  assert.equal(result.folder, "project (2)");
  const folder = root.folders.get("project (2)");
  assert.equal(folder.files.get("README.md").value.toString(), "readme");
  assert.ok(folder.folders.has("notes"));
  assert.ok(folder.folders.has("empty"));
  assert.equal(folder.folders.get("notes").files.get("day-1.md").value.toString(), "day one");
  assert.ok(!folder.folders.has("project"));
});

test("ZIP browser rejects unsafe, encrypted, ZIP64, split and duplicate archives", async () => {
  const cases = [
    [makeZip([{ name: "../evil.txt", data: "x" }]), /unsafe/],
    [makeZip([{ name: "/evil.txt", data: "x" }]), /unsafe/],
    [makeZip([{ name: "secret.txt", data: "x", encrypted: true }]), /Encrypted/],
    [makeZip([{ name: "large.bin", data: "x", declaredSize: 3000000000 }, { name: "also.bin", data: "x", declaredSize: 2000000000 }]), /4 GB/],
    [makeZip([], { zip64: true }), /ZIP64/],
    [makeZip([], { split: true }), /multi-disk|Split/],
    [makeZip([{ name: "one.txt", data: "1" }, { name: "one.txt", data: "2" }]), /duplicate/],
    [makeZip([{ name: "link", data: "", external: 0xa0000000 }]), /Symbolic/],
    [makeZip([{ name: "weird.bin", data: "x", method: 99 }]), /unsupported/],
    [makeZip([]), /empty/],
  ];
  for (const [bytes, expected] of cases) {
    await assert.rejects(unzipTool.readZip(new File([bytes], "bad.zip")), expected);
  }
});

test("ZIP extraction rejects a bad checksum and cleans up the partial folder", async () => {
  const bytes = makeZip([{ name: "notes.txt", data: "correct", crc: 1 }]);
  const file = new File([bytes], "bad-crc.zip");
  const archive = await unzipTool.readZip(file);
  await assert.rejects(unzipTool.extractEntry(file, archive.entries[0]), /checksum/);
  const root = directory();
  await assert.rejects(unzipTool.extractAll(file, root.handle, "bad-crc.zip", archive.entries), /checksum/);
  assert.equal(root.folders.size, 0);
});
