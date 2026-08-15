import * as THREE from 'three'

const SEGMENTS = 24;

async function init() {
    const scale = 0.5;
  const container = document.getElementById('nozzle-canvas-container');

  const scene = new THREE.Scene();

  const width = container.clientWidth;
  const height = container.clientHeight;
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // Load and parse CSV
  let points;
  try {
    const response = await fetch('./contour.csv');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    points = text
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => {
        const parts = line.split(',');
        return new THREE.Vector2(parseFloat(parts[1]) * scale, parseFloat(parts[0]) * scale);
      });
  } catch (err) {
    console.error('Failed to load contour.csv:', err);
    const errEl = document.getElementById('fetch-error');
    errEl.style.display = 'block';
    errEl.textContent =
      'Could not load contour.csv. ' +
      'This page must be served over HTTP — fetch of local files is blocked under file://.';
    return;
  }

  // Build quad-grid cage: rings + profile lines
  const contour = points;
  const numPoints = contour.length;
  const TWO_PI = Math.PI * 2;
  const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });

  // 1. Compute full grid of 3D vertices[i][j]
  const vertices = [];
  for (let i = 0; i < numPoints; i++) {
    const row = [];
    for (let j = 0; j < SEGMENTS; j++) {
      const t = j * (TWO_PI / SEGMENTS);
      row.push(new THREE.Vector3(
        contour[i].x * Math.cos(t),
        contour[i].y,
        contour[i].x * Math.sin(t)
      ));
    }
    vertices.push(row);
  }

  const group = new THREE.Group();

  // 2. Ring lines (LineLoop) — one horizontal ring per contour point
  for (let i = 0; i < numPoints; i++) {
    if (Math.abs(contour[i].x) < 1e-6) continue;
    const pos = [];
    for (let j = 0; j < SEGMENTS; j++) {
      const v = vertices[i][j];
      pos.push(v.x, v.y, v.z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    group.add(new THREE.LineLoop(geo, lineMat));
  }

  // 3. Profile lines (Line) — one axial profile per angular step
  for (let j = 0; j < SEGMENTS; j++) {
    const pos = [];
    for (let i = 0; i < numPoints; i++) {
      const v = vertices[i][j];
      pos.push(v.x, v.y, v.z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    group.add(new THREE.Line(geo, lineMat));
  }

  // Centre group vertically
  const yVals = contour.map(p => p.y);
  group.position.y = -((Math.min(...yVals) + Math.max(...yVals)) / 2);
  scene.add(group);

  // Spherical orbit state
  let theta = 45;          // azimuth (Y-axis rotation)
  let phi = 1.0;          // polar angle from top (~69°)
  let radius = 70;

  function updateCamera() {
    camera.position.set(
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.cos(theta)
    );
    camera.lookAt(0, 0, 0);
  }
  updateCamera();

  // Resize
  window.addEventListener('resize', () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  // Render loop
  const AUTO_SPEED = 0.001;
  function animate() {
    requestAnimationFrame(animate);
    phi += AUTO_SPEED;
    theta += AUTO_SPEED;
    updateCamera();
    renderer.render(scene, camera);
  }
  animate();
}

init();

(async function drawCharacteristics() {
  const canvas = document.getElementById('char-canvas');
  const container = document.getElementById('char-canvas-container');
  const ctx = canvas.getContext('2d');

  // Set pixel dimensions to match display size
  function resize() {
    const w = container.clientWidth - 32; // subtract padding
    canvas.width = w * window.devicePixelRatio;
    canvas.height = 400 * window.devicePixelRatio;
    canvas.style.height = '400px';
    draw();
  }

  let lines = [];

  function draw() {
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    if (lines.length === 0) return;

    // Data bounds: x in [0, ~0.785], y in [0, 1]
    const xMin = 0, xMax = 0.7856;
    const yMin = 0, yMax = 1.0;
    const pad = 20 * window.devicePixelRatio;

    function toCanvas(x, y) {
      const cx = pad + (x - xMin) / (xMax - xMin) * (W - 2 * pad);
      // y=1 at top, y=0 at center (axis), mirror for full cross-section
      const cy = H / 2 - (y - yMin) / (yMax - yMin) * (H / 2 - pad);
      return [cx, cy];
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;

    for (const line of lines) {
      if (line.length < 2) continue;

      // Top half
      ctx.beginPath();
      const [sx, sy] = toCanvas(line[0][0], line[0][1]);
      ctx.moveTo(sx, sy);
      for (let i = 1; i < line.length; i++) {
        const [cx, cy] = toCanvas(line[i][0], line[i][1]);
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();

      // Mirrored bottom half
      ctx.beginPath();
      const [sx2, sy2] = toCanvas(line[0][0], line[0][1]);
      ctx.moveTo(sx2, H - sy2);
      for (let i = 1; i < line.length; i++) {
        const [cx, cy] = toCanvas(line[i][0], line[i][1]);
        ctx.lineTo(cx, H - cy);
      }
      ctx.stroke();
    }
  }

  try {
    const resp = await fetch('./characteristics.csv');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    const rows = text.split('\n').slice(1); // skip header
    let current = [];
    for (const row of rows) {
      const parts = row.trim().split(',');
      if (parts.length < 2) continue;
      const x = parseFloat(parts[0]);
      const y = parseFloat(parts[1]);
      if (isNaN(x) || isNaN(y)) continue;
      current.push([x, y]);
      if (Math.abs(y) < 1e-6) {
        lines.push(current);
        current = [];
      }
    }
    if (current.length > 0) lines.push(current);
  } catch (err) {
    console.error('Failed to load characteristics.csv:', err);
  }

  window.addEventListener('resize', resize);
  resize();
})();
