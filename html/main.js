const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const GAP = 30;
const DOT_SIDE_LENGTH = 1.5;
const REVEAL_SIDE_LENGTH = 150;

let mouseX = -9999;
let mouseY = -9999;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);
resize();

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'white';

  for (let x = GAP; x < canvas.width; x += GAP) {
    for (let y = GAP; y < canvas.height; y += GAP) {
      const dx = x - mouseX;
      const dy = y - mouseY;
      if (Math.abs(dx) < REVEAL_SIDE_LENGTH && Math.abs(dy) < REVEAL_SIDE_LENGTH) {
        ctx.beginPath();
        ctx.arc(x, y, DOT_SIDE_LENGTH, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  requestAnimationFrame(draw);
}

draw();

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
    const t = Math.min((now - start) / coverDuration, 1);
    bar.style.width = (easeInOut(t) * 100) + '%';
    if (t < 1) {
      requestAnimationFrame(phase1);
    } else {
      text.style.visibility = 'visible';
      bar.style.right = 'auto';
      bar.style.left = '0';
      const start2 = performance.now();
      requestAnimationFrame(function phase2(now2) {
        const t2 = Math.min((now2 - start2) / revealDuration, 1);
        bar.style.width = ((1 - easeInOut(t2)) * 100) + '%';
        if (t2 < 1) requestAnimationFrame(phase2);
      });
    }
  }

  requestAnimationFrame(phase1);
}

setTimeout(animateNameWipe, 500);
