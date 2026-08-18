import * as THREE from 'three'
import URDFLoader from 'urdf-loader'

async function init() {
  const container = document.getElementById('hand-canvas-container')

  const scene = new THREE.Scene()

  const width = container.clientWidth
  const height = container.clientHeight
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.001, 100)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setClearColor(0x000000, 0)
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1))
  container.appendChild(renderer.domElement)

  // Use a dedicated LoadingManager so we can await all mesh loads, not just URDF parse
  const manager = new THREE.LoadingManager()
  const allMeshesLoaded = new Promise(resolve => { manager.onLoad = resolve })

  const loader = new URDFLoader(manager)
  loader.packages = { meshes: '/hand/dg5f/meshes' }

  let robot
  try {
    robot = await loader.loadAsync('/hand/dg5f/dg5f_left.urdf')
  } catch (err) {
    console.error('Failed to load URDF:', err)
    const errEl = document.getElementById('fetch-error')
    errEl.style.display = 'block'
    errEl.textContent = 'Could not load hand model. This page must be served over HTTP.'
    return
  }

  // Wait for all mesh files (DAE/STL) to finish loading
  await allMeshesLoaded

  // ROS is Z-up; rotate to Three.js Y-up
  robot.rotation.x = -Math.PI / 2

  // Links to show — edit this set to control what's visible
  const VISIBLE_LINKS = new Set([
    'll_dg_palm',
    //'ll_dg_base',
    //'ll_dg_mount',
    'll_dg_1_1', 'll_dg_1_2', 'll_dg_1_3', 'll_dg_1_4', 'll_dg_1_tip',
    'll_dg_2_1', 'll_dg_2_2', 'll_dg_2_3', 'll_dg_2_4', 'll_dg_2_tip',
    'll_dg_3_1', 'll_dg_3_2', 'll_dg_3_3', 'll_dg_3_4', 'll_dg_3_tip',
    'll_dg_4_1', 'll_dg_4_2', 'll_dg_4_3', 'll_dg_4_4', 'll_dg_4_tip',
    'll_dg_5_1', 'll_dg_5_2', 'll_dg_5_3', 'll_dg_5_4', 'll_dg_5_tip',
  ])

  const edgeMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor:     { value: new THREE.Color(0xffffff) },
      uCameraPos: { value: new THREE.Vector3() },
      uFadeStart: { value: 0 },
      uFadeEnd:   { value: 1 },
    },
    vertexShader: `
      uniform vec3 uCameraPos;
      varying float vDist;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vDist = length(worldPos.xyz - uCameraPos);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uFadeStart;
      uniform float uFadeEnd;
      varying float vDist;
      void main() {
        float t = smoothstep(uFadeStart, uFadeEnd, vDist);
        float alpha = mix(1.0, 0.08, t);
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
  })
  const meshesToProcess = []
  robot.traverse(child => {
    if (child.isMesh) meshesToProcess.push(child)
  })
  for (const child of meshesToProcess) {
    // Walk up to find the nearest URDFLink ancestor to get the link name
    let obj = child.parent
    while (obj && !obj.isURDFLink) obj = obj.parent
    const linkName = obj ? obj.name : ''
    if (!VISIBLE_LINKS.has(linkName)) {
      child.visible = false
      continue
    }
    // Add edge lines as sibling so parent visibility doesn't hide them
    const edges = new THREE.EdgesGeometry(child.geometry, 9)
    const lines = new THREE.LineSegments(edges, edgeMat)
    lines.position.copy(child.position)
    lines.quaternion.copy(child.quaternion)
    lines.scale.copy(child.scale)
    child.parent.add(lines)
    child.visible = false
  }

  scene.add(robot)

  // Fit camera to bounding box (meshes are loaded so this is accurate)
  robot.updateWorldMatrix(true, true)
  const box = new THREE.Box3().setFromObject(robot)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)

  robot.position.sub(center)

  const radius = maxDim * 1.5
  // Camera orbits at `radius` from origin; hand extends ~±maxDim/2.
  // Closest lines are ~maxDim away, furthest ~2×maxDim — fade across that range.
  edgeMat.uniforms.uFadeStart.value = maxDim
  edgeMat.uniforms.uFadeEnd.value   = maxDim * 1.6
  let t = 0

  function updateCamera() {
    const theta = t
    const phi = Math.PI / 2 + 0.4 * Math.sin(t * 0.37)
    camera.position.set(
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.cos(theta)
    )
    camera.lookAt(0, 0, 0)
  }
  updateCamera()

  window.addEventListener('resize', () => {
    const w = container.clientWidth
    const h = container.clientHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  })

  const AUTO_SPEED = 0.001
  function animate() {
    requestAnimationFrame(animate)
    t += AUTO_SPEED
    updateCamera()
    edgeMat.uniforms.uCameraPos.value.copy(camera.position)
    renderer.render(scene, camera)
  }
  animate()
}

init()
