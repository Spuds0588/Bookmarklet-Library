/**
 * @name ⏩ Training Video Speeder
 * @category view
 * @description Set every video on the page to play at 2× speed.
 * @tags video, speed, playback, training
 * @added 2026-10-27
 * @featured false
 * @author Community snippet
 * @credit https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/playbackRate
 */
document.querySelectorAll("video").forEach((video) => {
  video.playbackRate = 2;
});
void 0;
