/**
 * @name 🔒 URL-Anchored Secret Chat
 * @category view
 * @description Open an ephemeral PeerJS chat shared by everyone on this exact page URL.
 * @tags chat, peerjs, webrtc, url, secret, room, p2p
 * @added 2026-10-28
 * @featured false
 */
(async () => {
  const source = location.origin + location.pathname;
  const pageTitle = (document.title || location.pathname).slice(0, 160);
  const pageUrl = location.href.slice(0, 2000);
  const popup = window.open("about:blank", "bl-url-chat", "popup=yes,width=430,height=640,menubar=no,status=no,toolbar=no");

  let room = "";
  try {
    if (!crypto?.subtle) throw new Error("no subtle crypto");
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
    room = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    // Non-secure pages do not expose SubtleCrypto. This fallback keeps the
    // room deterministic for everyone on the same origin and path; it is a
    // rendezvous key, not a secret.
    const fnv = (text) => {
      let hash = 2166136261;
      for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      return (hash >>> 0).toString(16).padStart(8, "0");
    };
    room = Array.from({ length: 4 }, (_, index) => fnv(`${source}#${index}`)).join("");
  }

  const target = new URL("https://spuds0588.github.io/Bookmarklet-Library/chat.html");
  target.searchParams.set("room", room);
  target.searchParams.set("title", pageTitle);
  target.searchParams.set("url", pageUrl);
  try { navigator.clipboard?.writeText(target.href)?.catch(() => {}); } catch {}

  if (popup && !popup.closed) {
    popup.location.replace(target.href);
    popup.focus?.();
  } else {
    prompt("Pop-up blocked. Copy this chat link:", target.href);
  }
})();
