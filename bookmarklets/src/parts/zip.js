/* Minimal ZIP32 reader and store-only writer used by the Office converters. */

BL.CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

BL.crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index++) crc = BL.CRC_TABLE[(crc ^ bytes[index]) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

BL.abortError = () => {
  const error = new Error("Canceled");
  error.name = "AbortError";
  return error;
};

BL.u16 = (bytes, offset) => bytes[offset] | (bytes[offset + 1] << 8);
BL.u32 = (bytes, offset) => (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;

BL.unzip = async (file, options = {}) => {
  const maxBytes = options.maxBytes ?? 100 * 1024 * 1024;
  const maxTotal = options.maxTotal ?? 300 * 1024 * 1024;
  const maxEntries = options.maxEntries ?? 20000;
  if (!file || !Number.isFinite(file.size) || file.size < 22) throw new Error("This is not a ZIP-based Office file.");
  if (file.size > maxBytes) throw new Error(`This file is over the ${Math.round(maxBytes / 1024 / 1024)} MB limit.`);
  const tailSize = Math.min(file.size, 65535 + 22);
  const tail = new Uint8Array(await file.slice(file.size - tailSize).arrayBuffer());
  let eocd = -1;
  for (let index = tail.length - 22; index >= 0; index--) {
    if (BL.u32(tail, index) !== 0x06054b50) continue;
    if (index + 22 + BL.u16(tail, index + 20) <= tail.length) { eocd = index; break; }
  }
  if (eocd < 0) throw new Error("This file is not a ZIP archive, or it is password-protected.");
  const disk = BL.u16(tail, eocd + 4);
  const centralDisk = BL.u16(tail, eocd + 6);
  const onDisk = BL.u16(tail, eocd + 8);
  const total = BL.u16(tail, eocd + 10);
  const centralSize = BL.u32(tail, eocd + 12);
  const centralOffset = BL.u32(tail, eocd + 16);
  if (disk !== 0 || centralDisk !== 0 || onDisk !== total) throw new Error("Split ZIP archives are not supported.");
  if (total === 65535 || centralSize === 4294967295 || centralOffset === 4294967295) {
    throw new Error("ZIP64 Office files are not supported. Save a standard .docx or .xlsx.");
  }
  if (!total) throw new Error("This Office file is empty.");
  if (total > maxEntries) throw new Error("This Office file contains too many parts.");
  if (centralOffset + centralSize > file.size) throw new Error("The ZIP directory is outside the file.");
  const central = new Uint8Array(await file.slice(centralOffset, centralOffset + centralSize).arrayBuffer());
  const records = [];
  const seen = new Set();
  let position = 0;
  let declaredTotal = 0;
  const decoder = new TextDecoder("utf-8");
  for (let index = 0; index < total; index++) {
    if (position + 46 > central.length || BL.u32(central, position) !== 0x02014b50) {
      throw new Error("The ZIP directory is malformed.");
    }
    const flags = BL.u16(central, position + 8);
    const method = BL.u16(central, position + 10);
    const crc = BL.u32(central, position + 16);
    const compressedSize = BL.u32(central, position + 20);
    const size = BL.u32(central, position + 24);
    const nameLength = BL.u16(central, position + 28);
    const extraLength = BL.u16(central, position + 30);
    const commentLength = BL.u16(central, position + 32);
    const diskStart = BL.u16(central, position + 34);
    const localOffset = BL.u32(central, position + 42);
    const end = position + 46 + nameLength + extraLength + commentLength;
    if (end > central.length) throw new Error("The ZIP directory is truncated.");
    if (size === 4294967295 || compressedSize === 4294967295 || localOffset === 4294967295) {
      throw new Error("ZIP64 Office files are not supported.");
    }
    if (flags & 1) throw new Error("Encrypted Office files are not supported.");
    if (method !== 0 && method !== 8) throw new Error(`Unsupported ZIP compression method ${method}.`);
    if (diskStart !== 0) throw new Error("Split ZIP archives are not supported.");
    const path = decoder.decode(central.subarray(position + 46, position + 46 + nameLength)).replace(/\\/g, "/");
    if (!path || path.startsWith("/") || path.split("/").some((part) => part === ".." || part === ".")) {
      throw new Error("The Office file contains an unsafe part name.");
    }
    if (seen.has(path)) throw new Error(`The Office file contains a duplicate part: ${path}`);
    seen.add(path);
    declaredTotal += size;
    if (declaredTotal > maxTotal) throw new Error("This Office file expands beyond the 300 MB limit.");
    if (!path.endsWith("/")) records.push({ path, method, crc, size, compressedSize, localOffset });
    position = end;
  }
  const decoderText = new TextDecoder("utf-8");
  const parts = new Map();
  for (const record of records) {
    if (options.signal?.aborted) throw BL.abortError();
    const local = new Uint8Array(await file.slice(record.localOffset, record.localOffset + 30).arrayBuffer());
    if (local.length < 30 || BL.u32(local, 0) !== 0x04034b50) throw new Error(`The local header for ${record.path} is missing.`);
    const start = record.localOffset + 30 + BL.u16(local, 26) + BL.u16(local, 28);
    if (start + record.compressedSize > file.size) throw new Error(`The data for ${record.path} is outside the file.`);
    let bytes;
    if (record.method === 8) {
      if (typeof DecompressionStream !== "function") throw new Error("This browser cannot read compressed Office files.");
      const stream = file.slice(start, start + record.compressedSize).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    } else {
      bytes = new Uint8Array(await file.slice(start, start + record.compressedSize).arrayBuffer());
    }
    if (bytes.length !== record.size || BL.crc32(bytes) !== record.crc) {
      throw new Error(`The checksum for ${record.path} does not match. The Office file may be damaged.`);
    }
    parts.set(record.path, bytes);
  }
  return {
    parts,
    text: (name) => {
      const bytes = parts.get(name);
      if (!bytes) return "";
      if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes);
      return decoderText.decode(bytes);
    },
    has: (name) => parts.has(name),
  };
};

const dosTime = (date) => {
  const safe = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  return {
    time: (safe.getHours() << 11) | (safe.getMinutes() << 5) | Math.floor(safe.getSeconds() / 2),
    date: ((Math.max(1980, safe.getFullYear()) - 1980) << 9) | ((safe.getMonth() + 1) << 5) | safe.getDate(),
  };
};

BL.makeZip = async (items) => {
  const encoder = new TextEncoder();
  const files = [];
  const used = new Set();
  let total = 0;
  for (const item of items || []) {
    if (!item?.blob) continue;
    const name = String(item.name || "").replace(/\\/g, "/").replace(/^\/+/, "");
    if (!name || name.split("/").some((part) => !part || part === "." || part === "..")) {
      throw new Error("A file name in this ZIP is not valid.");
    }
    if (used.has(name)) throw new Error(`This ZIP has a duplicate entry: ${name}`);
    used.add(name);
    const bytes = new Uint8Array(await item.blob.arrayBuffer());
    total += bytes.length;
    if (files.length >= 65535) throw new Error("This ZIP has too many entries.");
    if (total > 0xffffffff) throw new Error("This ZIP is larger than ZIP32 allows.");
    files.push({ name, bytes });
  }
  if (!files.length) throw new Error("There is nothing to zip.");
  const stamp = dosTime(new Date());
  const chunks = [];
  const central = [];
  let offset = 0;
  const push = (bytes) => { chunks.push(bytes); offset += bytes.length; };
  for (const file of files) {
    const name = encoder.encode(file.name);
    const local = new Uint8Array(30 + name.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x0800, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, stamp.time, true);
    view.setUint16(12, stamp.date, true);
    view.setUint32(14, BL.crc32(file.bytes), true);
    view.setUint32(18, file.bytes.length, true);
    view.setUint32(22, file.bytes.length, true);
    view.setUint16(26, name.length, true);
    local.set(name, 30);
    const localOffset = offset;
    push(local);
    push(file.bytes);
    const cd = new Uint8Array(46 + name.length);
    const entry = new DataView(cd.buffer);
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 0x0800, true);
    entry.setUint16(10, 0, true);
    entry.setUint16(12, stamp.time, true);
    entry.setUint16(14, stamp.date, true);
    entry.setUint32(16, BL.crc32(file.bytes), true);
    entry.setUint32(20, file.bytes.length, true);
    entry.setUint32(24, file.bytes.length, true);
    entry.setUint16(28, name.length, true);
    entry.setUint32(42, localOffset, true);
    cd.set(name, 46);
    central.push(cd);
  }
  const centralOffset = offset;
  for (const entry of central) push(entry);
  const centralSize = offset - centralOffset;
  const end = new Uint8Array(22);
  const view = new DataView(end.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, files.length, true);
  view.setUint16(10, files.length, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  push(end);
  return new Blob(chunks, { type: "application/zip" });
};
