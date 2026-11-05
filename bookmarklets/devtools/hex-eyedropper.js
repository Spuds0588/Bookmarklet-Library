/**
 * @name 💧 Native Hex EyeDropper
 * @category devtools
 * @description Pick a colour from anywhere on the screen and show its hex value.
 * @tags colour, color, eyedropper, hex, picker
 * @traits offline, self-contained, no-cors, private-safe
 * @added 2026-10-27
 * @featured false
 * @author Thomas Orlita
 * @credit https://github.com/ThomasOrlita/awesome-bookmarklets
 */
(() => {
  new EyeDropper()
    .open()
    .then((picked) => prompt("HEX:", picked.sRGBHex))
    .catch((error) => alert(error));
})();
