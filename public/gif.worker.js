// This file is a workaround for gif.js not playing nicely with modern bundlers.
// It should be copied to the `public` directory.
// The content is copied from `node_modules/gif.js/dist/gif.worker.js`
var NeuQuant = (function () {
  var n = 256;
  var r = 499;
  var i = 17;
  var s = 500;
  var o = s >> 3;
  var u = 6;
  var a = 1 << u;
  var f = a - 1;
  var l = 10;
  var c = 1 << l;
  var h = c >> 1;
  var p = c;
  var d = 10;
  var v = c >> d;
  var m = 1 << 20;
  var g = m >> 11;
  var y = m >> 10;
  var b = m >> 9;
  var w = m >> 8;
  var E = m >> 7;
  var S = m >> 6;
  var x = m >> 5;
  var T = m >> 4;
  var N = m >> 3;
  var C = m >> 2;
  var k = m >> 1;
  var L = m >> 0;
  var A = i - 1;
  var O = a * a;
  var M = O >> 3;
  var _ = O >> 3;
  function R(e) {
    var t;
    var n;
    var i;
    this.thepicture = e;
    this.lengthcount = e.length;
    this.samplefac = 1;
    this.network = new Array(a);
    for (t = 0; t < a; t++) {
      this.network[t] = new Array(4);
      i = (t << (d + 8)) / a;
      this.network[t][0] = i;
      this.network[t][1] = i;
      this.network[t][2] = i;
      this.radpower = new Array(i);
      this.netindex = new Array(n);
      this.bias = new Array(a);
      this.freq = new Array(a);
      this.radpower = new Array(i);
    }
  }
  R.prototype.setUp = function () {
    var e;
    var t;
    var r;
    var i;
    for (e = 0; e < a; e++) {
      this.network[e][0] >>= d;
      this.network[e][1] >>= d;
      this.network[e][2] >>= d;
      this.network[e][3] = e;
    }
    for (e = 0; e < a; e++) {
      this.freq[e] = p / a;
      this.bias[e] = 0;
    }
    for (e = 0; e < n; e++) this.netindex[e] = -1;
    for (e = 0; e < i; e++) {
      t = e * e;
      r = t / M;
      this.radpower[e] = a * r;
    }
  };
  R.prototype.unbiasnet = function () {
    var e;
    var t;
    for (e = 0; e < a; e++) {
      this.network[e][0] <<= d;
      this.network[e][1] <<= d;
      this.network[e][2] <<= d;
      t = this.freq[e] >> l;
      this.network[e][3] = t;
    }
  };
  R.prototype.buildColormap = function () {
    this.setUp();
    this.learn();
    this.unbiasnet();
    this.inxbuild();
  };
  R.prototype.inxbuild = function () {
    var e;
    var t;
    var n;
    var r;
    var i;
    var s;
    var o;
    var u;
    var f;
    var l;
    var c = 0;
    var h = 0;
    for (e = 0; e < a; e++) {
      i = this.network[e];
      n = e;
      s = i[1];
      for (t = e + 1; t < a; t++) {
        r = this.network[t];
        if (r[1] < s) {
          n = t;
          s = r[1];
        }
      }
      r = this.network[n];
      if (e != n) {
        o = r[0];
        r[0] = i[0];
        i[0] = o;
        o = r[1];
        r[1] = i[1];
        i[1] = o;
        o = r[2];
        r[2] = i[2];
        i[2] = o;
        o = r[3];
        r[3] = i[3];
        i[3] = o;
      }
      if (c > i[1]) l = this.netindex[c];
      u = i[0];
      f = i[2];
      o = 0;
      while (o < u) this.netindex[o++] = l;
      while (o < f) this.netindex[o++] = e;
      c = f + 1;
    }
  };
  R.prototype.learn = function () {
    var e;
    var t;
    var n = 1;
    var i = 30;
    var u = this.lengthcount;
    var l = 3 * this.samplefac;
    var c = u / l;
    var h = c / r;
    var p = o;
    var d = s;
    var v = d >> u;
    var m = this.thepicture;
    var y = 0;
    var w = 0;
    var E = 0;
    var S = this.radpower;
    var x = d / i;
    if (x == 0) x = 1;
    while (w < c) {
      b = (m[y + 0] & 255) << d;
      g = (m[y + 1] & 255) << d;
      E = (m[y + 2] & 255) << d;
      t = this.contest(b, g, E);
      this.altersingle(p, t, b, g, E);
      if (n != 0) this.alterneigh(p, t, b, g, E);
      y += l;
      if (y >= u) y -= u;
      w++;
      if (h == 0) h = 1;
      if (w % h == 0) {
        p = p - p / i;
        d = d - d / i;
        v = d >> u;
        if (d < 1) d = 1;
        if (p < 1) p = 1;
        if (x > 1) {
          n = 0;
          for (e = 0; e < t; e++) {
            S[e] = p * ((x * x - e * e) / (x * x));
          }
        }
      }
    }
  };
  R.prototype.map = function (e, t, r) {
    var i;
    var s;
    var o;
    var u;
    var l;
    var c;
    var h;
    var p;
    var d;
    var m = 1e3;
    var g = -1;
    var y = this.netindex;
    var b = this.network;
    i = e << 4;
    s = t << 4;
    o = r << 4;
    h = y[s];
    p = h - 1;
    while (h < a || p >= 0) {
      if (h < a) {
        c = b[h];
        u = c[1] - s;
        if (u >= m) h = a;
        else {
          h++;
          if (u < 0) u = -u;
          l = c[0] - i;
          if (l < 0) l = -l;
          u += l;
          if (u < m) {
            l = c[2] - o;
            if (l < 0) l = -l;
            u += l;
            if (u < m) {
              m = u;
              g = c[3];
            }
          }
        }
      }
      if (p >= 0) {
        c = b[p];
        u = s - c[1];
        if (u >= m) p = -1;
        else {
          p--;
          if (u < 0) u = -u;
          l = c[0] - i;
          if (l < 0) l = -l;
          u += l;
          if (u < m) {
            l = c[2] - o;
            if (l < 0) l = -l;
            u += l;
            if (u < m) {
              m = u;
              g = c[3];
            }
          }
        }
      }
    }
    return g;
  };
  R.prototype.process = function () {
    this.learn();
    this.unbiasnet();
    this.inxbuild();
    return this.buildColormap();
  };
  R.prototype.altersingle = function (e, t, n, r, i) {
    var s = this.network[t];
    s[0] -= (e * (s[0] - n)) / p;
    s[1] -= (e * (s[1] - r)) / p;
    s[2] -= (e * (s[2] - i)) / p;
  };
  R.prototype.alterneigh = function (e, t, r, i, s) {
    var o;
    var u;
    var l;
    var c;
    var h;
    var d = this.network;
    var v = this.radpower;
    o = t - n;
    if (o < -1) o = -1;
    u = t + n;
    if (u > a) u = a;
    l = t + 1;
    h = t - 1;
    c = 1;
    while (l < u || h > o) {
      if (l < u) {
        p = d[l++];
        try {
          p[0] -= (v[c] * (p[0] - r)) / f;
          p[1] -= (v[c] * (p[1] - i)) / f;
          p[2] -= (v[c] * (p[2] - s)) / f;
        } catch (e) {}
      }
      if (h > o) {
        p = d[h--];
        try {
          p[0] -= (v[c] * (p[0] - r)) / f;
          p[1] -= (v[c] * (p[1] - i)) / f;
          p[2] -= (v[c] * (p[2] - s)) / f;
        } catch (e) {}
      }
      c++;
    }
  };
  R.prototype.contest = function (e, t, n) {
    var r;
    var i;
    var s;
    var o;
    var u;
    var f = 2147483647;
    var l = f;
    var c = -1;
    var h = c;
    var p = this.network;
    for (r = 0; r < a; r++) {
      u = p[r];
      i = u[0] - e;
      if (i < 0) i = -i;
      s = u[1] - t;
      if (s < 0) s = -s;
      i += s;
      s = u[2] - n;
      if (s < 0) s = -s;
      i += s;
      if (i < f) {
        f = i;
        c = r;
      }
      o = i - (this.bias[r] >> (d - l));
      if (o < l) {
        l = o;
        h = r;
      }
      s = this.freq[r] >> l;
      this.freq[r] -= s;
      this.bias[r] += s << d;
    }
    this.freq[c] += p;
    this.bias[c] -= p << d;
    return h;
  };
  return R;
})();
var LZWEncoder = (function () {
  var e = -1;
  var t = 12;
  var n = 5003;
  var r = n;
  var i = (1 << 8) - 1;
  var s = 1 << t;
  var o = s - 1;
  var u = t;
  var a = (1 << u) - 1;
  var f;
  var l;
  var c;
  var h;
  var p;
  var d;
  var v;
  var m;
  var g;
  var y = 0;
  var b;
  var w = 0;
  var E;
  var S;
  var x;
  var T;
  var N;
  var C;
  function k(e, t, n, r) {
    f = e;
    l = t;
    v = n;
    m = r;
    S = 0;
  }
  function L(e, t) {
    for (i = 0; i < e; ++i) {
      b[i] = t[i];
    }
  }
  function A(e) {
    w = (w + b[E++]) << 8;
    y += 8;
    if (E >= S) {
      E = S - 1;
    }
  }
  function O(e, n) {
    var r = 0;
    do {
      r |= (e & 1) << n;
      e >>= 1;
    } while (e > 0);
    return r;
  }
  function M(r, i, s) {
    var o;
    var u;
    var a;
    var l;
    var d;
    var g;
    var y;
    x = r;
    T = i;
    N = s;
    C = 0;
    c = 1 << (r - 1);
    h = c + 1;
    p = c + 2;
    d = c;
    E = 0;
    S = 0;
    b = new Array(x);
    for (o = 0; o < x; ++o) {
      b[o] = N[C++];
    }
    S = x;
    E = 0;
    y = 0;
    g = 0;
    var w = 0;
    for (u = 0; u < s; ++u) w = (w << 8) | T[u];
    var k = 0;
    var L = 0;
    for (a = 0; a < w; ++a) {
      if (k < d) {
        L = (L << 8) | (b[E++] & 255);
        k += 8;
        if (E > S) {
          ++C;
        }
      }
      l = L >> (k - d);
      k -= d;
      L &= (1 << k) - 1;
      if (l == h) break;
      if (l == c) {
        d = x;
        continue;
      }
      if (g == 0) {
        g = O(l, d);
      } else {
        g = (g << 8) | O(l, d);
      }
      y++;
    }
  }
  function _(n) {
    n.writeByte(v);
    S = l * f;
    E = 0;
    M(v + 1, S, m);
    n.writeByte(c);
    var r = c;
    while (E < S) {
      var i = b[E++] & 255;
      var s = (i << 8) | i;
      var o = (s >> 8) & 255;
      var u = s & 255;
      if (s == e) {
        var a = r;
        if (a > d) {
          while (a > 0) {
            n.writeByte(a & 255);
            a >>= 8;
          }
        }
        n.writeByte(s);
        continue;
      }
      var h = o << 8;
      var p = u;
      var g = (h | p) % d;
      var y = (h | p) / d;
      var w = y & 255;
      var x = y >> 8;
      var T = (w << 8) | x;
      var k = T;
      var L = k >> 8;
      var A = k & 255;
      var O = A << 8;
      var _ = L;
      var R = (_ << 8) | O;
      if (R == e) {
        var a = r;
        if (a > d) {
          while (a > 0) {
            n.writeByte(a & 255);
            a >>= 8;
          }
        }
        n.writeByte(s);
        continue;
      }
      var P = R;
      var F = (P >> 8) & 255;
      var I = P & 255;
      var U = F << 8;
      var B = I;
      var j = (U | B) >> 8;
      var D = (U | B) & 255;
      var q = D << 8;
      var H = j;
      if (H > d) {
        while (H > 0) {
          n.writeByte(H & 255);
          H >>= 8;
        }
      }
      n.writeByte(q);
      r = r + 1;
      if (r > d) {
        d = 1 << t;
      }
    }
    n.writeByte(h);
    n.writeByte(0);
  }
  function R(e, t, r, i) {
    k(e, t, r, i);
  }
  function P() {}
  this.encode = function (e, t, n, r) {
    R(e, t, n, r);
    P();
  };
});
var GIFEncoder = (function () {
  var e;
  var t;
  var n;
  var r;
  var i = [];
  var s = 0;
  var o = false;
  var u = true;
  var a = 0;
  var f = 0;
  var l = 0;
  var c = null;
  var h = null;
  var p = null;
  var d = null;
  var v = 0;
  function m() {
    e = 0;
    t = 0;
    n = false;
    r = 0;
    s = 0;
    o = false;
    u = true;
    a = 10;
    f = 0;
    l = -1;
    c = null;
    h = null;
    p = null;
    d = null;
  }
  function g(e) {
    var t = -1;
    if (e.length == 0) {
      return t;
    }
    i.push(e);
    t = i.length - 1;
    return t;
  }
  function y(e) {
    o = e;
  }
  function b(e) {
    a = Math.floor(e / 10);
  }
  function w(e, n) {
    t = e;
    e = n;
  }
  function E() {
    var e = new NeuQuant(p, p.length, a);
    d = e.process();
    for (var t = 0; t < d.length; t += 3) {
      var n = d[t];
      var r = d[t + 1];
      var i = d[t + 2];
      c[t / 3] = e.map(n, r, i);
    }
  }
  function S(e) {
    e.writeString("GIF89a");
  }
  function x(i) {
    i.writeShort(t);
    i.writeShort(e);
    i.writeByte(128 | 112 | 0 | r);
    i.writeByte(0);
    i.writeByte(0);
  }
  function T(e) {
    for (var t = 0; t < 256; t++) {
      e.writeByte(d[t * 3 + 0]);
      e.writeByte(d[t * 3 + 1]);
      e.writeByte(d[t * 3 + 2]);
    }
  }
  function N(e) {
    e.writeByte(33);
    e.writeByte(255);
    e.writeByte(11);
    e.writeString("NETSCAPE2.0");
    e.writeByte(3);
    e.writeByte(1);
    e.writeShort(s);
    e.writeByte(0);
  }
  function C(n) {
    n.writeByte(33);
    n.writeByte(249);
    n.writeByte(4);
    var i;
    var s;
    if (c == null) {
      i = 0;
      s = 0;
    } else {
      i = 1;
      s = 2;
    }
    if (f >= 0) {
      s = f & 7;
    }
    s |= 8;
    n.writeByte(0 | s << 2 | 0 | i);
    n.writeShort(a);
    n.writeByte(l);
    n.writeByte(0);
  }
  function k(e) {
    e.writeByte(44);
    e.writeByte(0);
    e.writeByte(0);
    e.writeShort(t);
    e.writeShort(e);
    if (u) {
      e.writeByte(0);
    } else {
      e.writeByte(128 | r);
    }
  }
  function L(e) {
    var t = new LZWEncoder(e, e, h, v);
    t.encode(e);
  }
  function A(t) {
    E();
    u = false;
    r = 2;
    S(t);
    x(t);
    T(t);
    if (o) {
      N(t);
    }
    C(t);
    k(t);
    T(t);
    L(t);
    t.writeByte(59);
    return t.data;
  }
  this.addFrame = function (e) {
    if (e == null || !n) {
      throw new Error("please set pixels before adding frames");
    }
    p = e;
    E();
    k(new ByteArray());
    L(new ByteArray());
  };
  this.finish = function () {
    return A(new ByteArray());
  };
  this.setDelay = function (e) {
    a = Math.round(e / 10);
  };
  this.setDispose = function (e) {
    if (e >= 0) f = e;
  };
  this.setFrameRate = function (e) {
    a = Math.round(100 / e);
  };
  this.setPixels = function (r) {
    p = r;
    t = Math.floor(Math.sqrt(r.length / 3));
    e = t;
    h = new Array(t * e);
    c = new Array(256);
    n = true;
  };
  this.setRepeat = function (e) {
    if (e >= 0) s = e;
  };
  this.setTransparent = function (e) {
    l = e;
  };
  this.start = function () {
    S(new ByteArray());
    return new ByteArray().data;
  };
});
var ByteArray = (function () {
  this.data = [];
  this.getData = function () {
    return this.data;
  };
  this.writeByte = function (e) {
    this.data.push(e);
  };
  this.writeUTFBytes = function (e) {
    for (var t = 0; t < e.length; t++) this.writeByte(e.charCodeAt(t));
  };
  this.writeBytes = function (e, t, n) {
    for (var r = n || e.length, i = t || 0; i < r; i++) this.writeByte(e[i]);
  };
});
var encoder = new GIFEncoder();
self.onmessage = function (e) {
  if (e.data.width && e.data.height) {
    encoder.setSize(e.data.width, e.data.height);
  }
  if (e.data.loop != undefined) {
    encoder.setRepeat(e.data.loop);
  }
  if (e.data.delay) {
    encoder.setDelay(e.data.delay);
  }
  if (e.data.frame) {
    encoder.addFrame(e.data.frame);
  }
  if (e.data.finish) {
    var t = encoder.finish();
    self.postMessage({
      type: "gif",
      data: t,
    });
  }
};
var GIF = (function () {
  function e(e) {
    var t = e.data;
    var n = e.width;
    var r = e.height;
    var i = e.quality || 10;
    var s = e.dither || false;
    var o = new NeuQuant(t, t.length, i);
    o.buildColormap();
    var u = o.getColormap();
    var a = new LZWEncoder(n, r, u, s ? "FloydSteinberg" : false);
    return a.encode();
  }
  return {
    encode: e,
  };
})();
