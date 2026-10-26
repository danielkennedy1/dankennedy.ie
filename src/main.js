// Screen images (scripts/make-art.sh) all share one size, so they're scaled
// identically and crossfade pixel for pixel.
const IMG_W = 720
const IMG_H = 540

// Where the 3D canvas sits inside hand.png, in screen-image px (from the crop
// and padding in scripts/make-art.sh), so the live model lands on its pixel render
// (1440x1080 canvas centred in a 2640x1980 extent, scaled to 720 wide)
const HAND_RECT = { x: 600 * 720 / 2640, y: 450 * 720 / 2640, w: 1440 * 720 / 2640, h: 1080 * 720 / 2640 }

const screens = [...document.querySelectorAll('.screen')]
const stage = document.getElementById('stage')
const slots = document.getElementById('slots')

// How a screen's image is scaled, always by a whole number of device pixels so
// every pixel stays square. By default it covers the viewport. Screens with
// data-fit="width" (renders on a plain background) instead fit the width on
// portrait screens, so phones see the whole subject rather than its middle third;
// data-zoom enlarges that portrait fit
function geometryFor({ fitMode, zoom }) {
  const dpr = window.devicePixelRatio || 1
  const kw = (window.innerWidth * dpr) / IMG_W
  const kh = (window.innerHeight * dpr) / IMG_H
  const portrait = window.innerHeight > window.innerWidth
  const k = fitMode === 'width' && portrait ? kw * zoom : Math.max(kw, kh)
  const s = Math.ceil(k) / dpr
  return { s, offX: (window.innerWidth - IMG_W * s) / 2, offY: (window.innerHeight - IMG_H * s) / 2 }
}

// The full-res version of each screen, built ahead of time into its hidden layer
const DETAILS = {
  hand(el) {
    const box = el.appendChild(document.createElement('div'))
    box.className = 'detail-hand'
    fit()
    import('./hand.js').then((m) => m.mountHand(box, { isActive: () => el.classList.contains('on'), pixelRatio: 2 }))
  },
  characteristics(el, layer) {
    const canvas = el.appendChild(document.createElement('canvas'))
    import('./characteristics.js').then((m) => m.mountCharacteristics(canvas, () => layer.geo))
  },
  image(el, layer, url) {
    el.classList.add('detail-image')
    el.style.backgroundImage = `url(${url})`
  },
}

// Live 3D views that can sit inline in a write-up (<div class="scene" data-scene="...">)
const SCENES = {
  nozzle: (el, opts) => import('./nozzle.js').then((m) => m.mountNozzle(el, opts)),
}

// Per screen: its pixel layer, and a (built ahead of time, hidden) full-res layer above it
const layers = screens.map((screen) => {
  const pixel = stage.appendChild(document.createElement('div'))
  pixel.className = 'layer'
  pixel.style.backgroundImage = `url(${screen.dataset.img})`
  const detail = stage.appendChild(document.createElement('div'))
  detail.className = 'layer detail'
  return { pixel, detail, fitMode: screen.dataset.fit || 'cover', zoom: Number(screen.dataset.zoom || 1), geo: null, built: false }
})

function fit() {
  for (const layer of layers) {
    const g = layer.geo = geometryFor(layer)
    const size = `${IMG_W * g.s}px ${IMG_H * g.s}px`
    layer.pixel.style.backgroundSize = size
    layer.detail.style.backgroundSize = size
    const hand = layer.detail.querySelector('.detail-hand')
    if (hand) {
      Object.assign(hand.style, {
        left: `${g.offX + HAND_RECT.x * g.s}px`,
        top: `${g.offY + HAND_RECT.y * g.s}px`,
        width: `${HAND_RECT.w * g.s}px`,
        height: `${HAND_RECT.h * g.s}px`,
      })
    }
  }
}

window.addEventListener('resize', fit)
fit()

const ARROW = '<svg viewBox="0 0 4 7" width="8" height="14" shape-rendering="crispEdges" aria-hidden="true"><path d="M0 0h1v1h1v1h1v1h1v1h-1v1h-1v1h-1v1h-1z" fill="currentColor"/></svg>'

screens.forEach((screen, i) => {
  const panel = screen.querySelector('.panel')
  const page = screen.querySelector('.page')

  const nav = document.createElement('div')
  nav.className = 'panel-nav'
  nav.innerHTML = `
    <button class="prev" aria-label="Previous">${ARROW}</button>
    ${page ? '<button class="read">Read</button>' : '<span></span>'}
    <button class="next" aria-label="Next">${ARROW}</button>`
  nav.querySelector('.prev').disabled = i === 0
  nav.querySelector('.next').disabled = i === screens.length - 1
  nav.querySelector('.prev').addEventListener('click', () => go(i - 1))
  nav.querySelector('.next').addEventListener('click', () => go(i + 1))
  panel.appendChild(nav)

  if (page) {
    // Wrap the write-up in a body that starts below the fold, with exits at both ends
    const body = document.createElement('div')
    body.className = 'page-body'
    body.append(...page.childNodes)
    page.appendChild(body)
    for (const where of ['top', 'bottom']) {
      const exit = document.createElement('button')
      exit.className = `exit exit-${where}`
      exit.textContent = 'Exit'
      exit.addEventListener('click', () => setReading(false))
      if (where === 'top') page.prepend(exit)
      else body.appendChild(exit)
    }
    nav.querySelector('.read').addEventListener('click', () => setReading(true))
  }
})

// Build a screen's full-res version into its (still invisible) layer, so the
// loading and first render happen while the blurb is being read, not on Read
function buildDetail(i) {
  const layer = layers[i]
  if (layer.built) return
  layer.built = true
  const kind = screens[i].dataset.detail
  if (DETAILS[kind]) DETAILS[kind](layer.detail, layer)
  else if (kind) DETAILS.image(layer.detail, layer, kind)
  for (const el of screens[i].querySelectorAll('.scene')) {
    SCENES[el.dataset.scene](el, { isActive: () => reading && active === i })
  }
}

let reading = false

function setReading(on) {
  const screen = screens[active]
  const page = screen?.querySelector('.page')
  if (on && !page) return
  if (on === reading) return
  reading = on
  document.body.classList.toggle('reading', on)

  buildDetail(active)
  layers[active].detail.classList.toggle('on', on)

  if (on) {
    page.scrollTop = 0
    page.querySelector('.exit-top').focus({ preventScroll: true })
  } else {
    screen.querySelector('.read')?.focus({ preventScroll: true })
  }
}

let active = -1

// One slot per screen; the filled one is where you are
const slotButtons = screens.map((screen, i) => {
  const b = document.createElement('button')
  b.setAttribute('aria-label', screen.querySelector('h2').textContent)
  b.addEventListener('click', () => go(i))
  slots.appendChild(b)
  return b
})

function go(i) {
  if (i < 0 || i >= screens.length || i === active) return
  if (active >= 0) setReading(false)
  screens.forEach((s, j) => { s.hidden = j !== i })
  layers.forEach((l, j) => l.pixel.classList.toggle('on', j === i))
  slotButtons.forEach((b, j) => b.toggleAttribute('aria-current', j === i))
  active = i
  setTimeout(() => buildDetail(i), 100) // after the crossfade has started
  history.replaceState(null, '', i === 0 ? location.pathname : `#${screens[i].dataset.id}`)
}

document.addEventListener('keydown', (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey) return
  const steps = { ArrowRight: 1, ArrowLeft: -1, l: 1, h: -1 }
  if (e.key in steps) {
    e.preventDefault()
    go(active + steps[e.key])
  } else if (e.key === 'Escape') {
    setReading(false)
  }
})

// Mouse wheel / trackpad: one screen per gesture (while reading, it scrolls the text instead)
let wheelLock = 0
let wheelSum = 0
window.addEventListener('wheel', (e) => {
  if (reading) return
  const now = performance.now()
  if (now < wheelLock) return
  wheelSum += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX
  if (Math.abs(wheelSum) > 40) {
    go(active + Math.sign(wheelSum))
    wheelSum = 0
    wheelLock = now + 900
  }
}, { passive: true })

// Horizontal swipe on touch screens (not while reading)
let touch = null
document.addEventListener('touchstart', (e) => {
  touch = reading ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY }
}, { passive: true })
document.addEventListener('touchend', (e) => {
  if (!touch) return
  const dx = e.changedTouches[0].clientX - touch.x
  const dy = e.changedTouches[0].clientY - touch.y
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(active + (dx < 0 ? 1 : -1))
  touch = null
}, { passive: true })

// Start on the hash'd screen if there is one, otherwise About
go(Math.max(0, screens.findIndex((s) => `#${s.dataset.id}` === location.hash)))

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function animateNameWipe() {
  const bar = document.getElementById('wipe-bar');
  const text = document.getElementById('name-text');
  const coverDuration = 300;
  const revealDuration = 120;

  const start = performance.now();

  function phase1(now) {
    const t = Math.min(Math.max(now - start, 0) / coverDuration, 1);
    bar.style.width = (easeInOut(t) * 100) + '%';
    if (t < 1) {
      requestAnimationFrame(phase1);
    } else {
      text.style.visibility = 'visible';
      bar.style.right = 'auto';
      bar.style.left = '0';
      const start2 = performance.now();
      requestAnimationFrame(function phase2(now2) {
        const t2 = Math.min(Math.max(now2 - start2, 0) / revealDuration, 1);
        bar.style.width = ((1 - easeInOut(t2)) * 100) + '%';
        if (t2 < 1) requestAnimationFrame(phase2);
      });
    }
  }

  requestAnimationFrame(phase1);
}

setTimeout(animateNameWipe, 500);
