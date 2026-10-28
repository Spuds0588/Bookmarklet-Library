/**
 * @name 💧 Native Hex EyeDropper
 * @category devtools
 * @description Pick a colour from anywhere on the screen and show its hex value.
 * @tags colour, color, eyedropper, hex, picker
 * @added 2026-10-27
 * @featured false
 * @author Thomas Orlita
 * @credit https://github.com/ThomasOrlita/awesome-bookmarklets
 */
void (async () => {
  try {
    prompt("HEX:", (await new EyeDropper().open()).sRGBHex);
  } catch (error) {
    alert(error);
  }
})();
