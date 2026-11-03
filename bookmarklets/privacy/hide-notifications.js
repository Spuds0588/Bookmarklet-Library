/**
 * @name 🔕 Hide notifications
 * @category privacy
 * @description Hide toast and notification overlays before taking a screenshot.
 * @tags notifications, toast, clean screenshot
 * @traits offline, self-contained, no-cors, private-safe
 * @added 2026-10-17
 * @featured false
 */
void function(){document.head.appendChild(document.createElement("style")).innerHTML=".toast-wrapper { display: none !important; }"}();
