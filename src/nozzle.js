import * as THREE from 'three'

const SEGMENTS = 24;

// Mounts the spinning nozzle wireframe (revolved from contour.csv) into `container`.
// Rendering pauses whenever isActive() is false.
export async function mountNozzle(container, { isActive = () => true } = {}) {
  const scale = 0.5;

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
    const response = await fetch('/nozzle/contour.csv');
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
    container.appendChild(document.createElement('p')).textContent = 'Could not load the nozzle contour.';
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

  new ResizeObserver(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }).observe(container);

  // One frame up front, even while hidden: compiles the shaders now rather than on first show
  renderer.render(scene, camera);

  // Render loop
  const AUTO_SPEED = 0.001;
  function animate() {
    requestAnimationFrame(animate);
    if (!isActive()) return;
    phi += AUTO_SPEED;
    theta += AUTO_SPEED;
    updateCamera();
    renderer.render(scene, camera);
  }
  animate();
}
