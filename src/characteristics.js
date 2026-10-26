// Full-res nozzle characteristics, drawn exactly over the pixel version from
// scripts/characteristics.py (keep these layout constants in sync with it).
const X_MAX = 0.7856
const MARGIN_X = 40
const AXIS_Y = 225
const HALF_H = 150
const IMG_W = 720

let linesPromise = null

function loadLines() {
  linesPromise ??= fetch('/nozzle/characteristics.csv')
    .then((r) => r.text())
    .then((text) => {
      const lines = []
      let current = []
      for (const row of text.split('\n').slice(1)) {
        const [x, y] = row.trim().split(',').map(parseFloat)
        if (Number.isNaN(x) || Number.isNaN(y)) continue
        current.push([x, y])
        if (Math.abs(y) < 1e-6) { // each characteristic ends on the axis
          lines.push(current)
          current = []
        }
      }
      if (current.length) lines.push(current)
      return lines
    })
  return linesPromise
}

// geometry(): { s, offX, offY } — css px per screen-image px, and the image's offset
export async function mountCharacteristics(canvas, geometry) {
  const lines = await loadLines()
  const ctx = canvas.getContext('2d')

  function draw() {
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(window.innerWidth * dpr)
    canvas.height = Math.round(window.innerHeight * dpr)
    const { s, offX, offY } = geometry()
    // image pixel centres → device px
    const px = (ix) => (offX + (ix + 0.5) * s) * dpr
    const py = (iy) => (offY + (iy + 0.5) * s) * dpr

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = getComputedStyle(canvas).color
    ctx.lineWidth = dpr
    ctx.beginPath()
    for (const line of lines) {
      for (const mirror of [1, -1]) {
        line.forEach(([x, y], i) => {
          const X = px(MARGIN_X + (x / X_MAX) * (IMG_W - 2 * MARGIN_X))
          const Y = py(AXIS_Y - mirror * y * HALF_H)
          if (i === 0) ctx.moveTo(X, Y)
          else ctx.lineTo(X, Y)
        })
      }
    }
    ctx.stroke()
  }

  window.addEventListener('resize', draw)
  draw()
}
