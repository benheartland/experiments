/**
 * RGB color value. Input values will be rounded to integers, clamped to the range [0, 255].
 * @param   Number  r       Red channel
 * @param   Number  g       Green channel
 * @param   Number  b       Blue channel
 */
class Rgb {
  constructor(r, g, b) {
    // Red
    this.r = Math.round(Math.clamp(r, 0.0, 255.0));
    // Green
    this.g = Math.round(Math.clamp(g, 0.0, 255.0));
    // Blue
    this.b = Math.round(Math.clamp(b, 0.0, 255.0));
  }

}

// HSV color value. Input values will be clamped to the range [0, 1].

class Hsv {
  /**
   * @param   Number  h       The hue
   * @param   Number  s       The saturation
   * @param   Number  v       The value
   */
  constructor(h, s, v) {
    // Hue
    this.h = Math.clamp(h, 0.0, 1.0);
    // Saturation
    this.s = Math.clamp(s, 0.0, 1.0);
    // Value
    this.v = Math.clamp(v, 0.0, 1.0);
  }

  /**
   * Converts an HSV color value to RGB. Conversion formula
   * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
   */
  toRgb() {
    var r, g, b;
  
    var i = Math.floor(this.h * 6.0);
    var f = this.h * 6.0 - i;
    var p = this.v * (1.0 - this.s);
    var q = this.v * (1.0 - f * this.s);
    var t = this.v * (1.0 - (1.0 - f) * this.s);
  
    switch (i % 6) {
      case 0:
        r = this.v;
        g = t;
        b = p;
        break;
      case 1:
        r = q;
        g = this.v;
        b = p;
        break;
      case 2:
        r = p;
        g = this.v;
        b = t;
        break;
      case 3:
        r = p;
        g = q; 
        b = this.v;
        break;
      case 4:
        r = t;
        g = p;
        b = this.v;
        break;
      case 5:
        r = this.v;
        g = p;
        b = q;
        break;
    }

    return new Rgb(Math.round(r*256.0), Math.round(g*256.0), Math.round(b*256.0));
  }

}
