/**
 * @name 🎦 Join Zoom in browser
 * @category view
 * @description Turn a Zoom meeting link into a browser join URL.
 * @tags zoom, meeting, join
 * @added 2026-10-17
 * @featured false
 */
void function(){javascript:(function(){try{const a=new URL(window.location.href);if(!a.hostname.includes("zoom."))return void alert("Not a recognized Zoom domain. Please run this on a Zoom meeting page.");let b=null;const c=a.pathname.match(/\/(?:j|w|my|jc|launch\/jc)\/([a-zA-Z0-9._-]+)/i);if(c&&c[1])b=c[1];else{const c=a.pathname.match(/\/(\d{9,11})/);c&&c[1]&&(b=c[1])}if(!b)return void alert("Could not detect a Zoom Meeting ID in the current URL.");const d=new URL(a.origin);d.pathname=`/wc/join/${b}`,d.search=a.search,window.location.href=d.toString()}catch(a){console.error("Zoom Web Client Bookmarklet Error:",a),alert("An error occurred running the bookmarklet. Check the console for details.")}})()}();
