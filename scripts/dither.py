#!/usr/bin/env python3
"""Ordered-dither an image onto a small palette, for the homepage screens.

Source photos live in assets/ (gitignored) and never ship; only the reduced
output does. Every screen must come out the same size so the homepage can
crossfade between them pixel for pixel.

Usage (needs ImageMagick 7):
  python3 -I scripts/dither.py SRC OUT [--crop WxH+X+Y] [--width 720]
                               [--colours 8 | --palette OTHER.png |
                                --mono 4 [--accent '#3d7bff' --accent-above 0.8]]

--mono dithers onto a grey ramp; --accent then picks out everything brighter
than --accent-above (0-1 luminance, after --contrast) in a single colour.
"""
import argparse
import random
import subprocess

p = argparse.ArgumentParser()
p.add_argument('src')
p.add_argument('out')
p.add_argument('--width', type=int, default=720, help='fewer px = chunkier')
p.add_argument('--colours', type=int, default=8, help='palette size pooled from the image')
p.add_argument('--palette', help='reuse the colours of an existing PNG instead of pooling')
p.add_argument('--crop', help='ImageMagick crop geometry applied before resizing')
p.add_argument('--spread', type=float, default=56, help='dither strength, 0-255 units')
p.add_argument('--mono', type=int, help='dither onto this many greys instead of colours')
p.add_argument('--contrast', type=float, default=1.0, help='luminance contrast for --mono')
p.add_argument('--accent', help='hex colour for highlights in --mono mode')
p.add_argument('--accent-above', type=float, default=0.8, help='luminance above which --accent applies')
args = p.parse_args()


def bayer8(x, y):
    v = 0
    for b in range(3):
        shift = 2 * (2 - b)
        v |= ((((x ^ y) >> b) & 1) << (shift + 1)) | (((y >> b) & 1) << shift)
    return (v + 0.5) / 64 - 0.5


def nearest(p, palette):
    best, best_d = 0, float('inf')
    for i, c in enumerate(palette):
        d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2
        if d < best_d:
            best, best_d = i, d
    return best


def kmeans(pixels, k, iters=12):
    centres = random.Random(0).sample(pixels, k)
    for _ in range(iters):
        sums = [[0, 0, 0, 0] for _ in centres]
        for px in pixels:
            s = sums[nearest(px, centres)]
            s[0] += px[0]; s[1] += px[1]; s[2] += px[2]; s[3] += 1
        centres = [(s[0] / s[3], s[1] / s[3], s[2] / s[3]) if s[3] else c
                   for s, c in zip(sums, centres)]
    return [tuple(round(v) for v in c) for c in centres]


def read_rgb(cmd):
    raw = subprocess.run(cmd + ['-depth', '8', '-format', '%w %h\n', '-write', 'info:-', 'rgb:-'],
                         check=True, capture_output=True).stdout
    header, data = raw.split(b'\n', 1)
    w, h = map(int, header.split())
    return w, h, [tuple(data[i:i + 3]) for i in range(0, w * h * 3, 3)]


load = ['magick', args.src, '-auto-orient', '-strip']
if args.crop:
    load += ['-crop', args.crop, '+repage']
w, h, pixels = read_rgb(load + ['-resize', f'{args.width}x', '-blur', '0x0.4'])

GREY_LO, GREY_HI = (20, 20, 20), (233, 231, 226)


def hex_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


if args.mono:
    greys = [tuple(round(lo + (hi - lo) * k / (args.mono - 1)) for lo, hi in zip(GREY_LO, GREY_HI))
             for k in range(args.mono)]
    accent = bytes(hex_rgb(args.accent)) if args.accent else None
    step = 255 / (args.mono - 1)
    out = bytearray(w * h * 3)
    for y in range(h):
        for x in range(w):
            i = y * w + x
            r, g, b = pixels[i]
            luma = (0.299 * r + 0.587 * g + 0.114 * b - 128) * args.contrast + 128
            t = bayer8(x & 7, y & 7)
            if accent and luma + t * args.spread > args.accent_above * 255:
                out[i * 3:i * 3 + 3] = accent
                continue
            k = min(max(round((luma + t * step) / step), 0), args.mono - 1)
            out[i * 3:i * 3 + 3] = bytes(greys[k])
    subprocess.run(
        ['magick', '-size', f'{w}x{h}', '-depth', '8', 'rgb:-',
         '-define', 'png:exclude-chunks=date,time', f'PNG8:{args.out}'],
        input=bytes(out), check=True,
    )
    print(f'wrote {args.out} ({w}x{h}, {args.mono} greys{" + accent" if accent else ""})')
    raise SystemExit

if args.palette:
    _, _, palette = read_rgb(['magick', args.palette, '-unique-colors'])
else:
    palette = kmeans(random.Random(1).sample(pixels, 20000), args.colours)

out = bytearray(w * h * 3)
for y in range(h):
    for x in range(w):
        i = y * w + x
        t = bayer8(x & 7, y & 7) * args.spread
        r, g, b = pixels[i]
        out[i * 3:i * 3 + 3] = bytes(palette[nearest((r + t, g + t, b + t), palette)])

subprocess.run(
    ['magick', '-size', f'{w}x{h}', '-depth', '8', 'rgb:-',
     '-define', 'png:exclude-chunks=date,time', f'PNG8:{args.out}'],
    input=bytes(out), check=True,
)
print(f'wrote {args.out} ({w}x{h}, {len(palette)} colours)')
