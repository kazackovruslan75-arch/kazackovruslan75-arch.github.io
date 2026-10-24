// Вывод кадров эмулятора на канвас. По возможности через WebGL: кадр загружается
// в текстуру на видеокарте (RGB, на 25% меньше данных), масштабирование тоже делает GPU.
// Без WebGL — запасной путь через 2D putImageData (RGBA).
const VS = `attribute vec2 p; varying vec2 uv;
void main() { uv = vec2((p.x + 1.0) * 0.5, (1.0 - p.y) * 0.5); gl_Position = vec4(p, 0.0, 1.0); }`;
const FS = `precision mediump float; varying vec2 uv; uniform sampler2D t;
void main() { gl_FragColor = vec4(texture2D(t, uv).rgb, 1.0); }`;

class ScreenRenderer {
  constructor(canvas) {
    this.cv = canvas;
    this.w = 0;
    this.h = 0;
    // preserveDrawingBuffer нужен скриншотам и записи экрана (drawImage с канваса).
    const gl = canvas.getContext('webgl', {
      alpha: false, antialias: false, depth: false, stencil: false,
      desynchronized: true, preserveDrawingBuffer: true, powerPreference: 'high-performance',
    });
    if (gl && this.initGl(gl)) {
      this.gl = gl;
      this.format = 'RGB888';
    } else {
      this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
      this.format = 'RGBA8888';
    }
  }

  initGl(gl) {
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = sh(gl.VERTEX_SHADER, VS);
    const fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return false;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    return true;
  }

  draw(buf, w, h) {
    const sized = this.w !== w || this.h !== h;
    if (sized) { this.cv.width = w; this.cv.height = h; this.w = w; this.h = h; }
    if (this.gl) {
      const gl = this.gl;
      const px = new Uint8Array(buf.buffer, buf.byteOffset, w * h * 3);
      if (sized) {
        gl.viewport(0, 0, w, h);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, w, h, 0, gl.RGB, gl.UNSIGNED_BYTE, px);
      } else {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.RGB, gl.UNSIGNED_BYTE, px);
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    } else {
      this.ctx.putImageData(new ImageData(new Uint8ClampedArray(buf.buffer, buf.byteOffset, w * h * 4), w, h), 0, 0);
    }
  }
}

module.exports = { ScreenRenderer };
