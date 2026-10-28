(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const states = { waiting: $("waiting"), result: $("result"), error: $("error") };
  const value = $("value");
  const version = $("version");
  const meta = $("meta");
  const note = $("note");
  const openHereButton = $("open-here");
  const openTabButton = $("open-tab");
  const copyButton = $("copy");
  const waitingLead = states.waiting.querySelector(".lead");
  const waitingCopy = states.waiting.querySelector(".copy");

  let current = null;
  let linked = false;
  let noteTimer = 0;

  function show(name) {
    for (const [key, node] of Object.entries(states)) node.hidden = key !== name;
  }

  function setNote(message) {
    clearTimeout(noteTimer);
    note.textContent = message || "";
    note.hidden = !message;
    if (message) {
      noteTimer = setTimeout(() => {
        note.hidden = true;
      }, 6000);
    }
  }

  function parseWebUrl(text) {
    try {
      const url = new URL(String(text).trim());
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
    } catch {
      return "";
    }
  }

  function hostOf(url) {
    try {
      return new URL(url).host;
    } catch {
      return "";
    }
  }

  function countCharacters(text) {
    return [...text].length;
  }

  function render(text, result) {
    current = { text, url: parseWebUrl(text) };
    value.textContent = text;
    version.textContent = result && result.version ? `QR v${result.version}` : "QR";
    const length = countCharacters(text);
    meta.textContent = current.url
      ? `${hostOf(current.url)} · ${length} ${length === 1 ? "character" : "characters"}`
      : `Plain text · ${length} ${length === 1 ? "character" : "characters"}`;

    openHereButton.disabled = !current.url;
    openTabButton.disabled = !current.url;
    openHereButton.title = current.url ? "Open in the page that launched this reader" : "This QR code does not contain an http or https link";
    openTabButton.title = openHereButton.title;
    copyButton.disabled = false;

    setNote(current.url ? "" : "This is text, not an http or https link. Copy still works.");
    show("result");
  }

  function showError(title, copy) {
    $("error-title").textContent = title;
    $("error-copy").textContent = copy;
    show("error");
  }

  function closeWindow() {
    window.close();
    setTimeout(() => {
      if (!window.closed && history.length > 1) history.back();
    }, 80);
  }

  function decodePixels(pixels, width, height) {
    return jsQR(pixels, width, height, { inversionAttempts: "attemptBoth" });
  }

  async function decode(dataUrl) {
    const image = new Image();
    image.src = dataUrl;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("empty image");

    // The bookmarklet caps its crop, but a manually posted image can still be
    // larger than the decoder should chew through. Keep the long edge sane.
    const max = 1800;
    const ratio = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = Math.max(1, Math.round(image.naturalHeight * ratio));

    const base = document.createElement("canvas");
    base.width = width;
    base.height = height;
    const baseContext = base.getContext("2d", { willReadFrequently: true });
    baseContext.drawImage(image, 0, 0, width, height);
    const original = baseContext.getImageData(0, 0, width, height);
    let result = decodePixels(original.data, width, height);
    if (result) return { text: result.data, result };

    // Small QR codes on a high-DPI screen can be only a few pixels per module.
    // Nearest-neighbour enlargement gives the locator a second chance.
    for (const scale of [2, 3]) {
      if (width * scale * height * scale > 12_000_000) break;
      const upscaled = document.createElement("canvas");
      upscaled.width = width * scale;
      upscaled.height = height * scale;
      const context = upscaled.getContext("2d", { willReadFrequently: true });
      context.imageSmoothingEnabled = false;
      context.drawImage(base, 0, 0, upscaled.width, upscaled.height);
      const pixels = context.getImageData(0, 0, upscaled.width, upscaled.height);
      result = decodePixels(pixels.data, upscaled.width, upscaled.height);
      if (result) return { text: result.data, result };
    }
    return null;
  }

  async function handleImage(dataUrl) {
    if (typeof dataUrl !== "string" || dataUrl.length > 24_000_000 || !dataUrl.startsWith("data:image/")) {
      showError("Could not read the capture", "The selected image did not arrive intact. Close this window and run the bookmarklet again.");
      return;
    }
    waitingLead.textContent = "Reading the code";
    waitingCopy.textContent = "The area you selected is being checked here. Nothing is uploaded.";
    show("waiting");
    try {
      const found = await decode(dataUrl);
      if (!found || !found.text) {
        showError(
          "No QR code found",
          "Try a tighter box with a little white space around the code, then run the bookmarklet again. A blurry or partially covered code will not scan.",
        );
        return;
      }
      render(found.text, found.result);
    } catch {
      showError(
        "No QR code found",
        "The selected area could not be read as an image. Close this window and run the bookmarklet again.",
      );
    }
  }

  window.addEventListener("message", (event) => {
    if (!window.opener || event.source !== window.opener) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type === "bl-qr-image") {
      handleImage(data.dataUrl);
    } else if (data.type === "bl-qr-error") {
      showError(
        "Capture cancelled",
        typeof data.message === "string" && data.message ? data.message : "The screen was not captured. Close this window and run the bookmarklet again.",
      );
    } else if (data.type === "bl-qr-ready-ack") {
      linked = true;
    }
  });

  openHereButton.addEventListener("click", () => {
    if (!current || !current.url) return;
    if (linked && window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: "bl-qr-open", url: current.url }, "*");
      setNote("Opening in the page that launched this reader.");
      return;
    }
    location.href = current.url;
  });

  openTabButton.addEventListener("click", () => {
    if (!current || !current.url) return;
    const anchor = document.createElement("a");
    anchor.href = current.url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setNote("Opened in a new tab.");
  });

  copyButton.addEventListener("click", async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.text);
      setNote("Copied to clipboard.");
      return;
    } catch {}
    const field = document.createElement("textarea");
    field.value = current.text;
    field.setAttribute("readonly", "");
    field.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0";
    document.body.appendChild(field);
    field.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {}
    field.remove();
    setNote(copied ? "Copied to clipboard." : "Could not copy. Select the text above and copy it.");
  });

  for (const button of document.querySelectorAll("[data-close]")) {
    button.addEventListener("click", closeWindow);
  }
  $("again").addEventListener("click", closeWindow);
  $("error-close").addEventListener("click", closeWindow);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeWindow();
    }
  });

  if (typeof jsQR !== "function") {
    showError(
      "The decoder did not load",
      "Reload this reader. The decoder is bundled with the page and needs no network access after it loads.",
    );
    return;
  }

  if (!window.opener) {
    showError(
      "Open this from the bookmarklet",
      "Click Scan QR from screen in your bookmarks bar on the page that has the code. This window only decodes the area you select; it does not ask for screen access by itself.",
    );
    return;
  }

  try {
    window.opener.postMessage({ type: "bl-qr-ready" }, "*");
  } catch {}
})();
