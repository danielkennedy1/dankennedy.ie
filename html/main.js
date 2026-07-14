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
