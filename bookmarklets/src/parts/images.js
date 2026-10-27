/* Image helpers: MIME and size sniffing, data URLs and hex for RTF. */

BL.imageMime = (path) => {
  const extension = String(path || "").toLowerCase().split(".").at(-1);
  return { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", bmp: "image/bmp", webp: "image/webp" }[extension] || "";
};

BL.imageExtension = (mime) => ({
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/webp": "webp",
}[mime] || "bin");

BL.imageSize = (bytes) => {
  if (!bytes || bytes.length < 10) return null;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { width: BL.u32(bytes, 16), height: BL.u32(bytes, 20) };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset++; continue; }
      const marker = bytes[offset + 1];
      const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
      if (marker >= 0xc0 && marker <= 0xc3) {
        return { height: (bytes[offset + 5] << 8) | bytes[offset + 6], width: (bytes[offset + 7] << 8) | bytes[offset + 8] };
      }
      offset += 2 + (length || 2);
    }
  }
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return { width: bytes[6] | (bytes[7] << 8), height: bytes[8] | (bytes[9] << 8) };
  }
  if (bytes[0] === 0x42 && bytes[1] === 0x4d && bytes.length >= 26) {
    return { width: bytes[18] | (bytes[19] << 8) | (bytes[20] << 16) | (bytes[21] << 24), height: bytes[22] | (bytes[23] << 8) | (bytes[24] << 16) | (bytes[25] << 24) };
  }
  return null;
};

BL.bytesToBase64 = (bytes) => {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
};

BL.base64ToBytes = (value) => {
  const binary = atob(String(value || "").replace(/\s+/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
};

BL.dataUrl = (bytes, mime) => `data:${mime || "application/octet-stream"};base64,${BL.bytesToBase64(bytes)}`;

BL.decodeDataUrl = (url) => {
  const match = /^data:([^;,]+)?((?:;[^,]*)*),([\s\S]*)$/i.exec(String(url || ""));
  if (!match) return null;
  const mime = (match[1] || "application/octet-stream").toLowerCase();
  if (!/;base64(;|$)/i.test(match[2])) {
    try { return { mime, bytes: new TextEncoder().encode(decodeURIComponent(match[3])) }; } catch { return null; }
  }
  try { return { mime, bytes: BL.base64ToBytes(match[3]) }; } catch { return null; }
};

BL.hexBytes = (bytes) => {
  let value = "";
  for (let index = 0; index < bytes.length; index++) value += bytes[index].toString(16).padStart(2, "0");
  return value;
};

BL.rasterizeImage = async (data, uiWindow) => {
  if (!data?.bytes || !data.mime) return null;
  if (data.mime === "image/png" || data.mime === "image/jpeg") return data;
  const win = uiWindow || globalThis.window;
  if (!win?.document) return null;
  try {
    const blob = new Blob([data.bytes], { type: data.mime });
    const canvas = win.document.createElement("canvas");
    let width = 0;
    let height = 0;
    const draw = (source) => {
      width = Math.max(1, Math.round(width || source.width || source.naturalWidth || 1));
      height = Math.max(1, Math.round(height || source.height || source.naturalHeight || 1));
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(source, 0, 0, width, height);
    };
    if (typeof createImageBitmap === "function") {
      try {
        const bitmap = await createImageBitmap(blob);
        width = bitmap.width;
        height = bitmap.height;
        draw(bitmap);
        bitmap.close?.();
      } catch {}
    }
    if (!width) {
      const url = win.URL.createObjectURL(blob);
      const image = new win.Image();
      try {
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
          image.src = url;
        });
        draw(image);
      } finally {
        win.URL.revokeObjectURL(url);
      }
    }
    if (!width) return null;
    const png = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!png) return null;
    return { bytes: new Uint8Array(await png.arrayBuffer()), mime: "image/png", width, height };
  } catch {
    return null;
  }
};

BL.imageBytesFromUrl = async (url, uiWindow) => {
  if (!url) return null;
  const data = BL.decodeDataUrl(url);
  if (data) return BL.rasterizeImage(data, uiWindow);
  if (!/^https?:/i.test(url)) return null;
  try {
    const response = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!response.ok) return null;
    const mime = (response.headers.get("content-type") || "").split(";")[0].toLowerCase();
    if (!/^image\//.test(mime)) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > 10 * 1024 * 1024) return null;
    return BL.rasterizeImage({ bytes, mime }, uiWindow);
  } catch {
    return null;
  }
};
