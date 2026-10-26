#!/usr/bin/env python3
"""Draw the nozzle's method-of-characteristics lines as a screen image.

Hard-edged 1px lines (no antialiasing) at the shared screen size, so the
homepage scales it up pixelated like the other screens.

Usage (needs ImageMagick 7): python3 -I scripts/characteristics.py OUT
"""
import subprocess
import sys

OUT = sys.argv[1]
SRC = 'public/nozzle/characteristics.csv'
W, H = 720, 540
BG = bytes((20, 20, 20))
LINE = bytes((61, 123, 255))  # --accent in public/style.css
X_MAX = 0.7856  # data bounds: x in [0, X_MAX], y in [0, 1] (mirrored about the axis)
MARGIN_X = 40
AXIS_Y = 225  # a little above centre, clear of the homepage panel
HALF_H = 150  # keeps the tips on-screen when wide screens crop top and bottom

lines, current = [], []
for row in open(SRC).read().splitlines()[1:]:
    parts = row.strip().split(',')
    if len(parts) < 2:
        continue
    x, y = float(parts[0]), float(parts[1])
    current.append((x, y))
    if abs(y) < 1e-6:  # each characteristic ends on the axis
        lines.append(current)
        current = []
if current:
    lines.append(current)

buf = bytearray(BG * (W * H))


def plot(x, y):
    if 0 <= x < W and 0 <= y < H:
        buf[(y * W + x) * 3:(y * W + x) * 3 + 3] = LINE


def segment(x0, y0, x1, y1):
    # Bresenham
    dx, dy = abs(x1 - x0), -abs(y1 - y0)
    sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
    err = dx + dy
    while True:
        plot(x0, y0)
        if x0 == x1 and y0 == y1:
            return
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x0 += sx
        if e2 <= dx:
            err += dx
            y0 += sy


for line in lines:
    for mirror in (1, -1):
        pts = [(round(MARGIN_X + x / X_MAX * (W - 2 * MARGIN_X)), round(AXIS_Y - mirror * y * HALF_H))
               for x, y in line]
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            segment(x0, y0, x1, y1)

subprocess.run(
    ['magick', '-size', f'{W}x{H}', '-depth', '8', 'rgb:-',
     '-define', 'png:exclude-chunks=date,time', f'PNG8:{OUT}'],
    input=bytes(buf), check=True,
)
print(f'wrote {OUT} ({W}x{H}, {len(lines)} characteristics)')
