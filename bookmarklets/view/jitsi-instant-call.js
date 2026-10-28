/**
 * @name 📹 1-Click Jitsi Meeting
 * @category view
 * @description Open a fresh Jitsi room in a compact pop-up and copy the join link for the other people.
 * @tags jitsi, meeting, video, call, room, meet
 * @added 2026-10-28
 * @featured false
 */
(() => {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const room = "bookmarklet-" + Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const url = `https://meet.jit.si/${room}`;
  const popup = window.open(
    url,
    "bl-jitsi-meeting",
    "popup=yes,width=640,height=480,menubar=no,status=no,toolbar=no",
  );

  const copied = navigator.clipboard?.writeText(url);
  if (copied) copied.catch(() => {});
  if (popup) {
    popup.focus?.();
    return;
  }

  // A blocked pop-up cannot be recovered from here, so leave the user with
  // the one thing they need: the room link, ready to paste.
  prompt("Pop-up blocked. Copy the meeting link:", url);
})();
