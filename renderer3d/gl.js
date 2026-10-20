/*
 * Тонкий слой над WebGL: контекст, программы и базовые меши.
 *
 * Никаких библиотек — только чистый WebGL. Публикует объект GL3D в window.
 */
(function (global) {
  "use strict";

  const GL3D = {};

  // ---------- шейдеры ----------

  const MESH_VERTEX = [
    "attribute vec3 aPos;",
    "attribute vec3 aNormal;",
    "uniform mat4 uModel;",
    "uniform mat4 uViewProj;",
    "uniform mat3 uNormalMat;",
    "varying vec3 vNormal;",
    "varying vec3 vWorld;",
    "void main() {",
    "  vec4 world = uModel * vec4(aPos, 1.0);",
    "  vWorld = world.xyz;",
    "  vNormal = uNormalMat * aNormal;",
    "  gl_Position = uViewProj * world;",
    "}"
  ].join("\n");

  const MESH_FRAGMENT = [
    "precision mediump float;",
    "varying vec3 vNormal;",
    "varying vec3 vWorld;",
    "uniform vec3 uColor;",
    "uniform vec3 uEye;",
    "uniform vec3 uLightDir;",
    "uniform float uHighlight;",
    "uniform float uAlpha;",
    "void main() {",
    "  vec3 n = normalize(vNormal);",
    "  vec3 l = normalize(uLightDir);",
    "  float diff = max(dot(n, l), 0.0);",
    "  vec3 col = uColor * (0.34 + 0.76 * diff);",
    "  col += vec3(1.0, 0.88, 0.45) * uHighlight;",
    "  vec3 viewDir = normalize(uEye - vWorld);",
    "  float rim = pow(1.0 - max(dot(n, viewDir), 0.0), 2.0);",
    "  col += uColor * rim * 0.25;",
    "  gl_FragColor = vec4(col, uAlpha);",
    "}"
  ].join("\n");

  const LINE_VERTEX = [
    "attribute vec3 aPos;",
    "attribute vec3 aColor;",
    "uniform mat4 uViewProj;",
    "varying vec3 vColor;",
    "void main() {",
    "  vColor = aColor;",
    "  gl_Position = uViewProj * vec4(aPos, 1.0);",
    "}"
  ].join("\n");

  const LINE_FRAGMENT = [
    "precision mediump float;",
    "varying vec3 vColor;",
    "uniform float uAlpha;",
    "void main() {",
    "  gl_FragColor = vec4(vColor, uAlpha);",
    "}"
  ].join("\n");

  GL3D.createContext = (canvas) => {
    const gl = canvas.getContext("webgl", {
      antialias: true,
      alpha: false,
      depth: true
    });

    if (!gl) {
      throw new Error("WebGL недоступен в этом браузере.");
    }

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    return gl;
  };

  const compileShader = (gl, type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error("Ошибка компиляции шейдера: " + log);
    }

    return shader;
  };

  GL3D.createProgram = (gl, vertexSource, fragmentSource) => {
    const program = gl.createProgram();
    gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error("Ошибка линковки программы: " + log);
    }

    return program;
  };

  GL3D.createMeshProgram = (gl) => {
    const program = GL3D.createProgram(gl, MESH_VERTEX, MESH_FRAGMENT);

    return {
      program,
      attribs: {
        aPos: gl.getAttribLocation(program, "aPos"),
        aNormal: gl.getAttribLocation(program, "aNormal")
      },
      uniforms: {
        uModel: gl.getUniformLocation(program, "uModel"),
        uViewProj: gl.getUniformLocation(program, "uViewProj"),
        uNormalMat: gl.getUniformLocation(program, "uNormalMat"),
        uColor: gl.getUniformLocation(program, "uColor"),
        uEye: gl.getUniformLocation(program, "uEye"),
        uLightDir: gl.getUniformLocation(program, "uLightDir"),
        uHighlight: gl.getUniformLocation(program, "uHighlight"),
        uAlpha: gl.getUniformLocation(program, "uAlpha")
      }
    };
  };

  GL3D.createLineProgram = (gl) => {
    const program = GL3D.createProgram(gl, LINE_VERTEX, LINE_FRAGMENT);

    return {
      program,
      attribs: {
        aPos: gl.getAttribLocation(program, "aPos"),
        aColor: gl.getAttribLocation(program, "aColor")
      },
      uniforms: {
        uViewProj: gl.getUniformLocation(program, "uViewProj"),
        uAlpha: gl.getUniformLocation(program, "uAlpha")
      }
    };
  };

  // ---------- меши ----------

  const buildIndexedMesh = (gl, interleaved, indices) => {
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(interleaved), gl.STATIC_DRAW);

    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(indices),
      gl.STATIC_DRAW
    );

    return { vbo, ibo, count: indices.length };
  };

  /*
   * Сфера единичного радиуса: позиция и нормаль совпадают.
   */
  GL3D.createSphere = (gl, latBands, lonBands) => {
    const lat = latBands || 18;
    const lon = lonBands || 24;
    const interleaved = [];
    const indices = [];

    for (let i = 0; i <= lat; i++) {
      const theta = (i * Math.PI) / lat;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);

      for (let j = 0; j <= lon; j++) {
        const phi = (j * 2 * Math.PI) / lon;
        const x = sinT * Math.cos(phi);
        const y = cosT;
        const z = sinT * Math.sin(phi);

        interleaved.push(x, y, z, x, y, z);
      }
    }

    for (let i = 0; i < lat; i++) {
      for (let j = 0; j < lon; j++) {
        const first = i * (lon + 1) + j;
        const second = first + lon + 1;

        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
    }

    return buildIndexedMesh(gl, interleaved, indices);
  };

  /*
   * Цилиндр вдоль +Y: радиус 1, высота 1 (от -0.5 до 0.5), нормали радиальные.
   * Под мосты он масштабируется моделью M.modelTube.
   */
  GL3D.createCylinder = (gl, radialSegments) => {
    const segments = radialSegments || 16;
    const interleaved = [];
    const indices = [];

    for (let i = 0; i <= segments; i++) {
      const phi = (i * 2 * Math.PI) / segments;
      const nx = Math.cos(phi);
      const nz = Math.sin(phi);

      interleaved.push(nx, -0.5, nz, nx, 0, nz);
      interleaved.push(nx, 0.5, nz, nx, 0, nz);
    }

    for (let i = 0; i < segments; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;

      indices.push(a, c, b);
      indices.push(b, c, d);
    }

    return buildIndexedMesh(gl, interleaved, indices);
  };

  /*
   * Линии с цветом на вершину. vertices — плоский массив [x,y,z, r,g,b, ...].
   */
  GL3D.createLines = (gl, vertices) => {
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    return { vbo, count: vertices.length / 6 };
  };

  // ---------- отрисовка ----------

  GL3D.bindMeshProgram = (gl, meshProgram, mesh) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
    gl.enableVertexAttribArray(meshProgram.attribs.aPos);
    gl.vertexAttribPointer(
      meshProgram.attribs.aPos, 3, gl.FLOAT, false, 24, 0
    );
    gl.enableVertexAttribArray(meshProgram.attribs.aNormal);
    gl.vertexAttribPointer(
      meshProgram.attribs.aNormal, 3, gl.FLOAT, false, 24, 12
    );
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ibo);
  };

  GL3D.drawMesh = (gl, meshProgram, mesh, model, normalMat, color, highlight, alpha) => {
    gl.uniformMatrix4fv(meshProgram.uniforms.uModel, false, model);
    gl.uniformMatrix3fv(meshProgram.uniforms.uNormalMat, false, normalMat);
    gl.uniform3fv(meshProgram.uniforms.uColor, color);
    gl.uniform1f(meshProgram.uniforms.uHighlight, highlight || 0);
    gl.uniform1f(meshProgram.uniforms.uAlpha, alpha === undefined ? 1 : alpha);

    GL3D.bindMeshProgram(gl, meshProgram, mesh);
    gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
  };

  GL3D.drawLines = (gl, lineProgram, mesh, alpha) => {
    gl.uniform1f(lineProgram.uniforms.uAlpha, alpha);

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
    gl.enableVertexAttribArray(lineProgram.attribs.aPos);
    gl.vertexAttribPointer(
      lineProgram.attribs.aPos, 3, gl.FLOAT, false, 24, 0
    );
    gl.enableVertexAttribArray(lineProgram.attribs.aColor);
    gl.vertexAttribPointer(
      lineProgram.attribs.aColor, 3, gl.FLOAT, false, 24, 12
    );

    gl.drawArrays(gl.LINES, 0, mesh.count);
  };

  global.GL3D = GL3D;
})(typeof window !== "undefined" ? window : globalThis);
