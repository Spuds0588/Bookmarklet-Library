/**
 * @name 🔳 QR code
 * @category text
 * @description Turn the page URL or any text into a QR code, then download or copy it as a PNG or SVG.
 * @tags qr, qr code, barcode, url, share, png, svg, clipboard
 * @added 2026-10-28
 * @featured false
 */
(() => {
  // QR matrix encoder: qr.js 0.0.0 by Roman Shtylman, MIT, bundled from
  // https://github.com/shtylman/qr.js — itself repackaged from Kazuhiko Arase's
  // qrcode-generator (http://www.d-project.com/), also MIT. The bundle is code
  // in this file, not a network dependency.
  var QR=(()=>{var T=(t,e)=>()=>{try{return e||t((e={exports:{}}).exports,e),e.exports}catch(n){throw e=0,n}};var C=T((f1,y)=>{y.exports={MODE_NUMBER:1,MODE_ALPHA_NUM:2,MODE_8BIT_BYTE:4,MODE_KANJI:8}});var H=T((l1,x)=>{var n1=C();function O(t){this.mode=n1.MODE_8BIT_BYTE,this.data=t}O.prototype={getLength:function(t){return this.data.length},write:function(t){for(var e=0;e<this.data.length;e++)t.put(this.data.charCodeAt(e),8)}};x.exports=O});var M=T((g1,S)=>{S.exports={L:1,M:0,Q:3,H:2}});var K=T((v1,G)=>{var D=M();function d(t,e){this.totalCount=t,this.dataCount=e}d.RS_BLOCK_TABLE=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]];d.getRSBlocks=function(t,e){var n=d.getRsBlockTable(t,e);if(n==null)throw new Error("bad rs block @ typeNumber:"+t+"/errorCorrectLevel:"+e);for(var r=n.length/3,a=new Array,i=0;i<r;i++)for(var s=n[i*3+0],o=n[i*3+1],h=n[i*3+2],g=0;g<s;g++)a.push(new d(o,h));return a};d.getRsBlockTable=function(t,e){switch(e){case D.L:return d.RS_BLOCK_TABLE[(t-1)*4+0];case D.M:return d.RS_BLOCK_TABLE[(t-1)*4+1];case D.Q:return d.RS_BLOCK_TABLE[(t-1)*4+2];case D.H:return d.RS_BLOCK_TABLE[(t-1)*4+3];default:return}};G.exports=d});var X=T((E1,U)=>{function Q(){this.buffer=new Array,this.length=0}Q.prototype={get:function(t){var e=Math.floor(t/8);return(this.buffer[e]>>>7-t%8&1)==1},put:function(t,e){for(var n=0;n<e;n++)this.putBit((t>>>e-n-1&1)==1)},getLengthInBits:function(){return this.length},putBit:function(t){var e=Math.floor(this.length/8);this.buffer.length<=e&&this.buffer.push(0),t&&(this.buffer[e]|=128>>>this.length%8),this.length++}};U.exports=Q});var w=T((m1,Y)=>{var m={glog:function(t){if(t<1)throw new Error("glog("+t+")");return m.LOG_TABLE[t]},gexp:function(t){for(;t<0;)t+=255;for(;t>=256;)t-=255;return m.EXP_TABLE[t]},EXP_TABLE:new Array(256),LOG_TABLE:new Array(256)};for(f=0;f<8;f++)m.EXP_TABLE[f]=1<<f;var f;for(f=8;f<256;f++)m.EXP_TABLE[f]=m.EXP_TABLE[f-4]^m.EXP_TABLE[f-5]^m.EXP_TABLE[f-6]^m.EXP_TABLE[f-8];var f;for(f=0;f<255;f++)m.LOG_TABLE[m.EXP_TABLE[f]]=f;var f;Y.exports=m});var R=T((T1,J)=>{var P=w();function _(t,e){if(t.length==null)throw new Error(t.length+"/"+e);for(var n=0;n<t.length&&t[n]==0;)n++;this.num=new Array(t.length-n+e);for(var r=0;r<t.length-n;r++)this.num[r]=t[r+n]}_.prototype={get:function(t){return this.num[t]},getLength:function(){return this.num.length},multiply:function(t){for(var e=new Array(this.getLength()+t.getLength()-1),n=0;n<this.getLength();n++)for(var r=0;r<t.getLength();r++)e[n+r]^=P.gexp(P.glog(this.get(n))+P.glog(t.get(r)));return new _(e,0)},mod:function(t){if(this.getLength()-t.getLength()<0)return this;for(var e=P.glog(this.get(0))-P.glog(t.get(0)),n=new Array(this.getLength()),r=0;r<this.getLength();r++)n[r]=this.get(r);for(var r=0;r<t.getLength();r++)n[r]^=P.gexp(P.glog(t.get(r))+e);return new _(n,0).mod(t)}};J.exports=_});var V=T((d1,z)=>{var E=C(),F=R(),a1=w(),L={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7},l={PATTERN_POSITION_TABLE:[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],G15:1335,G18:7973,G15_MASK:21522,getBCHTypeInfo:function(t){for(var e=t<<10;l.getBCHDigit(e)-l.getBCHDigit(l.G15)>=0;)e^=l.G15<<l.getBCHDigit(e)-l.getBCHDigit(l.G15);return(t<<10|e)^l.G15_MASK},getBCHTypeNumber:function(t){for(var e=t<<12;l.getBCHDigit(e)-l.getBCHDigit(l.G18)>=0;)e^=l.G18<<l.getBCHDigit(e)-l.getBCHDigit(l.G18);return t<<12|e},getBCHDigit:function(t){for(var e=0;t!=0;)e++,t>>>=1;return e},getPatternPosition:function(t){return l.PATTERN_POSITION_TABLE[t-1]},getMask:function(t,e,n){switch(t){case L.PATTERN000:return(e+n)%2==0;case L.PATTERN001:return e%2==0;case L.PATTERN010:return n%3==0;case L.PATTERN011:return(e+n)%3==0;case L.PATTERN100:return(Math.floor(e/2)+Math.floor(n/3))%2==0;case L.PATTERN101:return e*n%2+e*n%3==0;case L.PATTERN110:return(e*n%2+e*n%3)%2==0;case L.PATTERN111:return(e*n%3+(e+n)%2)%2==0;default:throw new Error("bad maskPattern:"+t)}},getErrorCorrectPolynomial:function(t){for(var e=new F([1],0),n=0;n<t;n++)e=e.multiply(new F([1,a1.gexp(n)],0));return e},getLengthInBits:function(t,e){if(1<=e&&e<10)switch(t){case E.MODE_NUMBER:return 10;case E.MODE_ALPHA_NUM:return 9;case E.MODE_8BIT_BYTE:return 8;case E.MODE_KANJI:return 8;default:throw new Error("mode:"+t)}else if(e<27)switch(t){case E.MODE_NUMBER:return 12;case E.MODE_ALPHA_NUM:return 11;case E.MODE_8BIT_BYTE:return 16;case E.MODE_KANJI:return 10;default:throw new Error("mode:"+t)}else if(e<41)switch(t){case E.MODE_NUMBER:return 14;case E.MODE_ALPHA_NUM:return 13;case E.MODE_8BIT_BYTE:return 16;case E.MODE_KANJI:return 12;default:throw new Error("mode:"+t)}else throw new Error("type:"+e)},getLostPoint:function(t){for(var e=t.getModuleCount(),n=0,r=0;r<e;r++)for(var a=0;a<e;a++){for(var i=0,s=t.isDark(r,a),o=-1;o<=1;o++)if(!(r+o<0||e<=r+o))for(var h=-1;h<=1;h++)a+h<0||e<=a+h||o==0&&h==0||s==t.isDark(r+o,a+h)&&i++;i>5&&(n+=3+i-5)}for(var r=0;r<e-1;r++)for(var a=0;a<e-1;a++){var g=0;t.isDark(r,a)&&g++,t.isDark(r+1,a)&&g++,t.isDark(r,a+1)&&g++,t.isDark(r+1,a+1)&&g++,(g==0||g==4)&&(n+=3)}for(var r=0;r<e;r++)for(var a=0;a<e-6;a++)t.isDark(r,a)&&!t.isDark(r,a+1)&&t.isDark(r,a+2)&&t.isDark(r,a+3)&&t.isDark(r,a+4)&&!t.isDark(r,a+5)&&t.isDark(r,a+6)&&(n+=40);for(var a=0;a<e;a++)for(var r=0;r<e-6;r++)t.isDark(r,a)&&!t.isDark(r+1,a)&&t.isDark(r+2,a)&&t.isDark(r+3,a)&&t.isDark(r+4,a)&&!t.isDark(r+5,a)&&t.isDark(r+6,a)&&(n+=40);for(var u=0,a=0;a<e;a++)for(var r=0;r<e;r++)t.isDark(r,a)&&u++;var p=Math.abs(100*u/e/e-50)/5;return n+=p*10,n}};z.exports=l});var q=T((B1,$)=>{var i1=H(),W=K(),Z=X(),A=V(),o1=R();function B(t,e){this.typeNumber=t,this.errorCorrectLevel=e,this.modules=null,this.moduleCount=0,this.dataCache=null,this.dataList=[]}var v=B.prototype;v.addData=function(t){var e=new i1(t);this.dataList.push(e),this.dataCache=null};v.isDark=function(t,e){if(t<0||this.moduleCount<=t||e<0||this.moduleCount<=e)throw new Error(t+","+e);return this.modules[t][e]};v.getModuleCount=function(){return this.moduleCount};v.make=function(){if(this.typeNumber<1){var t=1;for(t=1;t<40;t++){for(var e=W.getRSBlocks(t,this.errorCorrectLevel),n=new Z,r=0,a=0;a<e.length;a++)r+=e[a].dataCount;for(var a=0;a<this.dataList.length;a++){var i=this.dataList[a];n.put(i.mode,4),n.put(i.getLength(),A.getLengthInBits(i.mode,t)),i.write(n)}if(n.getLengthInBits()<=r*8)break}this.typeNumber=t}this.makeImpl(!1,this.getBestMaskPattern())};v.makeImpl=function(t,e){this.moduleCount=this.typeNumber*4+17,this.modules=new Array(this.moduleCount);for(var n=0;n<this.moduleCount;n++){this.modules[n]=new Array(this.moduleCount);for(var r=0;r<this.moduleCount;r++)this.modules[n][r]=null}this.setupPositionProbePattern(0,0),this.setupPositionProbePattern(this.moduleCount-7,0),this.setupPositionProbePattern(0,this.moduleCount-7),this.setupPositionAdjustPattern(),this.setupTimingPattern(),this.setupTypeInfo(t,e),this.typeNumber>=7&&this.setupTypeNumber(t),this.dataCache==null&&(this.dataCache=B.createData(this.typeNumber,this.errorCorrectLevel,this.dataList)),this.mapData(this.dataCache,e)};v.setupPositionProbePattern=function(t,e){for(var n=-1;n<=7;n++)if(!(t+n<=-1||this.moduleCount<=t+n))for(var r=-1;r<=7;r++)e+r<=-1||this.moduleCount<=e+r||(0<=n&&n<=6&&(r==0||r==6)||0<=r&&r<=6&&(n==0||n==6)||2<=n&&n<=4&&2<=r&&r<=4?this.modules[t+n][e+r]=!0:this.modules[t+n][e+r]=!1)};v.getBestMaskPattern=function(){for(var t=0,e=0,n=0;n<8;n++){this.makeImpl(!0,n);var r=A.getLostPoint(this);(n==0||t>r)&&(t=r,e=n)}return e};v.createMovieClip=function(t,e,n){var r=t.createEmptyMovieClip(e,n),a=1;this.make();for(var i=0;i<this.modules.length;i++)for(var s=i*a,o=0;o<this.modules[i].length;o++){var h=o*a,g=this.modules[i][o];g&&(r.beginFill(0,100),r.moveTo(h,s),r.lineTo(h+a,s),r.lineTo(h+a,s+a),r.lineTo(h,s+a),r.endFill())}return r};v.setupTimingPattern=function(){for(var t=8;t<this.moduleCount-8;t++)this.modules[t][6]==null&&(this.modules[t][6]=t%2==0);for(var e=8;e<this.moduleCount-8;e++)this.modules[6][e]==null&&(this.modules[6][e]=e%2==0)};v.setupPositionAdjustPattern=function(){for(var t=A.getPatternPosition(this.typeNumber),e=0;e<t.length;e++)for(var n=0;n<t.length;n++){var r=t[e],a=t[n];if(this.modules[r][a]==null)for(var i=-2;i<=2;i++)for(var s=-2;s<=2;s++)i==-2||i==2||s==-2||s==2||i==0&&s==0?this.modules[r+i][a+s]=!0:this.modules[r+i][a+s]=!1}};v.setupTypeNumber=function(t){for(var e=A.getBCHTypeNumber(this.typeNumber),n=0;n<18;n++){var r=!t&&(e>>n&1)==1;this.modules[Math.floor(n/3)][n%3+this.moduleCount-8-3]=r}for(var n=0;n<18;n++){var r=!t&&(e>>n&1)==1;this.modules[n%3+this.moduleCount-8-3][Math.floor(n/3)]=r}};v.setupTypeInfo=function(t,e){for(var n=this.errorCorrectLevel<<3|e,r=A.getBCHTypeInfo(n),a=0;a<15;a++){var i=!t&&(r>>a&1)==1;a<6?this.modules[a][8]=i:a<8?this.modules[a+1][8]=i:this.modules[this.moduleCount-15+a][8]=i}for(var a=0;a<15;a++){var i=!t&&(r>>a&1)==1;a<8?this.modules[8][this.moduleCount-a-1]=i:a<9?this.modules[8][15-a-1+1]=i:this.modules[8][15-a-1]=i}this.modules[this.moduleCount-8][8]=!t};v.mapData=function(t,e){for(var n=-1,r=this.moduleCount-1,a=7,i=0,s=this.moduleCount-1;s>0;s-=2)for(s==6&&s--;;){for(var o=0;o<2;o++)if(this.modules[r][s-o]==null){var h=!1;i<t.length&&(h=(t[i]>>>a&1)==1);var g=A.getMask(e,r,s-o);g&&(h=!h),this.modules[r][s-o]=h,a--,a==-1&&(i++,a=7)}if(r+=n,r<0||this.moduleCount<=r){r-=n,n=-n;break}}};B.PAD0=236;B.PAD1=17;B.createData=function(t,e,n){for(var r=W.getRSBlocks(t,e),a=new Z,i=0;i<n.length;i++){var s=n[i];a.put(s.mode,4),a.put(s.getLength(),A.getLengthInBits(s.mode,t)),s.write(a)}for(var o=0,i=0;i<r.length;i++)o+=r[i].dataCount;if(a.getLengthInBits()>o*8)throw new Error("code length overflow. ("+a.getLengthInBits()+">"+o*8+")");for(a.getLengthInBits()+4<=o*8&&a.put(0,4);a.getLengthInBits()%8!=0;)a.putBit(!1);for(;!(a.getLengthInBits()>=o*8||(a.put(B.PAD0,8),a.getLengthInBits()>=o*8));)a.put(B.PAD1,8);return B.createBytes(a,r)};B.createBytes=function(t,e){for(var n=0,r=0,a=0,i=new Array(e.length),s=new Array(e.length),o=0;o<e.length;o++){var h=e[o].dataCount,g=e[o].totalCount-h;r=Math.max(r,h),a=Math.max(a,g),i[o]=new Array(h);for(var u=0;u<i[o].length;u++)i[o][u]=255&t.buffer[u+n];n+=h;var p=A.getErrorCorrectPolynomial(g),r1=new o1(i[o],p.getLength()-1),N=r1.mod(p);s[o]=new Array(p.getLength()-1);for(var u=0;u<s[o].length;u++){var k=u+N.getLength()-s[o].length;s[o][u]=k>=0?N.get(k):0}}for(var I=0,u=0;u<e.length;u++)I+=e[u].totalCount;for(var c=new Array(I),b=0,u=0;u<r;u++)for(var o=0;o<e.length;o++)u<i[o].length&&(c[b++]=i[o][u]);for(var u=0;u<a;u++)for(var o=0;o<e.length;o++)u<s[o].length&&(c[b++]=s[o][u]);return c};$.exports=B});var u1=T((L1,e1)=>{var s1=q(),j=M(),t1=function(t,e){e=e||{};var n=new s1(e.typeNumber||-1,e.errorCorrectLevel||j.H);return n.addData(t),n.make(),n};t1.ErrorCorrectLevel=j;e1.exports=t1});return u1();})();

  const ID = "bl-qr-host";
  const DEFAULT_STATUS = "Esc closes · nothing leaves this page.";
  const EMPTY = '<div class="empty">Type a URL or some text.</div>';
  const TOO_LONG = '<div class="empty">Too much text for one code.</div>';

  const escapeXml = (value) =>
    String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

  // A QR byte segment is a sequence of bytes, not JavaScript characters. Encode
  // UTF-8 first, then hand the encoder one Latin-1 character per byte so text
  // with accents or emoji survives the trip.
  function latin1(text) {
    const bytes = new TextEncoder().encode(text);
    let out = "";
    for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
    return out;
  }

  function makeCode(text) {
    if (!text || !text.trim()) throw new Error("empty");
    const bytes = new TextEncoder().encode(text);
    const qr = QR(latin1(text), { typeNumber: -1, errorCorrectLevel: QR.ErrorCorrectLevel.Q });
    return { count: qr.moduleCount, version: qr.typeNumber, bytes: bytes.length, modules: qr.modules };
  }

  // One path of horizontal runs keeps the SVG small and still crisp. The four
  // module quiet zone is part of the image, so the code scans after download.
  function svg(code, label = "QR code") {
    const quiet = 4;
    const side = code.count + quiet * 2;
    let path = "";
    for (let row = 0; row < code.count; row++) {
      let column = 0;
      while (column < code.count) {
        if (!code.modules[row][column]) {
          column++;
          continue;
        }
        const start = column;
        while (column < code.count && code.modules[row][column]) column++;
        path += `M${start + quiet} ${row + quiet}h${column - start}v1h-${column - start}z`;
      }
    }
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}" width="1024" height="1024" ` +
      `shape-rendering="crispEdges" role="img" aria-label="${escapeXml(label)}">` +
      `<rect width="${side}" height="${side}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`
    );
  }

  function fileName(kind, text) {
    let base = "";
    try {
      const url = new URL(String(text).trim());
      if (url.protocol === "http:" || url.protocol === "https:") base = url.hostname.replace(/^www\./i, "");
    } catch {}
    base = base.replace(/[^a-z0-9.-]+/gi, "-").replace(/^[.-]+|[.-]+$/g, "").slice(0, 50);
    return `${base ? `qr-${base}` : "qr-code"}.${kind}`;
  }

  if (globalThis.__BL_TEST__) {
    globalThis.__BL_TEST__.QR = { makeCode, svg, fileName };
    return;
  }

  const existing = document.getElementById(ID);
  if (existing?.__blQrClose) {
    existing.__blQrClose();
    return;
  }

  const CSS = `
    :host{all:initial;display:block;position:fixed;inset:0;z-index:2147483647;color-scheme:light dark;font:14px/1.45 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;--ink:#111;--paper:#fff;--muted:#666;--line:#d5d5d5;--scrim:rgba(0,0,0,.52)}
    @media(prefers-color-scheme:dark){:host{--ink:#f5f5f5;--paper:#111;--muted:#a3a3a3;--line:#3a3a3a;--scrim:rgba(0,0,0,.72)}}
    *{box-sizing:border-box}
    [hidden]{display:none!important}
    .scrim{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:20px;background:var(--scrim);overflow:auto}
    .panel{width:min(720px,100%);max-height:calc(100vh - 40px);display:flex;flex-direction:column;background:var(--paper);color:var(--ink);border:1px solid var(--ink);box-shadow:0 24px 80px rgba(0,0,0,.35);outline:none}
    header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:18px 20px 14px;border-bottom:1px solid var(--line)}
    .kicker{margin:0 0 4px;font:10px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.14em;text-transform:uppercase;opacity:.62}
    h2{margin:0;font-size:20px;line-height:1.2;font-weight:600}
    button{font:inherit;color:inherit}
    .close{width:32px;height:32px;flex:none;border:1px solid var(--line);background:transparent;font-size:20px;line-height:1;cursor:pointer}
    .close:hover{border-color:currentColor}
    .body{display:grid;grid-template-columns:248px 1fr;gap:22px;padding:20px;overflow:auto}
    .preview-wrap{display:flex;flex-direction:column;gap:8px}
    .preview{width:248px;height:248px;padding:10px;background:#fff;border:1px solid var(--line);display:flex;align-items:center;justify-content:center}
    .preview svg{width:100%;height:100%;display:block}
    .empty{font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;text-align:center;color:#666;padding:18px}
    .preview-note{margin:0;font:10px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.08em;text-transform:uppercase;opacity:.55;text-align:center}
    .controls{display:flex;flex-direction:column;min-width:0}
    .label-row{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:6px}
    .label{font:10px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.14em;text-transform:uppercase;opacity:.62}
    .link{border:0;padding:0;background:transparent;font-size:11px;text-decoration:underline;text-underline-offset:2px;cursor:pointer;opacity:.75}
    .link:hover{opacity:1}
    textarea{width:100%;min-height:94px;max-height:180px;resize:vertical;border:1px solid var(--line);background:var(--paper);color:var(--ink);padding:9px 10px;font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;outline:none}
    textarea:focus{border-color:var(--ink);box-shadow:0 0 0 1px var(--ink)}
    .meta{margin:8px 0 0;min-height:17px;font:10px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;opacity:.62}
    .error{margin:8px 0 0;font-size:11px;line-height:1.4;color:#a11}
    @media(prefers-color-scheme:dark){.error{color:#ff8d8d}}
    .actions{display:flex;flex-direction:column;gap:8px;margin-top:auto;padding-top:18px}
    .download-row{display:flex;gap:8px;align-items:stretch}
    .download-row .btn{flex:1;min-width:0}
    .download-row .copy{flex:none;width:62px;justify-content:center;padding-left:8px;padding-right:8px}
    .btn{display:flex;align-items:baseline;justify-content:space-between;gap:12px;border:1px solid var(--line);background:transparent;padding:9px 12px;font-size:12px;font-weight:600;cursor:pointer;text-align:left}
    .btn small{font:10px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-weight:400;opacity:.6}
    .btn:hover:not(:disabled){border-color:currentColor}
    .btn:disabled{opacity:.4;cursor:not-allowed}
    .primary{background:var(--ink);border-color:var(--ink);color:var(--paper)}
    .primary small{opacity:.65}
    footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 20px;border-top:1px solid var(--line)}
    .note{font:10px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;opacity:.62}
    .ghost{border:0;background:transparent;padding:2px 0;font-size:12px;text-decoration:underline;text-underline-offset:2px;cursor:pointer}
    @media(max-width:640px){.body{grid-template-columns:1fr;gap:16px}.preview-wrap{width:100%;max-width:260px;margin:0 auto}.preview{width:100%;height:auto;aspect-ratio:1}header,.body,footer{padding-left:14px;padding-right:14px}}
  `;

  const previousFocus = document.activeElement;
  const host = document.createElement("div");
  host.id = ID;
  host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483647;";
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: "open" });

  if ("adoptedStyleSheets" in root && typeof CSSStyleSheet === "function") {
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(CSS);
      root.adoptedStyleSheets = [sheet];
    } catch {}
  }
  if (!root.adoptedStyleSheets?.length) {
    const style = document.createElement("style");
    style.textContent = CSS;
    root.appendChild(style);
  }

  root.innerHTML = `
    <div class="scrim" data-scrim>
      <section class="panel" role="dialog" aria-modal="true" aria-label="QR code" tabindex="-1">
        <header>
          <div>
            <p class="kicker">GENERATOR</p>
            <h2>QR code</h2>
          </div>
          <button class="close" type="button" data-close aria-label="Close">×</button>
        </header>
        <div class="body">
          <div class="preview-wrap">
            <div class="preview" data-preview></div>
            <p class="preview-note">Scan with a phone camera</p>
          </div>
          <div class="controls">
            <div class="label-row">
              <label class="label" for="bl-qr-text">Page URL or text</label>
              <button class="link" type="button" data-page-url>Use page URL</button>
            </div>
            <textarea id="bl-qr-text" data-input rows="3" spellcheck="false" autocapitalize="off" autocorrect="off" aria-label="Page URL or text"></textarea>
            <p class="meta" data-meta></p>
            <p class="error" data-error role="alert" hidden></p>
            <div class="actions">
              <div class="download-row">
                <button class="btn primary" type="button" data-png><span>Download PNG</span><small>~1024 px raster</small></button>
                <button class="btn copy" type="button" data-copy-png aria-label="Copy PNG to clipboard" title="Copy PNG">Copy</button>
              </div>
              <div class="download-row">
                <button class="btn" type="button" data-svg><span>Download SVG</span><small>Vector, any size</small></button>
                <button class="btn copy" type="button" data-copy-svg aria-label="Copy SVG to clipboard" title="Copy SVG">Copy</button>
              </div>
            </div>
          </div>
        </div>
        <footer>
          <span class="note" data-status aria-live="polite">${DEFAULT_STATUS}</span>
          <button class="ghost" type="button" data-close>Close</button>
        </footer>
      </section>
    </div>
  `;

  const panel = root.querySelector(".panel");
  const input = root.querySelector("[data-input]");
  const preview = root.querySelector("[data-preview]");
  const meta = root.querySelector("[data-meta]");
  const error = root.querySelector("[data-error]");
  const status = root.querySelector("[data-status]");
  const actions = [...root.querySelectorAll("[data-png], [data-svg], [data-copy-png], [data-copy-svg]")];
  let model = null;
  let renderTimer = 0;
  let statusTimer = 0;

  function resetStatus() {
    clearTimeout(statusTimer);
    status.textContent = DEFAULT_STATUS;
    delete status.dataset.tone;
  }

  function setStatus(message, tone = "") {
    clearTimeout(statusTimer);
    status.textContent = message;
    status.dataset.tone = tone;
    statusTimer = setTimeout(resetStatus, 5000);
  }

  function render() {
    const text = input.value;
    if (!text.trim()) {
      model = null;
      preview.innerHTML = EMPTY;
      meta.textContent = "";
      error.hidden = true;
      for (const button of actions) button.disabled = true;
      return;
    }
    try {
      model = makeCode(text);
      preview.innerHTML = svg(model);
      meta.textContent = `${model.count} × ${model.count} modules · v${model.version} · ${model.bytes} bytes · ECC Q`;
      error.hidden = true;
      for (const button of actions) button.disabled = false;
    } catch {
      model = null;
      preview.innerHTML = TOO_LONG;
      meta.textContent = "";
      error.textContent = "That is too much for one QR code. Shorten the text and try again.";
      error.hidden = false;
      for (const button of actions) button.disabled = true;
    }
  }

  function currentCode() {
    clearTimeout(renderTimer);
    render();
    return model;
  }

  function saveBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    setStatus(`${name} is downloading.`, "ok");
  }

  function pngBlob(code) {
    return new Promise((resolve, reject) => {
      const scale = Math.max(4, Math.floor(1024 / (code.count + 8)));
      const size = (code.count + 8) * scale;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("canvas unavailable"));
        return;
      }
      context.fillStyle = "#fff";
      context.fillRect(0, 0, size, size);
      context.fillStyle = "#000";
      for (let row = 0; row < code.count; row++) {
        for (let column = 0; column < code.count; column++) {
          if (!code.modules[row][column]) continue;
          context.fillRect((column + 4) * scale, (row + 4) * scale, scale, scale);
        }
      }
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("png unavailable"))), "image/png");
    });
  }

  async function downloadPng() {
    const text = input.value;
    const code = currentCode();
    if (!code) return;
    try {
      saveBlob(await pngBlob(code), fileName("png", text));
    } catch {
      setStatus("The PNG could not be made.", "error");
    }
  }

  function downloadSvg() {
    const text = input.value;
    const code = currentCode();
    if (!code) return;
    saveBlob(new Blob([svg(code)], { type: "image/svg+xml;charset=utf-8" }), fileName("svg", text));
  }

  async function copyPng() {
    const code = currentCode();
    if (!code) return;
    if (!navigator.clipboard?.write || typeof ClipboardItem !== "function") {
      setStatus("This browser cannot copy images. Download the PNG instead.", "error");
      return;
    }
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob(code) })]);
      setStatus("PNG copied to the clipboard.", "ok");
    } catch {
      setStatus("Could not copy the PNG. Download it instead.", "error");
    }
  }

  async function copySvg() {
    const code = currentCode();
    if (!code) return;
    const markup = svg(code);
    if (navigator.clipboard?.write && typeof ClipboardItem === "function") {
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/svg+xml": new Blob([markup], { type: "image/svg+xml" }) })]);
        setStatus("SVG copied to the clipboard.", "ok");
        return;
      } catch {}
    }
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(markup);
      setStatus("SVG markup copied to the clipboard.", "ok");
    } catch {
      setStatus("Could not copy the SVG. Download it instead.", "error");
    }
  }

  function close() {
    document.removeEventListener("keydown", onKey, true);
    host.remove();
    delete host.__blQrClose;
    if (previousFocus?.isConnected && typeof previousFocus.focus === "function") {
      previousFocus.focus({ preventScroll: true });
    }
  }

  function onKey(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...root.querySelectorAll("button, textarea")].filter((element) => !element.disabled);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    const current = root.activeElement;
    if (event.shiftKey && (current === first || current === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  }

  for (const button of root.querySelectorAll("[data-close]")) button.addEventListener("click", close);
  root.querySelector("[data-png]").addEventListener("click", downloadPng);
  root.querySelector("[data-svg]").addEventListener("click", downloadSvg);
  root.querySelector("[data-copy-png]").addEventListener("click", copyPng);
  root.querySelector("[data-copy-svg]").addEventListener("click", copySvg);
  root.querySelector("[data-page-url]").addEventListener("click", () => {
    input.value = location.href;
    resetStatus();
    render();
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  });
  root.querySelector("[data-scrim]").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) close();
  });
  input.addEventListener("input", () => {
    resetStatus();
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 90);
  });
  document.addEventListener("keydown", onKey, true);
  host.__blQrClose = close;

  input.value = location.href;
  render();
  panel.focus({ preventScroll: true });
})();
